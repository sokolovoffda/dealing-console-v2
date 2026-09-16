import { PServed } from '@wui/im'
import { defineStore, storeToRefs } from 'pinia'
import { ref, watch, shallowRef, triggerRef } from 'vue'

import { isExternalContactDto, useContactApi, useContactStore } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'
import { contactNumberToPServed, contactPServedToNumber } from '@/shared/services'

import { Contact, GetContactsQuery, GroupDto } from '../types'

export const useContactCachedStore = defineStore('contacts-cached', () => {
  const innerData = shallowRef(new Map<PServed, Contact>())
  const groups = ref<GroupDto[]>([])
  const loading = ref(false)
  const contactStore = useContactStore()
  const { externalContactsFromIndexedDb } = storeToRefs(contactStore)
  const externalContactsLoaded = ref(false)
  let externalContactsLoadingPromise: Promise<void> | null = null

  const ensureExternalContactsLoaded = async () => {
    if (externalContactsLoaded.value) {
      return
    }

    if (!externalContactsLoadingPromise) {
      externalContactsLoadingPromise = contactStore.fetchExternalContactsFromIndexedDb()
        .finally(() => {
          externalContactsLoaded.value = true
          externalContactsLoadingPromise = null
        })
    }

    await externalContactsLoadingPromise
  }

  const findByPhone = (value: string) => {
    return Array.from(innerData.value.values()).find(c => c.internalNumber === value || c.mobilePhone === value)
      || Array.from(externalContactsFromIndexedDb.value.values()).find(c => c.internalNumber === value || c.mobilePhone === value)
  }

  const isExternalContact = (contact: Contact | undefined) => {
    return Boolean(contact?.isExternal)
  }

  const setContactIfDoesNotExists = (contact: Contact) => {
    const existedContact = innerData.value.get(contact.pServed)
    if (!existedContact || (isExternalContact(existedContact) && !isExternalContact(contact))) {
      innerData.value.set(contact.pServed, contact)
    }

    if (!isExternalContact(contact)) {
      if (externalContactsFromIndexedDb.value.has(contact.pServed)) {
        contactStore.deleteExternalContactFromIndexedDb(contact.pServed)
      }

      const aliasPServed = contact.internalNumber
        ? contactNumberToPServed(contact.internalNumber)
        : (contact.mobilePhone ? contactNumberToPServed(contact.mobilePhone) : undefined)

      if (aliasPServed && externalContactsFromIndexedDb.value.has(aliasPServed)) {
        contactStore.deleteExternalContactFromIndexedDb(aliasPServed)
      }
    }
  }

  const mapContactGroups = (groupIds: string[]) => {
    return groups.value.filter(({ guid }) => groupIds.includes(guid))
  }

  const getLocalByPServed = (pServed: PServed) => {
    const contactByPServed = innerData.value.get(pServed)
    if (contactByPServed) {
      return contactByPServed
    }

    const contactByNumber = findByPhone(contactPServedToNumber(pServed))
    if (contactByNumber && !isExternalContact(contactByNumber)) {
      return contactByNumber
    }

    return externalContactsFromIndexedDb.value.get(pServed) || contactByNumber
  }

  const getLocalByInternalNumber = (internalNumber: string) => {
    return findByPhone(internalNumber)
  }

  const getByPServed = async (pServed: PServed, fetchIfDoesNotExists = false) => {
    const contact = getLocalByPServed(pServed)
    if (contact && (!fetchIfDoesNotExists || !contact.isExternal)) {
      return contact
    }

    if (fetchIfDoesNotExists) {
      await fetchContactsBySomeIds(pServed)
      return getLocalByPServed(pServed)
    }

    return undefined
  }

  const getByInternalNumber = async (internalNumber: string, fetchIfDoesNotExists = false) => {
    const contact = findByPhone(internalNumber)
    if (contact && (!fetchIfDoesNotExists || !contact.isExternal)) {
      return contact
    }

    if (fetchIfDoesNotExists) {
      await fetchContactsBySomeIds(internalNumber, 'internalNumber')
      return findByPhone(internalNumber)
    }

    return undefined
  }

  const fetchAllGroups = async (allowCache = true) => {
    const { fetchContactGroups } = useContactApi()

    if (groups.value.length && allowCache) {
      return groups.value
    }

    try {
      const response = await fetchContactGroups()
      if (response.data.length) {
        groups.value = response.data
        return groups.value
      }

      groups.value = []
      return groups.value
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      groups.value = []
      return groups.value
    }
  }

  const contactsInQuery = new Set<string>()

  const fetchContactsBySomeIds = async (ids: string | string[], field: 'pServed' | 'internalNumber' = 'pServed', forceFetch: boolean = false) => {
    await ensureExternalContactsLoaded()

    const getContact = field === 'pServed'

      ? (pServed: PServed) => innerData.value.get(pServed) || externalContactsFromIndexedDb.value.get(pServed)
      : (internalNumber: string) => getLocalByInternalNumber(internalNumber)

    const mergeUniqueContacts = (...collections: Contact[][]) => {
      const merged = new Map<PServed, Contact>()
      collections.flat().forEach((contact) => {
        const existedContact = merged.get(contact.pServed)

        if (!existedContact || (isExternalContact(existedContact) && !isExternalContact(contact))) {
          merged.set(contact.pServed, contact)
        }
      })
      return Array.from(merged.values())
    }

    const idsForQuery: string[] = []
    const result: Contact[] = []
    const fallbackContacts = new Map<string, Contact>()
    // Отсеиваем те id, контакты с которыми уже есть в списке и те, по которым уже идет запрос
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (forceFetch) {
          idsForQuery.push(id)
        } else {
          const contact = getContact(id)
          if (contact) {
            if (!isExternalContact(contact)) {
              result.push(contact)
              continue
            }

            fallbackContacts.set(id, contact)
          }

          if (contactsInQuery.has(id)) {
            continue
          }

          idsForQuery.push(id)
        }
      }
    } else {
      const contact = getContact(ids)
      if (!contact) {
        idsForQuery.push(ids)
      } else if (!forceFetch && !isExternalContact(contact)) {
        return [contact as Contact]
      } else {
        fallbackContacts.set(ids, contact as Contact)
        idsForQuery.push(ids)
      }
    }

    const nonFoundContacts = new Set(idsForQuery)
    idsForQuery.forEach((id) => contactsInQuery.add(id))

    const MAX_VALUES_PER_QUERY = 50
    const chunks = []
    for (let i = 0; i < idsForQuery.length; i += MAX_VALUES_PER_QUERY) {
      chunks.push([...idsForQuery].slice(i, i + MAX_VALUES_PER_QUERY))
    }

    if (!chunks.length) {
      return result
    }

    const queries: GetContactsQuery[] = []
    chunks.forEach(chunk => {
      if (field === 'pServed') {
        queries.push({
          Filters: [{
            AvailableOperations: ['eq'],
            AvailableValues: chunk.join(';'),
            PropertyName: 'imLogin',
            TypeFilter: 'imLogin',
          }],
          Page: 1,
          Size: chunk.length,
        })  
      } else {
        queries.push({  // Можно было бы объединить в 1 запрос, на похоже FilterLogicOperator на бэке не работает :\
          Filters: [{
            AvailableOperations: ['eq'],
            AvailableValues: chunk.join(';'),
            PropertyName: 'internalNumber',
            TypeFilter: 'phone',
          }],
          Page: 1,
          Size: chunk.length,
        }, {
          Filters: [{
            AvailableOperations: ['eq'],
            AvailableValues: chunk.join(';'),
            PropertyName: 'mobilePhone',
            TypeFilter: 'phone',
          }],
          Page: 1,
          Size: chunk.length,
        })
      }
      
    })

    try {
      loading.value = true
      const { fetchContacts } = useContactApi()

      const promises = Promise.all(queries.map(q => fetchContacts(q)))
      const responses = await promises
      await fetchAllGroups()

      responses?.forEach((response) => {
        response.data?.list?.forEach(item => {
          const contact = {
            ...item,
            pServed: item.imLogin || contactNumberToPServed(item.internalNumber || item.mobilePhone || ''),
            groups: mapContactGroups(item.groupIds),
            isExternal: isExternalContactDto(item),
          }

          nonFoundContacts.delete(field === 'pServed'
            ? contact.pServed
            : (contact.internalNumber || contact.mobilePhone || ''))

          setContactIfDoesNotExists(contact)
          result.push(contact)
        })
      })

      triggerRef(innerData)

      if (field === 'pServed' && nonFoundContacts.size !== 0) {
        const internalNumbersForQuery: string[] = []
        for (const internalNumber of nonFoundContacts.values()) {
          internalNumbersForQuery.push(contactPServedToNumber(internalNumber))
        }

        const result2: Contact[] = await fetchContactsBySomeIds(internalNumbersForQuery, 'internalNumber', forceFetch)
        const fallbackResult = Array.from(nonFoundContacts.values())
          .map((id) => fallbackContacts.get(id))
          .filter((contact): contact is Contact => !!contact)

        return mergeUniqueContacts(result, result2, fallbackResult)
      }

      const fallbackResult = field === 'internalNumber'
        ? Array.from(nonFoundContacts.values())
          .map((id) => fallbackContacts.get(id))
          .filter((contact): contact is Contact => !!contact)
        : []

      return mergeUniqueContacts(result, fallbackResult)
    } catch (e) {
      console.error(e)
      const fallbackResult = Array.from(fallbackContacts.values())
      return mergeUniqueContacts(result, fallbackResult)
    } finally {
      idsForQuery.forEach((id) => contactsInQuery.delete(id))
      loading.value = false
    }
  }

  const { currentUser } = storeToRefs(useAppStore())
  watch(currentUser, (n, o) => {
    if (o?.imLogin) {
      innerData.value.delete(o.imLogin)
      triggerRef(innerData)
    }
    if (n?.imLogin) {
      innerData.value.set(n.imLogin, {
        ...n,
        groups: [],
        groupIds: [],
        pServed: n.imLogin,
      })
      triggerRef(innerData)
    }
  }, { immediate: true })

  return {
    contacts: innerData,
    getByPServed,
    getByInternalNumber,
    getLocalByPServed,
    fetchContactsBySomeIds,
    setContactIfDoesNotExists,
    loading,
    $reset: () => {
      innerData.value = new Map()
      groups.value = []
      loading.value = false
      externalContactsLoaded.value = false
      externalContactsLoadingPromise = null
      triggerRef(innerData)
    },
  }
})
