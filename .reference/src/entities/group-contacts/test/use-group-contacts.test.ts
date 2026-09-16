import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import type { PinnedCall } from '@/entities/call-session'

import { useGroupContactsStore } from '../model/use-group-contacts'

const {
  togglePinnedCallMicState,
  changePinnedCallVolume,
  savePreferencesOnServer,
} = vi.hoisted(() => ({
  togglePinnedCallMicState: vi.fn(),
  changePinnedCallVolume: vi.fn(),
  savePreferencesOnServer: vi.fn(),
}))

const createPinnedCall = (overrides: Partial<PinnedCall> = {}): PinnedCall => ({
  micState: true,
  prevMicState: false,
  prevVolume: 0.4,
  volume: 1,
  title: 'title',
  order: 1,
  pServed: 'pServed 1',
  slotIndex: 1,
  sessionId: null,
  ...overrides,
})

vi.mock('@/entities/preference', () => {
  return {
    usePreferencesStore: () => {
      return {
        setPreferences: () => Promise.resolve(),
      }
    },
  }
})

vi.mock('@/entities/call-session', () => {
  const createMockPinnedCall = (overrides: Partial<PinnedCall> = {}): PinnedCall => ({
    micState: true,
    prevMicState: false,
    prevVolume: 0.4,
    volume: 1,
    title: 'title',
    order: 1,
    pServed: 'pServed 1',
    slotIndex: 1,
    sessionId: null,
    ...overrides,
  })
  const pinnedCalls = new Map<number, null | PinnedCall>([
    [1, null],
    [2, createMockPinnedCall({ order: 2, pServed: 'pServed 1', slotIndex: 1, title: 'title 1' })],
    [3, createMockPinnedCall({ order: 3, pServed: 'pServed 1', slotIndex: 2, title: 'title 2', prevVolume: 0.5, volume: 0.9 })],
    [4, createMockPinnedCall({ order: 4, pServed: 'pServed 2', slotIndex: 1, title: 'title 3', prevVolume: 0.42 })],
  ])

  return {
    usePinnedCallsStore: () => {
      return {
        pinnedCalls,
        getPinnedCallBySlotMember: ({ pServed, slotIndex }: { pServed: string, slotIndex: number }) => {
          return Array.from(pinnedCalls.values()).find((pin) => {
            return pin?.pServed === pServed && (pin.slotIndex ?? 1) === slotIndex
          })
        },
        togglePinnedCallMicState,
        changePinnedCallVolume,
        savePreferencesOnServer,
      }
    },
  }
})

