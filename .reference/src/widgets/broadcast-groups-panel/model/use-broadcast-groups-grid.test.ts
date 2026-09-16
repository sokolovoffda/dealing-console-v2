import { ref } from 'vue'

import type { PinnedCallGroupCell } from '@/entities/pinned-calls'

import { useBroadcastGroupsGrid } from './use-broadcast-groups-grid'

const cellWithMembers = (index: number): PinnedCallGroupCell => ({
  index,
  displayNumber: index + 1,
  group: {
    index,
    micState: true,
    volumeState: true,
    members: [{ pServed: `<sip:${index}@ROOT>`, slotIndex: 1 }],
  },
})

const emptyCell = (index: number): PinnedCallGroupCell => ({
  index,
  displayNumber: index + 1,
  group: {
    index,
    micState: true,
    volumeState: true,
    members: [],
  },
})

describe('useBroadcastGroupsGrid', () => {
  it('should return empty list when layout is not selected', () => {
    // Arrange
    const groupCells = ref<PinnedCallGroupCell[]>([cellWithMembers(0)])
    const layoutCount = ref<4 | 8 | null>(null)

    // Act
    const { gridItems } = useBroadcastGroupsGrid(groupCells, layoutCount)

    // Assert
    expect(gridItems.value).toEqual([])
  })

  it('should keep empty slots to preserve layout positions', () => {
    // Arrange
    const groupCells = ref<PinnedCallGroupCell[]>([
      cellWithMembers(0),
      emptyCell(1),
      cellWithMembers(2),
    ])
    const layoutCount = ref<4 | 8 | null>(4)

    // Act
    const { gridItems } = useBroadcastGroupsGrid(groupCells, layoutCount)

    // Assert
    expect(gridItems.value).toHaveLength(4)
    expect(gridItems.value.map(item => item.index)).toEqual([0, 1, 2, 3])
    expect(gridItems.value[0].isEmpty).toBe(false)
    expect(gridItems.value[1].isEmpty).toBe(true)
    expect(gridItems.value[2].isEmpty).toBe(false)
    expect(gridItems.value[3].isEmpty).toBe(true)
  })

  it('should show all layout slots including empties', () => {
    // Arrange
    const groupCells = ref<PinnedCallGroupCell[]>([
      cellWithMembers(0),
      emptyCell(1),
    ])
    const layoutCount = ref<4 | 8 | null>(4)

    // Act
    const { gridItems } = useBroadcastGroupsGrid(groupCells, layoutCount)

    // Assert
    expect(gridItems.value).toHaveLength(4)
    expect(gridItems.value[0].isEmpty).toBe(false)
    expect(gridItems.value[1].isEmpty).toBe(true)
    expect(gridItems.value[3].isEmpty).toBe(true)
    expect(gridItems.value.every(item => item.disabled === false)).toBe(true)
  })
})
