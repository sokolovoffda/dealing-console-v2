import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { Contact } from '@/entities/contact'

import { PinnedCall, usePinnedCallsStore } from '../model/use-pinned-calls-store'

const mockContact: Contact = {
  groups: [],
  terminalPassword: '4LV3C$XRZ#',
  terminalLogin: '1574',
  internalNumber: '46355',
  id: '22215',
  pServed: '<sip:1234@ROOT>',
  imLogin: '1955',
  name: 'Mock User',
  groupIds: [],
}

const ORDER = 2
const PSERVED = '<sip:1234@ROOT>'

const mockPinnedCall = {
  pServed: PSERVED,
  slotIndex: 1,
  sessionId: 'session-1',
  title: 'Mock User',
  order: ORDER,
  micState: true,
  prevMicState: true,
  volume: 1,
  prevVolume: 1,
}

let mockDeviceMode: 'pushToTalk' | 'stateful' | undefined = undefined
let mockGoosePushToTalkState: boolean | undefined = undefined
let mockPttScope: 'standard' | 'activePinned' = 'standard'
const mockMute = vi.fn()
const mockUnmute = vi.fn()
const mockSetAudioPlayerVolume = vi.fn()
const mockUnhold = vi.fn()
const mockBindSessionToDevice = vi.fn()
const mockSetPreferences = vi.fn(() => Promise.resolve())
const mockCurrentDevice = ref<{ id: string } | null>(null)
const mockIsMuted = ref(false)
let mockCachedContact: Contact | undefined
let mockSession: {
  sessionId: 'session-1',
  mute: typeof mockMute
  unmute: typeof mockUnmute
  setAudioPlayerVolume: typeof mockSetAudioPlayerVolume
  unhold: typeof mockUnhold
  contact: Contact
  currentDevice: typeof mockCurrentDevice
  isMuted: typeof mockIsMuted
} | undefined = {
  sessionId: 'session-1',
  mute: mockMute,
  unmute: mockUnmute,
  setAudioPlayerVolume: mockSetAudioPlayerVolume,
  unhold: mockUnhold,
  contact: mockContact,
  currentDevice: mockCurrentDevice,
  isMuted: mockIsMuted,
}
const mockSecondSession = {
  ...mockSession,
  sessionId: 'session-2',
}
let mockHasSecondSessionForPServed = false

const createPinnedDevice = () => mockDeviceMode ? {
  id: 'device-1',
  type: 'goose',
  mode: mockDeviceMode,
  module: 'goose_L1',
  pttScope: mockPttScope,
} : undefined

vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => ({
      sessions: ref(new Map()),
      getSessionById: vi.fn().mockImplementation((sessionId: string) => {
        if (!mockSession) {
          return undefined
        }

        if (sessionId === 'session-2') {
          return mockSecondSession
        }

        return mockSession
      }),
      getSessionsByPServed: vi.fn().mockImplementation((pServed: string) => {
        if (!mockSession) {
          return []
        }

        if (pServed === PSERVED && mockHasSecondSessionForPServed) {
          return [mockSession, mockSecondSession]
        }

        return [{
          ...mockSession,
          sessionId: `session-${pServed}`,
          contact: {
            ...mockContact,
            pServed,
          },
        }]
      }),
      getPreferredSessionByPServed: vi.fn().mockImplementation((pServed: string) => {
        if (!mockSession) {
          return undefined
        }

        if (pServed === PSERVED) {
          return mockSession
        }

        return {
          ...mockSession,
          sessionId: `session-${pServed}`,
          contact: {
            ...mockContact,
            pServed,
          },
        }
      }),
    }),
    checkDtoByPServed: () => ({
      type: 'contact', dto: mockContact,
    }),
    resolveContactByPServed: () => Promise.resolve(mockCachedContact ?? mockContact),
    selectContact: () => undefined,
  }
})

vi.mock('@/entities/contact', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/contact')>()

  return {
    ...actual,
    useContactCachedStore: () => ({
      getLocalByPServed: () => mockCachedContact,
    }),
  }
})

vi.mock('@/entities/preference', () => ({
  usePreferencesStore: () => ({
    setPreferences: mockSetPreferences,
  }),
}))

