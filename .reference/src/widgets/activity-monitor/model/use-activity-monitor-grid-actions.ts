import { useDialog } from '@wui/common-library'
import axios from 'axios'
import { storeToRefs } from 'pinia'
import { computed, ref, watch, type ComponentOptions } from 'vue'

import { useActivityMonitorStore } from '@/entities/activity-monitor'
import type { Contact } from '@/entities/contact'

import { ChangeContactsModal } from '@/shared/ui'

import type { ActivityMonitorContactGridCell } from './use-activity-monitor-grid-contacts'

export type ActivityMonitorMovingCell = {
  contactGuid: string
  sourceCellIndex: number
}

type UseActivityMonitorGridActionsParams = {
  putContact: (contact: Contact) => void
}

const getContactGuid = (contact: Contact) => {
  return contact.guid || contact.id
}

export const useActivityMonitorGridActions = ({
  putContact,
}: UseActivityMonitorGridActionsParams) => {
  const store = useActivityMonitorStore()
  const { isEditMode, subscriptionsByContactGuid } = storeToRefs(store)
  const { showDialog } = useDialog<Contact[] | undefined>()
  const movingCell = ref<ActivityMonitorMovingCell | null>(null)

  const isMoveMode = computed(() => Boolean(movingCell.value))

  const cancelMove = () => {
    movingCell.value = null
  }

  const startMoveInside = (cell: ActivityMonitorContactGridCell) => {
    if (!cell.subscription || !cell.contact) return

    movingCell.value = {
      contactGuid: cell.subscription.contactGuid,
      sourceCellIndex: cell.cellIndex,
    }
  }

  const isMovingSource = (cell: ActivityMonitorContactGridCell) => {
    const source = movingCell.value
    if (!source) return false

    return source.contactGuid === cell.subscription?.contactGuid
      && source.sourceCellIndex === cell.cellIndex
  }

  const finishReorder = async (toOrder: number) => {
    const source = movingCell.value
    if (!source) return

    if (source.sourceCellIndex === toOrder) {
      cancelMove()
      return
    }

    try {
      await store.reorderSubscriptions({
        fromOrder: source.sourceCellIndex,
        toOrder,
      })
      cancelMove()
    } catch (e) {
      console.error('Activity monitor reorder failed:', e)
      cancelMove()
    }
  }

  const handleSelect = (cell: ActivityMonitorContactGridCell) => {
    if (!movingCell.value) return

    if (isMovingSource(cell)) {
      cancelMove()
      return
    }

    void finishReorder(cell.cellIndex)
  }

  const handleDelete = async (cell: ActivityMonitorContactGridCell) => {
    const contactGuid = cell.subscription?.contactGuid
    if (!contactGuid) return

    try {
      await store.deleteSubscription(contactGuid)

      if (movingCell.value?.contactGuid === contactGuid) {
        cancelMove()
      }
    } catch (e) {
      console.error('Activity monitor delete subscription failed:', e)
    }
  }

  const handleAdd = async (cellIndex: number) => {
    try {
      const selectedContacts = await showDialog(ChangeContactsModal as ComponentOptions, {
        title: 'Добавить абонента',
        contactsPServed: [],
        isOnce: true,
        availableModels: ['contacts'],
        hasOverlay: false,
      })
      const selectedContact = selectedContacts?.at(0)
      if (!selectedContact) return

      const contactGuid = getContactGuid(selectedContact)
      if (!contactGuid) return

      if (subscriptionsByContactGuid.value.has(contactGuid)) {
        console.error('Activity monitor subscription already exists:', contactGuid)
        return
      }

      await store.createSubscription({
        contactGuid,
        order: cellIndex,
      })
      putContact(selectedContact)
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        console.error('Activity monitor subscription conflict (409):', e)
        return
      }

      console.error('Activity monitor add subscription failed:', e)
    }
  }

  const handleEmptyCellClick = (cellIndex: number) => {
    if (movingCell.value) {
      void finishReorder(cellIndex)
      return
    }

    void handleAdd(cellIndex)
  }

  watch(isEditMode, (nextIsEditMode) => {
    if (!nextIsEditMode) {
      cancelMove()
    }
  })

  return {
    cancelMove,
    handleDelete,
    handleEmptyCellClick,
    handleSelect,
    isMoveMode,
    isMovingSource,
    movingCell,
    startMoveInside,
  }
}
