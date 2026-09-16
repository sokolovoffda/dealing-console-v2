import { computed, ref, type Ref } from 'vue'

import type { Contact } from '@/entities/contact'

import type { QuickCallGridCell } from '../use-quick-call-fast-dial-grid'

export type QuickCallMovingContact = {
  mode: 'inside-group' | 'between-groups' | 'duplicate-to-group'
  contactGuid: string
  contact: Contact
  sourceCellIndex: number
  sourceGroupGuid: string
}

type UseQuickCallMoveStateParams = {
  activeGroupGuid: Ref<string | undefined>
}

export const useQuickCallMoveState = ({
  activeGroupGuid,
}: UseQuickCallMoveStateParams) => {
  const movingContact = ref<QuickCallMovingContact | null>(null)

  const isMoveMode = computed(() => {
    return Boolean(movingContact.value)
  })

  const isGroupTransferInSourceGroup = computed(() => {
    return (movingContact.value?.mode === 'between-groups' || movingContact.value?.mode === 'duplicate-to-group')
      && movingContact.value.sourceGroupGuid === activeGroupGuid.value
  })

  const cancelMove = () => {
    movingContact.value = null
  }

  const startMove = (cell: QuickCallGridCell, mode: QuickCallMovingContact['mode']) => {
    if (!cell.contactGuid || !cell.contact || !activeGroupGuid.value) return

    movingContact.value = {
      mode,
      contactGuid: cell.contactGuid,
      contact: cell.contact,
      sourceCellIndex: cell.index,
      sourceGroupGuid: activeGroupGuid.value,
    }
  }

  const startMoveInsideGroup = (cell: QuickCallGridCell) => {
    startMove(cell, 'inside-group')
  }

  const startMoveToGroup = (cell: QuickCallGridCell) => {
    startMove(cell, 'between-groups')
  }

  const startDuplicateToGroup = (cell: QuickCallGridCell) => {
    startMove(cell, 'duplicate-to-group')
  }

  const isMovingSourceCell = (cell: { contactGuid: string | null, index: number }) => {
    return movingContact.value?.contactGuid === cell.contactGuid
      && movingContact.value.sourceCellIndex === cell.index
      && movingContact.value.sourceGroupGuid === activeGroupGuid.value
  }

  return {
    cancelMove,
    isGroupTransferInSourceGroup,
    isMoveMode,
    isMovingSourceCell,
    movingContact,
    startDuplicateToGroup,
    startMoveInsideGroup,
    startMoveToGroup,
  }
}
