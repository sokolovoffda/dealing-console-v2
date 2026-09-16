import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import {
  PINNED_CALLS_INITIAL_MIC_STATE,
  PINNED_CALLS_INITIAL_VOLUME,
} from './types'
import { usePinnedCallsPanelStore } from './use-pinned-calls-panel-store'

const mocks = vi.hoisted(() => ({
  updatePinnedCallGroup: vi.fn(),
  addPinnedCallGroupMember: vi.fn(),
  fetchPinnedCallsPanel: vi.fn(),
}))

vi.mock('../api/use-pinned-calls-api', () => ({
  usePinnedCallsApi: () => ({
    updatePinnedCallGroup: mocks.updatePinnedCallGroup,
    addPinnedCallGroupMember: mocks.addPinnedCallGroupMember,
    fetchPinnedCallsPanel: mocks.fetchPinnedCallsPanel,
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

const slotA = {
  order: 0,
  pServed: memberA.pServed,
  slotIndex: memberA.slotIndex,
  title: 'A',
  volume: 0.3,
  prevVolume: 0.3,
  micState: PINNED_CALLS_INITIAL_MIC_STATE,
  prevMicState: PINNED_CALLS_INITIAL_MIC_STATE,
}

const slotB = {
  order: 1,
  pServed: memberB.pServed,
  slotIndex: memberB.slotIndex,
  title: 'B',
  volume: 0.2,
  prevVolume: 0.2,
  micState: PINNED_CALLS_INITIAL_MIC_STATE,
  prevMicState: PINNED_CALLS_INITIAL_MIC_STATE,
}

describe('usePinnedCallsPanelStore sync group audio on membership change (WUI-5615)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.updatePinnedCallGroup.mockReset()
    mocks.addPinnedCallGroupMember.mockReset()
    mocks.fetchPinnedCallsPanel.mockReset()
  })

  it('should sync all current members mic/volume after updateGroup', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [{ ...slotA }, { ...slotB }],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA],
        },
      ],
    }

    mocks.updatePinnedCallGroup.mockResolvedValue({
      data: {
        index: 0,
        micState: true,
        volumeState: true,
        members: [memberA, memberB],
      },
    })

    // Act
    await store.updateGroup(0, {
      micState: true,
      volumeState: true,
      members: [memberA, memberB],
    })

    // Assert
    expect(store.getSlotByOrder(0)?.micState).toBe(true)
    expect(store.getSlotByOrder(0)?.volume).toBe(PINNED_CALLS_INITIAL_VOLUME)
    expect(store.getSlotByOrder(1)?.micState).toBe(true)
    expect(store.getSlotByOrder(1)?.volume).toBe(PINNED_CALLS_INITIAL_VOLUME)
  })

  it('should sync all current members after addGroupMember', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [{ ...slotA }, { ...slotB }],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: false,
          members: [memberA],
        },
      ],
    }
    store.patchSlotRuntimeAudio(0, { micState: true, volume: 0.5 })

    mocks.addPinnedCallGroupMember.mockResolvedValue({
      data: {
        index: 0,
        micState: true,
        volumeState: false,
        members: [memberA, memberB],
      },
    })

    // Act
    await store.addGroupMember(0, memberB)

    // Assert — mute группы → volume 0 у всех текущих members
    expect(store.getSlotByOrder(0)?.micState).toBe(true)
    expect(store.getSlotByOrder(0)?.volume).toBe(0)
    expect(store.getSlotByOrder(1)?.micState).toBe(true)
    expect(store.getSlotByOrder(1)?.volume).toBe(0)
  })

  it('should not change audio of a slot removed from the group', async () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [{ ...slotA }, { ...slotB }],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA, memberB],
        },
      ],
    }
    store.patchSlotRuntimeAudio(0, { micState: true, volume: 0.4 })
    store.patchSlotRuntimeAudio(1, { micState: true, volume: 0.6 })

    mocks.updatePinnedCallGroup.mockResolvedValue({
      data: {
        index: 0,
        micState: true,
        volumeState: true,
        members: [memberB],
      },
    })

    // Act — убрали A, остался B
    await store.updateGroup(0, {
      micState: true,
      volumeState: true,
      members: [memberB],
    })

    // Assert — A вне группы, runtime не трогаем; B выровнен под intent
    expect(store.getSlotByOrder(0)?.micState).toBe(true)
    expect(store.getSlotByOrder(0)?.volume).toBe(0.4)
    expect(store.getSlotByOrder(1)?.micState).toBe(true)
    expect(store.getSlotByOrder(1)?.volume).toBe(PINNED_CALLS_INITIAL_VOLUME)
  })
})

