import { storeToRefs } from 'pinia'
import { computed, ref, shallowRef, triggerRef, watch } from 'vue'

import {
  type ActivityMonitorGridCell,
  type ActivityMonitorSubscription,
  useActivityMonitorStore,
} from '@/entities/activity-monitor'
import {
  isExternalContactDto,
  useContactApi,
  useContactCachedStore,
  useContactStore,
  type Contact,
  type ContactDto,
  type GroupDto,
} from '@/entities/contact'

import { contactNumberToPServed } from '@/shared/services'

export type ActivityMonitorContactGridCell = ActivityMonitorGridCell & {
  contact: Contact | null
}

const getContactGuid = (contact: Pick<ContactDto, 'guid' | 'id'>) => {
  return contact.guid || contact.id
}

const mapContactDto = (item: ContactDto, groups: GroupDto[]): Contact | null => {
  const pServed = item.imLogin
    || contactNumberToPServed(item.internalNumber)
    || (item.mobilePhone ? contactNumberToPServed(item.mobilePhone) : '')

  if (!pServed) {
    console.warn('Activity monitor contact pServed is undefined', item)
    return null
  }

  return {
    ...item,
    pServed,
    groups,
    isExternal: isExternalContactDto(item),
  }
}

const findContactInMap = (contacts: Map<string, Contact>, contactGuid: string) => {
  for (const contact of contacts.values()) {
    if (getContactGuid(contact) === contactGuid) return contact
  }

  return undefined
}

export const useActivityMonitorGridContacts = () => {
  const activityMonitorStore = useActivityMonitorStore()
  const contactStore = useContactStore()
  const contactCachedStore = useContactCachedStore()
  const { fetchContacts } = useContactApi()

  const { gridCells, subscriptions } = storeToRefs(activityMonitorStore)
  const contactsByGuid = shallowRef(new Map<string, Contact>())
  const contactsLoading = ref(false)
  let requestId = 0

  const findLocalContact = (contactGuid: string): Contact | undefined => {
    return contactsByGuid.value.get(contactGuid)
      ?? findContactInMap(contactCachedStore.contacts, contactGuid)
      ?? findContactInMap(contactStore.contacts, contactGuid)
  }

  const fetchContactByGuid = async (contactGuid: string): Promise<Contact | null> => {
    const localContact = findLocalContact(contactGuid)
    if (localContact) return localContact

    const [groups, response] = await Promise.all([
      contactStore.fetchAllGroups(),
      fetchContacts({
        Page: 1,
        Size: 20,
        SearchText: contactGuid,
      }),
    ])

    const matched = response.data.list.find(item => getContactGuid(item) === contactGuid)
    if (!matched) return null

    const groupsForContact = (groups ?? []).filter(({ guid }) => matched.groupIds.includes(guid))
    const contact = mapContactDto(matched, groupsForContact)
    if (!contact) return null

    contactCachedStore.setContactIfDoesNotExists(contact)
    return contact
  }

  const syncContacts = async (nextSubscriptions: ActivityMonitorSubscription[]) => {
    const currentRequestId = ++requestId
    const nextGuids = nextSubscriptions.map(subscription => subscription.contactGuid)
    const nextGuidSet = new Set(nextGuids)

    const pruned = new Map(
      Array.from(contactsByGuid.value.entries())
        .filter(([contactGuid]) => nextGuidSet.has(contactGuid)),
    )
    contactsByGuid.value = pruned
    triggerRef(contactsByGuid)

    const missingGuids = nextGuids.filter(contactGuid => !pruned.has(contactGuid))
    if (!missingGuids.length) return

    contactsLoading.value = true

    try {
      const resolved = await Promise.all(
        missingGuids.map(async (contactGuid) => {
          try {
            const contact = await fetchContactByGuid(contactGuid)
            return [contactGuid, contact] as const
          } catch (e) {
            console.error('Activity monitor contact load failed:', contactGuid, e)
            return [contactGuid, null] as const
          }
        }),
      )

      if (currentRequestId !== requestId) return

      resolved.forEach(([contactGuid, contact]) => {
        if (!contact) return
        contactsByGuid.value.set(contactGuid, contact)
      })
      triggerRef(contactsByGuid)
    } finally {
      if (currentRequestId === requestId) {
        contactsLoading.value = false
      }
    }
  }

  const cells = computed<ActivityMonitorContactGridCell[]>(() => {
    return gridCells.value.map((cell) => ({
      ...cell,
      contact: cell.subscription
        ? contactsByGuid.value.get(cell.subscription.contactGuid) ?? null
        : null,
    }))
  })

  watch(
    subscriptions,
    (nextSubscriptions) => {
      void syncContacts(nextSubscriptions)
    },
    { immediate: true, deep: true },
  )

  const putContact = (contact: Contact) => {
    const contactGuid = getContactGuid(contact)
    if (!contactGuid) return

    contactsByGuid.value.set(contactGuid, contact)
    contactCachedStore.setContactIfDoesNotExists(contact)
    triggerRef(contactsByGuid)
  }

  return {
    cells,
    contactsByGuid,
    contactsLoading,
    putContact,
  }
}
