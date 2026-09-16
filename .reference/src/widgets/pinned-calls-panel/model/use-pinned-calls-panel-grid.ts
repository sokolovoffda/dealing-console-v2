import { computed, type Ref } from 'vue'

import type { PinnedCallGridCell } from '@/entities/pinned-calls'

type SlotGridItem = {
  key: string
  type: 'slot'
  index: number
  cell: PinnedCallGridCell
}

export type PinnedCallsPanelGridItem = SlotGridItem

export const usePinnedCallsPanelGrid = (gridCells: Readonly<Ref<PinnedCallGridCell[]>>) => {
  const gridItems = computed<PinnedCallsPanelGridItem[]>(() =>
    gridCells.value.map(cell => ({
      key: `slot-${cell.order}`,
      type: 'slot' as const,
      index: cell.order,
      cell,
    })),
  )

  return {
    gridItems,
  }
}
