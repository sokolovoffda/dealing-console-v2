import { computed, ref, shallowRef, triggerRef } from 'vue'

import { isExternalContactDto, useContactApi, useContactStore } from '@/entities/contact'
import type { Contact, ContactDto, GroupDto } from '@/entities/contact'

import { contactNumberToPServed } from '@/shared/services'

const DEFAULT_GROUP_CONTACTS_PAGE_SIZE = 100

const mapContactGroups = (groupIds: string[], groups: GroupDto[]) => {
  return groups.filter(({ guid }) => groupIds.includes(guid))
}

const getContactGuid = (contact: Contact) => {
  return contact.guid || contact.id
}

const addGroupId = (contact: Contact, groupGuid: string): Contact => {
  return {
    ...contact,
    groupIds: Array.from(new Set([...contact.groupIds, groupGuid])),
  }
}

const mapContactDto = (item: ContactDto, groups: GroupDto[]): Contact | null => {
  const pServed = item.imLogin || contactNumberToPServed(item.internalNumber) || contactNumberToPServed(item.mobilePhone as string)

  if (!pServed) {
    console.warn('Contact pServed is undefined', item)
    return null
  }

  return {
    ...item,
    pServed,
    groups: mapContactGroups(item.groupIds, groups),
    isExternal: isExternalContactDto(item),
  }
}

export const useWorkspaceGroupContacts = (pageSize = DEFAULT_GROUP_CONTACTS_PAGE_SIZE) => {
  const activeGroupGuid = ref<string>()
  const contactsByGroupGuid = shallowRef(new Map<string, Contact[]>())
  const loading = ref(false)
  const error = ref<string | null>(null)
  let requestId = 0

  const contacts = computed(() => {
    if (!activeGroupGuid.value) return []

    return contactsByGroupGuid.value.get(activeGroupGuid.value) ?? []
  })

  const fetchGroupContacts = async (groupGuid: string) => {
    const { fetchContacts } = useContactApi()
    const { fetchAllGroups } = useContactStore()

    const [groups, response] = await Promise.all([
      fetchAllGroups(),
      fetchContacts({
        Page: 1,
        Size: pageSize,
        groupId: groupGuid,
      }),
    ])

    return response.data.list.flatMap((item) => {
      const contact = mapContactDto(item, groups ?? [])
      return contact ? [contact] : []
    })
  }

  /**
   * WUI-5642: дорезолв контактов из fast-dial, которых нет в GET contacts?groupId=
   * (старый RTU без membership). SearchText на RTU матчит guid (см. WUI-5609).
   */
  const hydrateMissingContacts = async (groupGuid: string, contactGuids: string[]) => {
    const currentContacts = contactsByGroupGuid.value.get(groupGuid) ?? []
    const knownGuids = new Set(currentContacts.map(getContactGuid))
    const missingGuids = Array.from(new Set(contactGuids)).filter(guid => !knownGuids.has(guid))

    if (missingGuids.length === 0) return

    const { fetchContacts } = useContactApi()
    const { fetchAllGroups } = useContactStore()
    const groups = await fetchAllGroups()

    const resolvedContacts = (await Promise.all(missingGuids.map(async (guid) => {
      try {
        const response = await fetchContacts({
          Page: 1,
          Size: 20,
          SearchText: guid,
        })
        const item = response.data.list.find(candidate => (candidate.guid || candidate.id) === guid)

        if (!item) return null

        return mapContactDto(item, groups ?? [])
      } catch (e) {
        console.warn('WUI-5642: failed to resolve fast-dial contact by guid', guid, e)
        return null
      }
    }))).filter((contact): contact is Contact => Boolean(contact))

    if (resolvedContacts.length === 0) return

    const nextContacts = [...currentContacts]
    const nextKnownGuids = new Set(knownGuids)

    resolvedContacts.forEach((contact) => {
      const contactGuid = getContactGuid(contact)
      if (nextKnownGuids.has(contactGuid)) return

      nextKnownGuids.add(contactGuid)
      nextContacts.push(addGroupId(contact, groupGuid))
    })

    contactsByGroupGuid.value.set(groupGuid, nextContacts)
    triggerRef(contactsByGroupGuid)
  }

  const loadGroupContacts = async (groupGuid?: string, force = false) => {
    activeGroupGuid.value = groupGuid
    error.value = null

    if (!groupGuid) return
    if (contactsByGroupGuid.value.has(groupGuid) && !force) return

    const currentRequestId = ++requestId
    try {
      loading.value = true

      const nextContacts = await fetchGroupContacts(groupGuid)

      contactsByGroupGuid.value.set(groupGuid, nextContacts)
      triggerRef(contactsByGroupGuid)
    } catch (e) {
      if (currentRequestId === requestId) {
        contactsByGroupGuid.value.delete(groupGuid)
        triggerRef(contactsByGroupGuid)
        error.value = e instanceof Error ? e.message : 'Не удалось загрузить контакты группы'
      }
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false
      }
    }
  }

  const refreshGroupContacts = async (groupGuid = activeGroupGuid.value) => {
    await loadGroupContacts(groupGuid, true)
  }

  const refreshCachedGroupContacts = async (groupGuid: string) => {
    const nextContacts = await fetchGroupContacts(groupGuid)

    contactsByGroupGuid.value.set(groupGuid, nextContacts)
    triggerRef(contactsByGroupGuid)
  }

  const addCachedGroupContact = (groupGuid: string, contact: Contact) => {
    const currentContacts = contactsByGroupGuid.value.get(groupGuid) ?? []
    const contactGuid = getContactGuid(contact)

    if (currentContacts.some(currentContact => getContactGuid(currentContact) === contactGuid)) return

    contactsByGroupGuid.value.set(groupGuid, [...currentContacts, addGroupId(contact, groupGuid)])
    triggerRef(contactsByGroupGuid)
  }

  const removeCachedGroupContact = (groupGuid: string, contactGuid: string) => {
    const currentContacts = contactsByGroupGuid.value.get(groupGuid) ?? []

    contactsByGroupGuid.value.set(
      groupGuid,
      currentContacts.filter(contact => getContactGuid(contact) !== contactGuid),
    )
    triggerRef(contactsByGroupGuid)
  }

  const clearCachedGroupContacts = (groupGuid: string) => {
    if (!contactsByGroupGuid.value.has(groupGuid)) return

    contactsByGroupGuid.value.delete(groupGuid)
    triggerRef(contactsByGroupGuid)

    if (activeGroupGuid.value === groupGuid) {
      activeGroupGuid.value = undefined
    }
  }

  return {
    contacts,
    loading,
    error,
    contactsByGroupGuid,
    loadGroupContacts,
    refreshGroupContacts,
    refreshCachedGroupContacts,
    hydrateMissingContacts,
    addCachedGroupContact,
    removeCachedGroupContact,
    clearCachedGroupContacts,
  }
}