describe('useGroupContactsStore', () => {
  beforeEach(() => {
    // Arrange
    setActivePinia(createPinia())
    togglePinnedCallMicState.mockClear()
    changePinnedCallVolume.mockClear()
    savePreferencesOnServer.mockClear()
  })

  it('adds different slots of one pServed as separate group members and removes exact slot', () => {
    // Arrange
    const GROUP_IDX = 2
    const store = useGroupContactsStore()

    // Act
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 2, pServed: 'pServed 1', slotIndex: 1 }))
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 3, pServed: 'pServed 1', slotIndex: 2 }))
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 4, pServed: 'pServed 2', slotIndex: 1 }))

    // Assert
    expect(store.getGroupByIdx(GROUP_IDX)?.members).toEqual([
      { pServed: 'pServed 1', slotIndex: 1 },
      { pServed: 'pServed 1', slotIndex: 2 },
      { pServed: 'pServed 2', slotIndex: 1 },
    ])

    // Act
    store.removeContact(GROUP_IDX, { pServed: 'pServed 1', slotIndex: 2 })

    // Assert
    expect(store.getGroupByIdx(GROUP_IDX)?.members).toEqual([
      { pServed: 'pServed 1', slotIndex: 1 },
      { pServed: 'pServed 2', slotIndex: 1 },
    ])
  })

  it('removes only selected slot from all groups and preserves sibling slot', () => {
    // Arrange
    const store = useGroupContactsStore()
    store.addPinnedCall(1, createPinnedCall({ order: 2, pServed: 'pServed 1', slotIndex: 1 }))
    store.addPinnedCall(2, createPinnedCall({ order: 3, pServed: 'pServed 1', slotIndex: 2 }))

    // Act
    store.removeFromAllGroups(createPinnedCall({ order: 2, pServed: 'pServed 1', slotIndex: 1 }))

    // Assert
    expect(store.getGroupByIdx(1)?.members).toEqual([])
    expect(store.getGroupByIdx(2)?.members).toEqual([{ pServed: 'pServed 1', slotIndex: 2 }])
  })

  it('normalizes legacy group preferences to slotIndex 1', () => {
    // Arrange
    const store = useGroupContactsStore()

    // Act
    store.loadByPreferences({
      1: {
        micState: false,
        volumeState: true,
        members: ['pServed 1'],
      },
    })

    // Assert
    expect(store.getGroupByIdx(1)?.members).toEqual([{ pServed: 'pServed 1', slotIndex: 1 }])
  })

  it('toggles microphone for every slot member in the group', () => {
    // Arrange
    const GROUP_IDX = 2
    const store = useGroupContactsStore()
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 2, pServed: 'pServed 1', slotIndex: 1 }))
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 3, pServed: 'pServed 1', slotIndex: 2 }))
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 4, pServed: 'pServed 2', slotIndex: 1 }))
    togglePinnedCallMicState.mockClear()

    // Act
    store.toggleMicForGroup(GROUP_IDX, false)

    // Assert
    expect(store.getGroupByIdx(GROUP_IDX)?.micState).toBe(false)
    expect(togglePinnedCallMicState).toHaveBeenCalledTimes(3)
    expect(togglePinnedCallMicState).toHaveBeenCalledWith({ order: 2, action: 'mute-temp', value: false, updatePrefs: false })
    expect(togglePinnedCallMicState).toHaveBeenCalledWith({ order: 3, action: 'mute-temp', value: false, updatePrefs: false })
    expect(togglePinnedCallMicState).toHaveBeenCalledWith({ order: 4, action: 'mute-temp', value: false, updatePrefs: false })
  })

  it('toggles volume for every slot member in the group', () => {
    // Arrange
    const GROUP_IDX = 2
    const store = useGroupContactsStore()
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 2, pServed: 'pServed 1', slotIndex: 1 }))
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 3, pServed: 'pServed 1', slotIndex: 2 }))
    store.addPinnedCall(GROUP_IDX, createPinnedCall({ order: 4, pServed: 'pServed 2', slotIndex: 1 }))
    changePinnedCallVolume.mockClear()

    // Act
    store.toggleVolumeForGroup(GROUP_IDX, false)

    // Assert
    expect(store.getGroupByIdx(GROUP_IDX)?.volumeState).toBe(false)
    expect(changePinnedCallVolume).toHaveBeenCalledTimes(3)
    expect(changePinnedCallVolume).toHaveBeenCalledWith({ order: 2, volume: 0, temp: 'mute', updatePrefs: false })
    expect(changePinnedCallVolume).toHaveBeenCalledWith({ order: 3, volume: 0, temp: 'mute', updatePrefs: false })
    expect(changePinnedCallVolume).toHaveBeenCalledWith({ order: 4, volume: 0, temp: 'mute', updatePrefs: false })
  })

  it('resets groups and edit mode on logout', () => {
    // Arrange
    const store = useGroupContactsStore()
    store.addPinnedCall(2, createPinnedCall({ order: 2, pServed: 'pServed 1', slotIndex: 1 }))
    store.isEditMode = true

    // Act
    store.$reset()

    // Assert
    expect(store.groupContacts.size).toBe(7)
    expect(store.getGroupByIdx(0)).toEqual({ micState: true, volumeState: true, members: [] })
    expect(store.getGroupByIdx(2)).toEqual({ micState: false, volumeState: false, members: [] })
    expect(store.isEditMode).toBe(false)
  })
})
