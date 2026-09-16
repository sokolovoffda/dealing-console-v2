import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { usePinnedCallsPanelStore } from './use-pinned-calls-panel-store'

const mocks = vi.hoisted(() => ({
  reorderPinnedCallGroups: vi.fn(),
}))

vi.mock('../api/use-pinned-calls-api', () => ({
  usePinnedCallsApi: () => ({
    reorderPinnedCallGroups: mocks.reorderPinnedCallGroups,
  }),
}))

vi.mock('@/entities/call-session', () => ({
  useSessionStore: () => ({
    sessions: ref(new Map()),
    getSessionById: vi.fn(),
  }),
}))

vi.mock('@/shared/composables', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/composables')>()

  return {
    ...actual,
    useDevicesSessionsStore: () => ({
      isGooseMicGloballyEnabled: vi.fn(() => false),
      bindSessionDeviceAffinity: vi.fn(),
    }),
    useDevicesStore: () => ({
      readyPreferredGoose: null,
      readyHandsetDevices: [],
    }),
  }
})

const memberA = { pServed: '<sip:100@ROOT>', slotIndex: 1 }
const memberB = { pServed: '<sip:200@ROOT>', slotIndex: 1 }

describe('usePinnedCallsPanelStore.swapGroups', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.reorderPinnedCallGroups.mockReset()
    mocks.reorderPinnedCallGroups.mockResolvedValue({
      data: {
        schemaVersion: 1,
        slots: [],
        groupsLayout: 4,
        groups: [],
      },
    })
  })

  it('should swap group payloads optimistically and call groups/reorder once', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA],
        },
        {
          index: 2,
          micState: false,
          volumeState: false,
          members: [memberB],
        },
      ],
    }

    // Act
    await store.swapGroups(0, 2)

    // Assert
    expect(mocks.reorderPinnedCallGroups).toHaveBeenCalledTimes(1)
    expect(mocks.reorderPinnedCallGroups).toHaveBeenCalledWith({
      fromIndex: 0,
      toIndex: 2,
    })
    expect(store.getGroupByIndex(0)?.members).toEqual([memberB])
    expect(store.getGroupByIndex(0)?.micState).toBe(false)
    expect(store.getGroupByIndex(2)?.members).toEqual([memberA])
    expect(store.getGroupByIndex(2)?.micState).toBe(true)
  })

  it('should move group into empty neighbor slot', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [],
      groupsLayout: 4,
      groups: [
        {
          index: 1,
          micState: true,
          volumeState: true,
          members: [memberA],
        },
      ],
    }

    // Act
    await store.swapGroups(1, 0)

    // Assert
    expect(mocks.reorderPinnedCallGroups).toHaveBeenCalledWith({
      fromIndex: 1,
      toIndex: 0,
    })
    expect(store.getGroupByIndex(0)?.members).toEqual([memberA])
    expect(store.getGroupByIndex(1)?.members).toEqual([])
  })

  it('should no-op when both slots are empty', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [],
      groupsLayout: 4,
      groups: [],
    }

    // Act
    await store.swapGroups(0, 1)

    // Assert
    expect(mocks.reorderPinnedCallGroups).not.toHaveBeenCalled()
  })

  it('should swap runtime group playback volumes', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA],
        },
        {
          index: 1,
          micState: true,
          volumeState: true,
          members: [memberB],
        },
      ],
    }
    store.groupPlaybackVolumeByIndex = new Map([
      [0, 0.4],
      [1, 0.8],
    ])

    // Act
    await store.swapGroups(0, 1)

    // Assert
    expect(store.groupPlaybackVolumeByIndex.get(0)).toBe(0.8)
    expect(store.groupPlaybackVolumeByIndex.get(1)).toBe(0.4)
  })

  it('should rollback local swap when groups/reorder fails', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA],
        },
        {
          index: 1,
          micState: false,
          volumeState: false,
          members: [memberB],
        },
      ],
    }
    store.groupPlaybackVolumeByIndex = new Map([
      [0, 0.4],
      [1, 0.8],
    ])
    mocks.reorderPinnedCallGroups.mockRejectedValueOnce(new Error('reorder failed'))

    // Act
    await expect(store.swapGroups(0, 1)).rejects.toThrow('reorder failed')

    // Assert
    expect(store.getGroupByIndex(0)?.members).toEqual([memberA])
    expect(store.getGroupByIndex(1)?.members).toEqual([memberB])
    expect(store.groupPlaybackVolumeByIndex.get(0)).toBe(0.4)
    expect(store.groupPlaybackVolumeByIndex.get(1)).toBe(0.8)
  })

  it('should keep optimistic groups when response panel DTO is stale', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA],
        },
        {
          index: 1,
          micState: false,
          volumeState: false,
          members: [memberB],
        },
      ],
    }
    // Stale response: groups not swapped (как на текущем backend).
    mocks.reorderPinnedCallGroups.mockResolvedValueOnce({
      data: {
        schemaVersion: 1,
        slots: [],
        groupsLayout: 4,
        groups: [
          {
            index: 0,
            micState: true,
            volumeState: true,
            members: [memberA],
          },
          {
            index: 1,
            micState: false,
            volumeState: false,
            members: [memberB],
          },
        ],
      },
    })

    // Act
    await store.swapGroups(0, 1)

    // Assert — UI остаётся на optimistic swap, DTO не затирает.
    expect(store.getGroupByIndex(0)?.members).toEqual([memberB])
    expect(store.getGroupByIndex(1)?.members).toEqual([memberA])
  })
})