describe('usePinnedCallsPanelStore card ↔ group (WUI-5615 variant A)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should change only the slot when card patches mic/volume and leave group intent alone', () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [
        { ...slotA, micState: true, volume: 0.8 },
        { ...slotB, micState: true, volume: 0.8 },
      ],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA, memberB],
        },
      ],
    }

    // Act — локальный drift с карточки слота A (как handleSlotMicClick / volume)
    store.patchSlotRuntimeAudio(0, { micState: false, volume: 0.1 })

    // Assert — только A; B и intent группы без изменений
    expect(store.getSlotByOrder(0)?.micState).toBe(false)
    expect(store.getSlotByOrder(0)?.volume).toBe(0.1)
    expect(store.getSlotByOrder(1)?.micState).toBe(true)
    expect(store.getSlotByOrder(1)?.volume).toBe(0.8)
    expect(store.getGroupByIndex(0)?.micState).toBe(true)
    expect(store.getGroupByIndex(0)?.volumeState).toBe(true)
  })

  it('should re-apply group intent to all current members on next group action after card drift', () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [
        { ...slotA, micState: true, volume: 0.8 },
        { ...slotB, micState: true, volume: 0.8 },
      ],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA, memberB],
        },
      ],
    }
    store.patchSlotRuntimeAudio(0, { micState: false, volume: 0.1 })

    // Act — следующее действие футера группы
    store.applyGroupAudioToMembers(0, { micState: true, volumeState: true })

    // Assert — drift A сброшен group override’ом
    expect(store.getSlotByOrder(0)?.micState).toBe(true)
    expect(store.getSlotByOrder(0)?.volume).toBe(PINNED_CALLS_INITIAL_VOLUME)
    expect(store.getSlotByOrder(1)?.micState).toBe(true)
    expect(store.getSlotByOrder(1)?.volume).toBe(PINNED_CALLS_INITIAL_VOLUME)
    expect(store.getGroupByIndex(0)?.micState).toBe(true)
    expect(store.getGroupByIndex(0)?.volumeState).toBe(true)
  })
})

describe('usePinnedCallsPanelStore sync on fetch / session assign (WUI-5615)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.fetchPinnedCallsPanel.mockReset()
  })

  it('should sync member slots to group intent after fetchPanel', async () => {
    // Arrange — как после reload: group mic on, slot mic default off
    mocks.fetchPinnedCallsPanel.mockResolvedValue({
      data: {
        schemaVersion: 1,
        groupsLayout: 4,
        slots: [
          {
            order: 1,
            pServed: memberA.pServed,
            slotIndex: memberA.slotIndex,
            title: 'A',
            volume: 0.3,
            prevVolume: 0.3,
            micState: true,
            prevMicState: true,
          },
        ],
        groups: [
          {
            index: 0,
            micState: true,
            volumeState: true,
            members: [memberA],
          },
        ],
      },
    })

    const store = usePinnedCallsPanelStore()

    // Act
    await store.fetchPanel(true)

    // Assert — normalize сбрасывает mic слота в false, sync поднимает под группу
    expect(store.getSlotByOrder(1)?.micState).toBe(true)
    expect(store.getSlotByOrder(1)?.volume).toBe(PINNED_CALLS_INITIAL_VOLUME)
    expect(store.getGroupByIndex(0)?.micState).toBe(true)
  })

  it('should apply group intent to slot when assigning a session', () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [{ ...slotA }],
      groupsLayout: 4,
      groups: [
        {
          index: 0,
          micState: true,
          volumeState: true,
          members: [memberA],
        },
      ],
    }

    // Act — dial bind: слот ещё с default mic off
    const bound = store.assignSessionToSlot(0, 'session-1')

    // Assert
    expect(bound?.micState).toBe(true)
    expect(bound?.volume).toBe(PINNED_CALLS_INITIAL_VOLUME)
    expect(store.getSlotByOrder(0)?.micState).toBe(true)
    expect(store.slotSessionIds.get(0)).toBe('session-1')
  })

  it('should not change slot audio on assign when slot is not in any group', () => {
    // Arrange
    const store = usePinnedCallsPanelStore()
    store.panel = {
      schemaVersion: 1,
      slots: [{ ...slotA }],
      groupsLayout: 4,
      groups: [],
    }

    // Act
    store.assignSessionToSlot(0, 'session-2')

    // Assert — дефолты слота без группы
    expect(store.getSlotByOrder(0)?.micState).toBe(PINNED_CALLS_INITIAL_MIC_STATE)
    expect(store.getSlotByOrder(0)?.volume).toBe(0.3)
  })
})
