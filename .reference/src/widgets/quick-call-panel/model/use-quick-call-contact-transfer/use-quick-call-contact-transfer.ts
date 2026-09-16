import { ref } from 'vue'

import type { Contact } from '@/entities/contact'
import type { Group } from '@/entities/group'
import { useGroupStore } from '@/entities/group'

type MoveContactToGroupParams = {
  contactGuid: string
  sourceGroupGuid: string
  targetGroupGuid: string
}

type AddContactToGroupParams = {
  contactGuid: string
  targetGroupGuid: string
}

type RemoveContactFromGroupParams = {
  contactGuid: string
  sourceGroupGuid: string
  /** Запасной список guid'ов группы, если GET /groups/{guid} не вернул contactGuids */
  knownContactGuids?: string[]
  contact?: Contact | null
}

const getContactIdentityCandidates = (contactGuid: string, contact?: Contact | null) => {
  return Array.from(new Set([
    contactGuid,
    contact?.guid,
    contact?.id,
  ].filter((value): value is string => Boolean(value))))
}

const resolveContactGuidInGroup = (
  contactGuids: string[],
  contactGuid: string,
  contact?: Contact | null,
) => {
  return getContactIdentityCandidates(contactGuid, contact)
    .find(candidate => contactGuids.includes(candidate))
}

/** WUI-5642: старый RTU без поля contactGuids — membership только через fast-dial. */
const hasContactGuidsSupport = (group: Group) => {
  return Array.isArray(group.contactGuids)
}

export const useQuickCallContactTransfer = () => {
  const transferring = ref(false)

  const getGroupContactGuids = (group: Group, fallbackContactGuids: string[] = []) => {
    if (Array.isArray(group.contactGuids)) {
      return group.contactGuids
    }

    if (fallbackContactGuids.length > 0) {
      console.warn(`Group ${group.guid} response has no contactGuids, using local group contacts fallback`)
      return fallbackContactGuids
    }

    throw new Error(`Group ${group.guid} does not contain contactGuids`)
  }

  const addUniqueContactGuid = (contactGuids: string[], contactGuid: string) => {
    return Array.from(new Set([...contactGuids, contactGuid]))
  }

  const removeContactGuid = (contactGuids: string[], contactGuid: string) => {
    return contactGuids.filter((guid) => guid !== contactGuid)
  }

  const addContactToGroup = async ({
    contactGuid,
    targetGroupGuid,
  }: AddContactToGroupParams) => {
    const groupStore = useGroupStore()

    transferring.value = true

    try {
      const targetGroup = await groupStore.fetchGroup(targetGroupGuid)

      // WUI-5642: нет contactGuids → RTU membership не трогаем, дальше только fast-dial + кеш
      if (!hasContactGuidsSupport(targetGroup)) {
        return true
      }

      const targetContactGuids = targetGroup.contactGuids ?? []

      if (targetContactGuids.includes(contactGuid)) {
        return false
      }

      try {
        await groupStore.updateGroup(targetGroupGuid, {
          name: targetGroup.name,
          type: targetGroup.type,
          contactGuids: addUniqueContactGuid(targetContactGuids, contactGuid),
        })
      } catch (e) {
        console.warn('WUI-5642: RTU group membership update failed, using fast-dial membership', e)
      }

      return true
    } finally {
      transferring.value = false
    }
  }

  const removeContactFromGroup = async ({
    contactGuid,
    sourceGroupGuid,
    knownContactGuids = [],
    contact,
  }: RemoveContactFromGroupParams) => {
    const groupStore = useGroupStore()

    transferring.value = true

    try {
      const sourceGroup = await groupStore.fetchGroup(sourceGroupGuid)

      // WUI-5642: без contactGuids — чистим только локальный кеш + fast-dial
      if (!hasContactGuidsSupport(sourceGroup)) {
        return true
      }

      const sourceContactGuids = getGroupContactGuids(sourceGroup, knownContactGuids)
      const guidInGroup = resolveContactGuidInGroup(sourceContactGuids, contactGuid, contact)

      if (!guidInGroup) {
        // Контакт мог жить только в fast-dial (обход на старом RTU)
        console.warn('Quick call panel delete: contactGuid not in RTU contactGuids, cleanup via fast-dial', {
          contactGuid,
          candidates: getContactIdentityCandidates(contactGuid, contact),
          sourceGroupGuid,
          sourceContactGuids,
        })
        return true
      }

      try {
        await groupStore.updateGroup(sourceGroupGuid, {
          name: sourceGroup.name,
          type: sourceGroup.type,
          contactGuids: removeContactGuid(sourceContactGuids, guidInGroup),
        })
      } catch (e) {
        console.warn('WUI-5642: RTU group membership remove failed, using fast-dial cleanup', e)
      }

      return true
    } finally {
      transferring.value = false
    }
  }

  const moveContactToGroup = async ({
    contactGuid,
    sourceGroupGuid,
    targetGroupGuid,
  }: MoveContactToGroupParams) => {
    if (sourceGroupGuid === targetGroupGuid) return

    const groupStore = useGroupStore()

    transferring.value = true

    try {
      const [sourceGroup, targetGroup] = await Promise.all([
        groupStore.fetchGroup(sourceGroupGuid),
        groupStore.fetchGroup(targetGroupGuid),
      ])

      // WUI-5642: без поддержки contactGuids на любой стороне — только fast-dial
      if (!hasContactGuidsSupport(sourceGroup) || !hasContactGuidsSupport(targetGroup)) {
        return
      }

      try {
        await groupStore.updateGroup(targetGroupGuid, {
          name: targetGroup.name,
          type: targetGroup.type,
          contactGuids: addUniqueContactGuid(getGroupContactGuids(targetGroup), contactGuid),
        })

        await groupStore.updateGroup(sourceGroupGuid, {
          name: sourceGroup.name,
          type: sourceGroup.type,
          contactGuids: removeContactGuid(getGroupContactGuids(sourceGroup), contactGuid),
        })
      } catch (e) {
        console.warn('WUI-5642: RTU group membership move failed, using fast-dial membership', e)
      }
    } finally {
      transferring.value = false
    }
  }

  return {
    addContactToGroup,
    removeContactFromGroup,
    transferring,
    moveContactToGroup,
  }
}
