import { computed, type Ref } from 'vue'

import type { PinnedCallGroupCell } from '@/entities/pinned-calls'

import type { BroadcastGroupsLayoutCount } from './broadcast-groups-layout'

export type BroadcastGroupsGridItem = {
  key: string
  index: number
  displayNumber: number
  cell: PinnedCallGroupCell
  disabled: boolean
  isEmpty: boolean
}

const buildPlaceholderCell = (index: number): PinnedCallGroupCell => ({
  index,
  displayNumber: index + 1,
  group: null,
})

export const useBroadcastGroupsGrid = (
  groupCells: Readonly<Ref<PinnedCallGroupCell[]>>,
  layoutCount: Readonly<Ref<BroadcastGroupsLayoutCount | null>>,
) => {
  const gridItems = computed<BroadcastGroupsGridItem[]>(() => {
    const count = layoutCount.value
    if (count == null) {
      return []
    }

    const cellsByIndex = new Map(groupCells.value.map(cell => [cell.index, cell]))

    // Всегда все слоты раскладки: пустые держат позицию (пробел между группами).
    return Array.from({ length: count }, (_, index) => {
      const cell = cellsByIndex.get(index) ?? buildPlaceholderCell(index)
      const membersCount = cell.group?.members.length ?? 0

      return {
        key: `group-${index}`,
        index,
        displayNumber: cell.displayNumber,
        cell,
        disabled: false,
        isEmpty: membersCount === 0,
      }
    })
  })

  return {
    gridItems,
  }
}
