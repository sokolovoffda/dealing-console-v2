import { storeToRefs } from 'pinia'
import type { Ref } from 'vue'

import { toFastDialContactPayload, useFastDialStore } from '@/entities/fast-dial'
import { useContactTabs } from '@/entities/settings'

import {
  toQuickCallFastDialContactPositions,
  type QuickCallGridLayout,
} from '../use-quick-call-fast-dial-grid'

type UseQuickCallFastDialLayoutSaveParams = {
  activeGroupGuid: Ref<string | undefined>
}

export const useQuickCallFastDialLayoutSave = ({
  activeGroupGuid,
}: UseQuickCallFastDialLayoutSaveParams) => {
  const contactTabsStore = useContactTabs()
  const { enabledTabs } = storeToRefs(contactTabsStore)
  const fastDialStore = useFastDialStore()
  const { groupsByGroupGuid } = storeToRefs(fastDialStore)

  const getFastDialGroupOrder = (groupGuid: string) => {
    const tabOrder = enabledTabs.value.find(tab => tab.groupGuid === groupGuid)?.order

    return Math.max(0, (tabOrder ?? 1) - 1)
  }

  const saveFastDialLayout = async (
    groupGuid: string,
    nextLayout: QuickCallGridLayout,
    options: { createIfMissing?: boolean } = {},
  ) => {
    const { createIfMissing = true } = options
    const fastDialContacts = toFastDialContactPayload(toQuickCallFastDialContactPositions(nextLayout))
    const fastDialGroup = groupsByGroupGuid.value.get(groupGuid)

    if (fastDialGroup) {
      if (fastDialContacts.length === 0) {
        await fastDialStore.deleteGroup(fastDialGroup.id)
        return
      }

      await fastDialStore.updateGroup(fastDialGroup.id, {
        contacts: fastDialContacts,
      })
      return
    }

    if (!createIfMissing) return

    await fastDialStore.createGroup({
      groupGuid,
      order: getFastDialGroupOrder(groupGuid),
      contacts: fastDialContacts,
    })
  }

  const saveActiveFastDialLayout = async (
    nextLayout: QuickCallGridLayout,
    options: { createIfMissing?: boolean } = {},
  ) => {
    const groupGuid = activeGroupGuid.value
    if (!groupGuid) return

    await saveFastDialLayout(groupGuid, nextLayout, options)
  }

  return {
    saveActiveFastDialLayout,
    saveFastDialLayout,
  }
}