vi.mock('@/shared/composables', () => {
  return {
    LogicalMediaDeviceTypeEnum: {
      GOOSE: 'goose',
      HANDSET: 'handset',
      HEADSET: 'headset',
      INPUT: 'input',
      OUTPUT: 'output',
      OTHER: 'other',
    },
    useDevicesStore: () => ({
      readyGooseDevices: ref(createPinnedDevice() ? [createPinnedDevice()] : []),
      readyQueueDevices: ref([]),
      getDeviceById: () => createPinnedDevice(),
    }),
    useDevicesSessionsStore: () => ({
      bindSessionToDevice: mockBindSessionToDevice,
      getGoosePushToTalkState: vi.fn().mockImplementation(() => mockGoosePushToTalkState),
      isGooseMicGloballyEnabled: vi.fn().mockImplementation((device) => {
        if (!device || device.type !== 'goose' || !device.module) {
          return true
        }

        if (mockGoosePushToTalkState !== undefined) {
          return mockGoosePushToTalkState
        }

        return device.mode !== 'pushToTalk'
      }),
    }),
    useAppStore: () => ({
      currentUser: vi.fn(),
    }),
  }
})

describe('callSession', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockDeviceMode = undefined
    mockGoosePushToTalkState = undefined
    mockPttScope = 'standard'
    mockHasSecondSessionForPServed = false
    mockCurrentDevice.value = null
    mockIsMuted.value = false
    mockMute.mockClear()
    mockUnmute.mockClear()
    mockSetAudioPlayerVolume.mockClear()
    mockUnhold.mockClear()
    mockBindSessionToDevice.mockClear()
    mockSetPreferences.mockClear()
    mockCachedContact = undefined
    mockSession = {
      sessionId: 'session-1',
      mute: mockMute,
      unmute: mockUnmute,
      setAudioPlayerVolume: mockSetAudioPlayerVolume,
      unhold: mockUnhold,
      contact: mockContact,
      currentDevice: mockCurrentDevice,
      isMuted: mockIsMuted,
    }
  })

  it('should find pinned conference by room GUID from SIP leg', () => {
    const store = usePinnedCallsStore()
    const roomGuid = '6C39E4BC911CEF28C46420700484A9EA'
    const confPServed = `<sip:ROOMS-${roomGuid}@ROOT>`

    store.loadByPreferences({
      1: {
        pServed: confPServed,
        title: 'Pinned Conference',
        volume: 1,
        prevVolume: 1,
        micState: true,
        prevMicState: true,
        order: 1,
      },
    } as unknown as Record<string, unknown>)

    // Act
    const pin = store.findPinnedConferenceByRoomNumber(roomGuid)

    // Assert
    expect(pin).toMatchObject({
      pServed: confPServed,
      title: 'Pinned Conference',
    })
  })

  it('should resolve live session by pServed when pinned slot has no sessionId', () => {
    const store = usePinnedCallsStore()

    store.loadByPreferences({
      1: {
        pServed: PSERVED,
        title: 'Mock User',
        volume: 1,
        prevVolume: 1,
        micState: true,
        prevMicState: true,
        order: 1,
        sessionId: null,
      },
    } as unknown as Record<string, unknown>)

    // Act
    const session = store.getSessionForPinnedCall(store.pinnedCalls.get(1) as PinnedCall)

    // Assert
    expect(session?.sessionId).toBe('session-1')
    expect(store.pinnedCalls.get(1)?.sessionId).toBe('session-1')
  })

  it('test addByPServed function', async () => {
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    const expected = store.pinnedCalls.get(ORDER)
    expect(expected).toEqual(mockPinnedCall)
  })

  it('test removeSelected function', async () => {
    const store = usePinnedCallsStore()
    store.addByPServed(`${PSERVED}`, ORDER)
    store.activePinnedCall = mockPinnedCall
    store.removeSelected()
    expect(store.activePinnedCall).toBeNull()
    expect(store.pinnedCalls.get(ORDER)).toBeNull()
  })

  it('test setActivePinnedCall function', async () => {
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    const expected = store.pinnedCalls.get(ORDER) as PinnedCall
    store.setActivePinnedCall(expected)
    expect(store.activePinnedCall).toEqual(expected)
  })

  it('should prefer resolved cached contact title over stale session contact title', () => {
    mockCachedContact = {
      ...mockContact,
      name: 'Directory User',
    }
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER)

    expect(store.pinnedCalls.get(ORDER)?.title).toBe('Directory User')
  })

  it('should use dto title immediately when adding from directory selection', () => {
    mockSession = undefined
    const store = usePinnedCallsStore()

    store.addByDto({
      pServed: PSERVED,
      name: 'Directory Selection User',
    }, ORDER)

    expect(store.pinnedCalls.get(ORDER)?.title).toBe('Directory Selection User')
  })

  it('test changeVolume function', async () => {
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)

    store.changeVolume(PSERVED, 0.4)
    const expected = store.pinnedCalls.get(ORDER) as PinnedCall
    expect(expected.volume).toEqual(0.4)
    expect(expected.prevVolume).toEqual(0.4)

    store.changeVolume(PSERVED, 0.4, 'mute')
    const expected2 = store.pinnedCalls.get(ORDER) as PinnedCall
    expect(expected2.volume).toEqual(0)
    expect(expected2.prevVolume).toEqual(0.4)
  })

  it('test changeGlobalVolumeMultiplier function', () => {
    const store = usePinnedCallsStore()
    store.changeGlobalVolumeMultiplier(0.7)
    expect(store.globalVolumeMultiplier).toBe(0.7)

    store.changeGlobalVolumeMultiplier(0.5)
    expect(store.globalVolumeMultiplier).toBe(0.5)
  })

  it('test toggleMicState function', async () => {
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    const expected = store.pinnedCalls.get(ORDER) as PinnedCall

    store.toggleMicState({ pServed: PSERVED, action: 'toggle' })
    expect([expected.micState, expected.prevMicState]).toEqual([false, false])

    store.toggleMicState({ pServed: PSERVED, action: 'set', value: true })
    expect([expected.micState, expected.prevMicState]).toEqual([true, true])

    store.toggleMicState({ pServed: PSERVED, action: 'mute-temp' })
    expect([expected.micState, expected.prevMicState]).toEqual([false, true])

    store.toggleMicState({ pServed: PSERVED, action: 'unmute-temp' })
    expect([expected.micState, expected.prevMicState]).toEqual([true, true])
  })

  it('should clear stale pinned calls when empty object preferences are loaded', () => {
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)

    store.loadByPreferences({})

    expect(store.pinnedCalls.get(ORDER)).toBeNull()
  })

  it('should clear stale pinned calls when empty array preferences are loaded', () => {
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)

    store.loadByPreferences([] as unknown as Record<string, unknown>)

    expect(store.pinnedCalls.get(ORDER)).toBeNull()
  })

  it('should keep active pinned call in sync when the same slot is updated', () => {
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)

    const selectedPin = store.pinnedCalls.get(ORDER) as PinnedCall
    store.setActivePinnedCall(selectedPin)

    store.addByPServed('<sip:4321@ROOT>', ORDER)

    expect(store.activePinnedCall?.pServed).toBe('<sip:4321@ROOT>')
    expect(store.activePinnedCall?.title).toBe('Mock User')
  })

  it('should expose next slot index for the same pServed', () => {
    const store = usePinnedCallsStore()

    store.updateSlot({
      ...mockPinnedCall,
      order: 1,
      slotIndex: 1,
    })
    store.updateSlot({
      ...mockPinnedCall,
      order: 2,
      slotIndex: 2,
    })

    expect(store.getNextSlotIndex(PSERVED)).toBe(3)
  })

  it('should normalize legacy pinned call data from preferences', () => {
    const store = usePinnedCallsStore()

    store.loadByPreferences({
      1: {
        pServed: PSERVED,
        title: 'Mock User',
        volume: 1,
        prevVolume: 1,
        micState: true,
        prevMicState: true,
        order: 1,
      },
    } as unknown as Record<string, unknown>)

    expect(store.pinnedCalls.get(1)).toEqual({
      pServed: PSERVED,
      slotIndex: 1,
      sessionId: null,
      title: 'Mock User',
      volume: 1,
      prevVolume: 1,
      micState: true,
      prevMicState: true,
      order: 1,
    })
  })

  it('should ignore persisted sessionId when loading pinned calls from preferences', () => {
    const store = usePinnedCallsStore()

    store.loadByPreferences({
      1: {
        ...mockPinnedCall,
        order: 1,
        slotIndex: 1,
        sessionId: 'stale-session-id',
      },
    } as unknown as Record<string, unknown>)

    expect(store.pinnedCalls.get(1)).toMatchObject({
      pServed: PSERVED,
      slotIndex: 1,
      sessionId: null,
    })
  })

  it('should not persist runtime sessionId in pinned call preferences', async () => {
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER, 'session-1')

    await Promise.resolve()

    expect(mockSetPreferences).toHaveBeenCalledWith(
      'pinnedCalls',
      expect.objectContaining({
        [ORDER]: expect.objectContaining({
          pServed: PSERVED,
          slotIndex: 1,
          sessionId: null,
        }),
      }),
    )
  })

  it('should create second slot for the same pServed when another session is pinned manually', () => {
    const store = usePinnedCallsStore()
    mockHasSecondSessionForPServed = true

    store.addByPServed(PSERVED, 1, 'session-1')
    store.addByPServed(PSERVED, 2, 'session-2')

    expect(store.pinnedCalls.get(1)).toMatchObject({
      pServed: PSERVED,
      slotIndex: 1,
      sessionId: 'session-1',
    })
    expect(store.pinnedCalls.get(2)).toMatchObject({
      pServed: PSERVED,
      slotIndex: 2,
      sessionId: 'session-2',
    })
  })

  it('should not create duplicate slot from book for the same pServed', () => {
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, 1)
    store.addByPServed(PSERVED, 2)

    expect(store.pinnedCalls.get(1)).toMatchObject({
      pServed: PSERVED,
      slotIndex: 1,
    })
    expect(store.pinnedCalls.get(2)).toBeNull()
  })

  it('should assign new incoming session to first free slot by pServed', () => {
    const store = usePinnedCallsStore()

    store.loadByPreferences({
      1: {
        ...mockPinnedCall,
        order: 1,
        slotIndex: 1,
        sessionId: null,
      },
      2: {
        ...mockPinnedCall,
        order: 2,
        slotIndex: 2,
        sessionId: null,
      },
    } as unknown as Record<string, unknown>)

    store.assignSessionToPinnedCall('session-incoming', PSERVED)

    expect(store.pinnedCalls.get(1)).toMatchObject({
      slotIndex: 1,
      sessionId: 'session-incoming',
    })
    expect(store.pinnedCalls.get(2)).toMatchObject({
      slotIndex: 2,
      sessionId: null,
    })
  })

  it('should clear session binding and keep reserved slot', () => {
    const store = usePinnedCallsStore()

    store.loadByPreferences({
      1: {
        ...mockPinnedCall,
        order: 1,
        slotIndex: 1,
        sessionId: 'session-incoming',
      },
    } as unknown as Record<string, unknown>)

    store.clearSessionIdFromPinnedCall('session-incoming')

    expect(store.pinnedCalls.get(1)).toMatchObject({
      pServed: PSERVED,
      slotIndex: 1,
      sessionId: null,
    })
  })

  it('should assign outgoing session to pinned slot by order', () => {
    const store = usePinnedCallsStore()

    store.loadByPreferences({
      2: {
        ...mockPinnedCall,
        order: 2,
        slotIndex: 2,
        sessionId: null,
      },
    } as unknown as Record<string, unknown>)

    store.assignSessionToPinnedCallByOrder('session-outgoing', 2)

    expect(store.pinnedCalls.get(2)).toMatchObject({
      order: 2,
      slotIndex: 2,
      sessionId: 'session-outgoing',
    })
  })
})

