import { computed, ref } from 'vue'

import type { PinnedCallSlotOrder } from '@/entities/pinned-calls'

export type PinnedCallMovingSlot = {
  sourceOrder: PinnedCallSlotOrder
}

export const usePinnedCallsPanelMoveState = () => {
  const movingSlot = ref<PinnedCallMovingSlot | null>(null)

  const isMoveMode = computed(() => Boolean(movingSlot.value))

  const cancelMove = () => {
    movingSlot.value = null
  }

  const startMove = (sourceOrder: PinnedCallSlotOrder) => {
    movingSlot.value = { sourceOrder }
  }

  const isMovingSourceOrder = (order: PinnedCallSlotOrder) => {
    return movingSlot.value?.sourceOrder === order
  }

  return {
    cancelMove,
    isMoveMode,
    isMovingSourceOrder,
    movingSlot,
    startMove,
  }
}
