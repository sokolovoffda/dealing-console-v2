import { UserInfo } from '@wui/common-library'
import { PServed } from '@wui/im'
import { defineStore } from 'pinia'
import { readonly, ref, shallowRef, triggerRef } from 'vue'

import { useContactApi, Contact, ContactDto, GroupDto, GetContactsQuery, isExternalContactDto, useContactCachedStore } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'
import { IDB, OBJECT_STORE_NAME_EXTERNAL, OBJECT_STORE_NAME_FAVORITES, contactNumberToPServed } from '@/shared/services'
import { createExternalContact } from '@/shared/utils/contact'

import { buildContactsDirectorySearchFilterQueries } from '../lib/build-contacts-directory-search-query'

/** Сколько тянуть с каждого Filter-запроса при merge-поиске (как web ~50–100). */
const DIRECTORY_SEARCH_FETCH_SIZE = 100

export interface AlphabeticalLetterItem {
  id: string
  value: string
}

type DirectorySearchCache = {
  key: string
  contacts: Contact[]
}

export const useContactStore = defineStore('contacts', () => {
  const innerData = shallowRef(new Map<PServed, Contact>())
  const externalContactsFromIndexedDb = shallowRef(new Map<PServed, Contact>())
  const groupContactCounts = shallowRef(new Map<string, number>())
  const loading = ref<boolean>(false)
  const groups = ref<GroupDto[]>([])
  let directorySearchCache: DirectorySearchCache | null = null

  const page = ref(1)
  const perPage = ref(15)
  const total = ref(0)
  const lastPage = ref(0)

  const mapContactGroups = (groupIds: string[], sourceGroups: GroupDto[]) => {
    return sourceGroups.filter(({ guid }) => groupIds.includes(guid))
  }

  const resolveContactPServed = (c: ContactDto): PServed | undefined => {
    if (c.imLogin) return c.imLogin
    if (c.internalNumber) return contactNumberToPServed(c.internalNumber)
    if (c.mobilePhone) return contactNumberToPServed(c.mobilePhone)
    return undefined
  }

  const mapDtoToContact = (c: ContactDto, fetchedGroups: GroupDto[]): Contact | undefined => {
    const pServed = resolveContactPServed(c)
    if (!pServed) {
      console.warn('Contact pServed is undefined', c)
      return undefined
    }

    return {
      ...c,
      pServed,
      groups: mapContactGroups(c.groupIds, fetchedGroups),
      isExternal: isExternalContactDto(c),
    }
  }

  const sortContacts = (
    contacts: Contact[],
    sortBy: GetContactsQuery['SortBy'] = 'name',
    order: GetContactsQuery['Order'] = 'asc',
  ) => {
    const field = sortBy ?? 'name'
    const direction = order === 'desc' ? -1 : 1

    return [...contacts].sort((a, b) => {
      const left = String(a[field] ?? '').toLowerCase()
      const right = String(b[field] ?? '').toLowerCase()
      return left.localeCompare(right, 'ru') * direction
    })
  }

  const applyContactsPage = (contacts: Contact[], currentPage: number, size: number) => {
    const safeSize = size > 0 ? size : 15
    const maxPage = Math.max(1, Math.ceil(contacts.length / safeSize) || 1)
    const safePage = Math.min(Math.max(1, currentPage), maxPage)
    const start = (safePage - 1) * safeSize
    const pageItems = contacts.slice(start, start + safeSize)

    innerData.value.clear()
    pageItems.forEach((contact) => {
      innerData.value.set(contact.pServed, contact)
      useContactCachedStore().setContactIfDoesNotExists(contact)
    })

    page.value = safePage
    perPage.value = safeSize
    total.value = contacts.length
    lastPage.value = maxPage
    triggerRef(innerData)
  }

  const resetGroupsCache = () => {
    groups.value = []
    groupContactCounts.value = new Map()
    triggerRef(groupContactCounts)
  }

  const $reset = () => {
    innerData.value = new Map()
    externalContactsFromIndexedDb.value = new Map()
    directorySearchCache = null
    resetGroupsCache()
    loading.value = false
    page.value = 1
    perPage.value = 15
    total.value = 0
    lastPage.value = 0
    triggerRef(innerData)
    triggerRef(externalContactsFromIndexedDb)
  }

  const fetchData = (query: Partial<GetContactsQuery>): Promise<Map<PServed, Contact>> => {
    const { fetchContacts } = useContactApi()
    directorySearchCache = null

    return new Promise((resolve, reject) => {
      loading.value = true
      Promise.all([
        fetchContacts({ Page: page.value, Size: perPage.value, SortBy: 'name', ...query }),
        fetchAllGroups(),
      ]).then(([ { data }, fetchedGroups ]) => {
        innerData.value.clear()

        const contacts = data?.list || []
        contacts.forEach((c) => {
          const contact = mapDtoToContact(c, fetchedGroups ?? [])
          if (!contact) return

          innerData.value.set(contact.pServed, contact)
          useContactCachedStore().setContactIfDoesNotExists(contact)
        })

        page.value = data.page.currentPage
        lastPage.value = data.page.lastPage
        total.value = data.page.total
        perPage.value = data.page.perPage

        triggerRef(innerData)
        resolve(innerData.value)
      }).catch(reject).finally(() => {
        loading.value = false
      })
    })
  }

  /**
   * Поиск справочника: несколько Filter-запросов + merge (как web), без SearchText / без or.
   * Пагинация — клиентская по смерженному списку.
   */
  const fetchDirectorySearch = async (
    query: Partial<GetContactsQuery> & { searchText: string },
  ): Promise<Map<PServed, Contact>> => {
    const { searchText, ...rest } = query
    const searchVal = searchText.trim()
    if (!searchVal) {
      return fetchData(rest)
    }

    const { fetchContacts } = useContactApi()
    const currentPage = query.Page ?? 1
    const size = query.Size ?? perPage.value
    const sortBy = query.SortBy ?? 'name'
    const order = query.Order ?? 'asc'
    const cacheKey = `${searchVal}|${sortBy}|${order}`

    loading.value = true
    try {
      if (directorySearchCache?.key !== cacheKey) {
        const filterQueries = buildContactsDirectorySearchFilterQueries(searchVal)
        const [responses, fetchedGroups] = await Promise.all([
          Promise.all(filterQueries.map(filterQuery => fetchContacts({
            Page: 1,
            Size: DIRECTORY_SEARCH_FETCH_SIZE,
            SortBy: sortBy,
            Order: order,
            ...filterQuery,
          }))),
          fetchAllGroups(),
        ])

        const byId = new Map<string, Contact>()
        responses.forEach((response) => {
          (response.data.list ?? []).forEach((dto) => {
            if (byId.has(dto.id)) return
            const contact = mapDtoToContact(dto, fetchedGroups ?? [])
            if (contact) byId.set(dto.id, contact)
          })
        })

        directorySearchCache = {
          key: cacheKey,
          contacts: sortContacts([...byId.values()], sortBy, order),
        }
      }

      applyContactsPage(directorySearchCache.contacts, currentPage, size)
      return innerData.value
    } finally {
      loading.value = false
    }
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

      resetGroupsCache()
      return groups.value
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      resetGroupsCache()
      return groups.value
    }
  }

  const fetchGroupContactCounts = async (allowCache = true) => {
    const { fetchContacts } = useContactApi()

    if (groupContactCounts.value.size && allowCache) {
      return groupContactCounts.value
    }

    

    const groupsList = await fetchAllGroups(allowCache)
    if (!groupsList.length) {
      groupContactCounts.value = new Map()
      triggerRef(groupContactCounts)
      return groupContactCounts.value
    }

    const countsEntries = await Promise.all(groupsList.map(async (group) => {
      try {
        const response = await fetchContacts({
          Page: 1,
          Size: 1,
          groupId: group.guid,
        })

        return [group.guid, response.data.page.total] as const
      } catch (error) {
        console.error(`Failed to fetch contacts count for group ${group.guid}:`, error)
        return [group.guid, 0] as const
      }
    }))

    groupContactCounts.value = new Map(countsEntries)
    triggerRef(groupContactCounts)
    return groupContactCounts.value
  }

  const fetchNonEmptyGroups = async (allowCache = true) => {
    const [groupsList, counts] = await Promise.all([
      fetchAllGroups(allowCache),
      fetchGroupContactCounts(allowCache),
    ])

    return groupsList.filter(group => (counts.get(group.guid) ?? 0) > 0)
  }

  const getGroupContactCount = (guid: string) => {
    return groupContactCounts.value.get(guid) ?? 0
  }

  const getByInternalNumber = (internalNumber: string): UserInfo | Contact | undefined => {
    const { currentUser } = useAppStore()
    const isCurrentUser = currentUser?.internalNumber === internalNumber
    if (isCurrentUser) {
      return currentUser as UserInfo
    }

    const innerValues = Array.from(innerData.value.values())
    const innerResult = innerValues.find(v => v.internalNumber === internalNumber)
    if (innerResult) {
      return innerResult
    }

    const externalValues = Array.from(externalContactsFromIndexedDb.value.values())
    const externalResult = externalValues.find(v => v.internalNumber === internalNumber)
    if (externalResult) {
      return externalResult
    }
  }

  const getByInternalNumberOrCreateExternal = (internalNumber: string, saveExternalToIndexedDb = true): UserInfo | Contact => {
    return getByInternalNumber(internalNumber) ?? createExternalContact(internalNumber, saveExternalToIndexedDb)
  }

  const getByPServed = (pServed: string): Contact | undefined => {
    return innerData.value.get(pServed) || externalContactsFromIndexedDb.value.get(pServed)
  }

  const fetchExternalContactsFromIndexedDb = async () => {
    try {
      const contacts = await IDB.getAll({
        objectStoreName: OBJECT_STORE_NAME_EXTERNAL,
      }) as Contact[]

      contacts.forEach(contact => externalContactsFromIndexedDb.value.set(contact.pServed, contact))
      triggerRef(externalContactsFromIndexedDb)
    } catch (e) {
      console.error(e)
    }
  }

  const saveExternalContactToIndexedDb = async (contact: Contact) => {
    await IDB.saveData({
      objectStoreName: OBJECT_STORE_NAME_EXTERNAL,
      key: contact.pServed,
      data: contact,
    })
    externalContactsFromIndexedDb.value.set(contact.pServed, contact)
    triggerRef(externalContactsFromIndexedDb)
  }

  const deleteExternalContactFromIndexedDb = (key: PServed) => {
    IDB.deleteData({
      objectStoreName: OBJECT_STORE_NAME_EXTERNAL,
      key: key,
    })
    externalContactsFromIndexedDb.value.delete(key)
    triggerRef(externalContactsFromIndexedDb)
  }

  const incrementFavoriteToIndexedDb = async (key: PServed) => {
    try {
      let increment = await IDB.getData<number>({
        key,
        objectStoreName: OBJECT_STORE_NAME_FAVORITES,
      })

      if (typeof increment === 'number') {
        increment++
      } else {
        increment = 0
      }

      await IDB.saveData({
        key,
        objectStoreName: OBJECT_STORE_NAME_FAVORITES,
        data: increment,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const getContactsByGroupGuid = (guid: string): Contact[] => {
    return Array.from(innerData.value.values()).filter(contact => contact.groupIds.some(groupId => groupId === guid))
  }

  return {
    fetchData,
    fetchDirectorySearch,
    fetchAllGroups,
    fetchGroupContactCounts,
    fetchNonEmptyGroups,
    page,
    perPage,
    total: readonly(total),
    lastPage: readonly(lastPage),
    contacts: innerData,
    groupContactCounts: readonly(groupContactCounts),
    loading: readonly(loading),
    getByInternalNumber,
    getByInternalNumberOrCreateExternal,
    getGroupContactCount,
    getByPServed,
    saveExternalContactToIndexedDb,
    deleteExternalContactFromIndexedDb,
    incrementFavoriteToIndexedDb,
    getContactsByGroupGuid,
    fetchExternalContactsFromIndexedDb,
    externalContactsFromIndexedDb,
    $reset,
  }
})