describe('toggleMicState with goose device state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockDeviceMode = undefined
    mockGoosePushToTalkState = undefined
    mockPttScope = 'standard'
    mockCurrentDevice.value = null
    mockIsMuted.value = false
    mockMute.mockClear()
    mockUnmute.mockClear()
    mockSetAudioPlayerVolume.mockClear()
    mockUnhold.mockClear()
  })

  it('should NOT call unmute when enabling mic in PTT mode', () => {
    mockDeviceMode = 'pushToTalk'
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    mockMute.mockClear()
    mockUnmute.mockClear()
    store.toggleMicState({ pServed: PSERVED, action: 'set', value: false })
    mockMute.mockClear()
    mockUnmute.mockClear()

    store.toggleMicState({ pServed: PSERVED, action: 'set', value: true })

    expect(mockUnmute).not.toHaveBeenCalled()
    const pin = store.pinnedCalls.get(ORDER) as PinnedCall
    expect(pin.micState).toBe(true)
  })

  it('should call mute when disabling mic in PTT mode', () => {
    mockDeviceMode = 'pushToTalk'
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    mockMute.mockClear()
    mockUnmute.mockClear()

    store.toggleMicState({ pServed: PSERVED, action: 'set', value: false })

    expect(mockMute).toHaveBeenCalled()
    const pin = store.pinnedCalls.get(ORDER) as PinnedCall
    expect(pin.micState).toBe(false)
  })

  it('should call unmute when enabling mic in stateful mode', () => {
    mockDeviceMode = 'stateful'
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    store.toggleMicState({ pServed: PSERVED, action: 'set', value: false })
    mockMute.mockClear()
    mockUnmute.mockClear()

    store.toggleMicState({ pServed: PSERVED, action: 'set', value: true })

    expect(mockUnmute).toHaveBeenCalled()
  })

  it('should call unmute when device mode is undefined', () => {
    mockDeviceMode = undefined
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    store.toggleMicState({ pServed: PSERVED, action: 'set', value: false })
    mockMute.mockClear()
    mockUnmute.mockClear()

    store.toggleMicState({ pServed: PSERVED, action: 'set', value: true })

    expect(mockUnmute).toHaveBeenCalled()
  })

  it('should update micState even in PTT mode when enabling', () => {
    mockDeviceMode = 'pushToTalk'
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)
    store.toggleMicState({ pServed: PSERVED, action: 'set', value: false })

    store.toggleMicState({ pServed: PSERVED, action: 'set', value: true })

    const pin = store.pinnedCalls.get(ORDER) as PinnedCall
    expect(pin.micState).toBe(true)
    expect(pin.prevMicState).toBe(true)
  })

  it('should keep both pinned lines muted in PTT mode until device becomes active', () => {
    mockDeviceMode = 'pushToTalk'
    const store = usePinnedCallsStore()
    const pServedA = '<sip:1234@ROOT>'
    const pServedB = '<sip:5678@ROOT>'
    const orderA = 1
    const orderB = 2

    store.addByPServed(pServedA, orderA)
    store.addByPServed(pServedB, orderB)
    mockMute.mockClear()
    mockUnmute.mockClear()

    store.toggleMicState({ pServed: pServedA, action: 'set', value: false })
    store.toggleMicState({ pServed: pServedB, action: 'set', value: true })

    expect(mockMute).toHaveBeenCalledTimes(2)
    expect(mockUnmute).not.toHaveBeenCalled()

    const pinA = store.pinnedCalls.get(orderA) as PinnedCall
    const pinB = store.pinnedCalls.get(orderB) as PinnedCall
    expect(pinA.micState).toBe(false)
    expect(pinB.micState).toBe(true)
  })

  it('should mute new pinned session when goose global mic is disabled in stateful mode', () => {
    mockDeviceMode = 'stateful'
    mockGoosePushToTalkState = false
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER)
    mockMute.mockClear()

    store.handlePinnedCallAutoMute(PSERVED, mockMute)

    expect(mockMute).toHaveBeenCalledTimes(1)
  })

  it('should not mute new pinned session when goose global mic is enabled in stateful mode', () => {
    mockDeviceMode = 'stateful'
    mockGoosePushToTalkState = true
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER)
    mockMute.mockClear()

    store.handlePinnedCallAutoMute(PSERVED, mockMute)

    expect(mockMute).not.toHaveBeenCalled()
  })

  it('should keep session muted when line is enabled in UI but goose is globally disabled', () => {
    mockDeviceMode = 'stateful'
    mockGoosePushToTalkState = false
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER)
    mockMute.mockClear()
    mockUnmute.mockClear()

    store.toggleMicState({ pServed: PSERVED, action: 'set', value: true })

    expect(mockUnmute).not.toHaveBeenCalled()
    expect(mockMute).toHaveBeenCalledTimes(1)
  })

  it('should preserve line micState after technical mute caused by disabled goose', () => {
    mockDeviceMode = 'stateful'
    mockGoosePushToTalkState = false
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER)
    store.toggleMicState({ pServed: PSERVED, action: 'set', value: true })
    store.syncPinnedCallMicStateBySession('session-1', true)

    const pin = store.pinnedCalls.get(ORDER) as PinnedCall
    expect(pin.micState).toBe(true)
    expect(pin.prevMicState).toBe(true)
  })

  it('should preserve line micState when new session is auto-muted by disabled goose', () => {
    mockDeviceMode = 'stateful'
    mockGoosePushToTalkState = false
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER, 'session-1')
    store.handlePinnedCallAutoMute('session-1', mockMute)
    store.syncPinnedCallMicStateBySession('session-1', true)

    const pin = store.pinnedCalls.get(ORDER) as PinnedCall
    expect(pin.micState).toBe(true)
    expect(pin.prevMicState).toBe(true)
  })

  it('should expose effective mic state only for active pinned line in activePinned PTT mode', () => {
    mockDeviceMode = 'pushToTalk'
    mockPttScope = 'activePinned'
    mockGoosePushToTalkState = true
    const store = usePinnedCallsStore()
    const pServedA = '<sip:1234@ROOT>'
    const pServedB = '<sip:5678@ROOT>'

    store.addByPServed(pServedA, 1)
    store.addByPServed(pServedB, 2)
    store.setActivePinnedCall(store.pinnedCalls.get(1) as PinnedCall)

    store.startActivePinnedPushToTalkOverride()

    expect(store.isPinnedCallMicEffective(pServedA)).toBe(true)
    expect(store.isPinnedCallMicEffective(pServedB)).toBe(false)
  })

  it('should keep selected activePinned line disabled until goose button is pressed', () => {
    mockDeviceMode = 'pushToTalk'
    mockPttScope = 'activePinned'
    mockGoosePushToTalkState = false
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER)
    store.setActivePinnedCall(store.pinnedCalls.get(ORDER) as PinnedCall)

    expect(store.isPinnedCallMicDisplayedEnabled(PSERVED)).toBe(false)

    store.startActivePinnedPushToTalkOverride()
    mockGoosePushToTalkState = true

    expect(store.isPinnedCallMicDisplayedEnabled(PSERVED)).toBe(true)

    mockGoosePushToTalkState = false
    store.stopActivePinnedPushToTalkOverride()

    expect(store.isPinnedCallMicDisplayedEnabled(PSERVED)).toBe(false)
  })

  it('should mute all pinned lines when activePinned PTT starts without selected pinned line', () => {
    mockDeviceMode = 'pushToTalk'
    mockPttScope = 'activePinned'
    const store = usePinnedCallsStore()
    const pServedA = '<sip:1234@ROOT>'
    const pServedB = '<sip:5678@ROOT>'

    store.addByPServed(pServedA, 1)
    store.addByPServed(pServedB, 2)

    store.startActivePinnedPushToTalkOverride()

    expect(store.isPinnedCallMicEffective(pServedA)).toBe(false)
    expect(store.isPinnedCallMicEffective(pServedB)).toBe(false)
  })

  it('should use handset session mute state when pinned call is moved away from selected goose', () => {
    mockDeviceMode = 'pushToTalk'
    const store = usePinnedCallsStore()

    store.addByPServed(PSERVED, ORDER)
    mockCurrentDevice.value = { id: 'handset-1' }
    mockIsMuted.value = false

    expect(store.isPinnedCallMicEffective(PSERVED)).toBe(true)

    mockIsMuted.value = true

    expect(store.isPinnedCallMicEffective(PSERVED)).toBe(false)
  })

  it('should move pinned session back to pinned device', () => {
    // Arrange
    mockDeviceMode = 'stateful'
    const store = usePinnedCallsStore()
    store.addByPServed(PSERVED, ORDER)

    // Act
    const result = store.moveSessionToPinnedDevice('session-1')

    // Assert
    expect(result).toBe(true)
    expect(mockBindSessionToDevice).toHaveBeenCalledWith('session-1', 'device-1')
    expect(mockUnmute).toHaveBeenCalled()
  })
})
