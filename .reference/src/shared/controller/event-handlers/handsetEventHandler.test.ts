import { vi } from 'vitest'
import { ref } from 'vue'

import { ControllerEvents, type IncomingControllerEvent } from '@/shared/controller/types'

import { handsetEventHandler } from './handsetEventHandler'

const mockBindSessionToDevice = vi.fn()
const mockBindSessionDeviceAffinity = vi.fn()
const mockUnbindSession = vi.fn()
const mockSetHandsetState = vi.fn()
const mockToggleMuteAllSessionsOnDevice = vi.fn()
const mockHangupHandsetHandler = vi.fn()
const mockOpenHandsetByDevice = vi.fn()
const mockInsertDialTextFromHandsetDevice = vi.fn(() => false)
const mockIsPinnedPanelSessionId = vi.fn((sessionId: string) => sessionId === 'session-pinned')

const mockGooseDevice = {
  id: 'goose_L1',
  module: 'goose_L1',
}

const mockPinnedSessionFacade = {
  sessionId: 'session-pinned',
  answer: vi.fn(),
  unmute: vi.fn(),
  terminate: vi.fn(),
  sessionState: ref('connected'),
  session: { connection: {} } as { connection: object | null },
}

const mockQueueSessionFacade = {
  sessionId: 'session-queue',
  answer: vi.fn(),
  unmute: vi.fn(),
  terminate: vi.fn(),
  sessionState: ref('ringing'),
}

const mockRegularSessionFacade = {
  sessionId: 'session-regular',
  answer: vi.fn(),
  unmute: vi.fn(),
  terminate: vi.fn(),
  sessionState: ref('connected'),
}

let mockActivePinnedCallSession: typeof mockPinnedSessionFacade | null = null
let mockFirstRingingSessionFromQueue: typeof mockQueueSessionFacade | null = null
let mockDeviceSessionsMap = new Map<string, string[]>()

const mockHandsetDevice = {
  controllerDeviceId: 'handset_L1',
  id: 'device-handset-1',
  module: 'handset_L1',
  inputId: 'input-handset-1',
  status: 'ready',
  enabled: true,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

const mockMainSettings = {
  openCallCardOnHandsetPickup: false,
  autoAnswerOnHandsetPickup: false,
}

vi.mock('@/entities/main-settings', () => ({
  useMainSettingsStore: () => ({
    settings: mockMainSettings,
  }),
}))

vi.mock('@/entities/call-session', () => ({
  STATE: {
    CONNECTED: 'connected',
    PROGRESS: 'progress',
    RINGING: 'ringing',
  },
  usePinnedCallsStore: () => ({
    activePinnedCallSession: mockActivePinnedCallSession,
  }),
  useSessionStore: () => ({
    getFirstRingingSessionFromQueue: vi.fn(() => mockFirstRingingSessionFromQueue),
    getSessionById: vi.fn((sessionId: string) => {
      if (sessionId === 'session-pinned') {
        return mockPinnedSessionFacade
      }

      if (sessionId === 'session-regular') {
        return mockRegularSessionFacade
      }

      if (sessionId === 'session-queue') {
        return mockQueueSessionFacade
      }

      return undefined
    }),
  }),
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    isPinnedPanelSessionId: mockIsPinnedPanelSessionId,
  }),
}))

vi.mock('@/features/call-card', () => ({
  useCallCardStore: () => ({
    insertDialTextFromHandsetDevice: mockInsertDialTextFromHandsetDevice,
    openHandsetByDevice: mockOpenHandsetByDevice,
  }),
}))

vi.mock('@/shared/composables', () => ({
  isUsableForMediaDevice: (device: { status?: string, enabled?: boolean } | null | undefined) =>
    Boolean(device && device.status === 'ready' && device.enabled),
  notifyMediaDeviceUnavailableForCall: vi.fn(),
  useDevicesStore: () => ({
    getDeviceById: vi.fn((id: string) => id === mockHandsetDevice.id ? mockHandsetDevice : undefined),
    getDeviceByModule: vi.fn((module: string) => module === mockHandsetDevice.module ? mockHandsetDevice : undefined),
    handsetDevices: [mockHandsetDevice],
    readyGooseDevices: [mockGooseDevice],
    readyPreferredGoose: mockGooseDevice,
  }),
  useDevicesSessionsStore: () => ({
    bindSessionDeviceAffinity: mockBindSessionDeviceAffinity,
    bindSessionToDevice: mockBindSessionToDevice,
    devicesSession: mockDeviceSessionsMap,
    getActiveSessionOnDevice: vi.fn(),
    getDeviceSessionKey: vi.fn((device) => device.module ?? device.controllerDeviceId ?? device.id),
    getHandsetStateByDevice: vi.fn(() => 'pickup'),
    unbindSession: mockUnbindSession,
    setHandsetState: mockSetHandsetState,
    toggleMuteAllSessionsOnDevice: mockToggleMuteAllSessionsOnDevice,
  }),
}))

vi.mock('@/shared/controller', () => ({
  useHandsetPickupHangupHandler: () => ({
    hangupHandsetHandler: mockHangupHandsetHandler,
  }),
}))

const createHandsetEvent = (name: ControllerEvents.PICKUP | ControllerEvents.HANGUP): IncomingControllerEvent<'handset'> => ({
  message: null,
  model: 'event' as const,
  name,
  sender: 'handset_L1',
  target: 'handset_L1:handset' as never,
  timestamp: '2026-05-12T10:00:00.000Z',
  uid: 'test-event',
  version: '1.0',
})

describe('handsetEventHandler', () => {
  beforeEach(() => {
    mockActivePinnedCallSession = null
    mockFirstRingingSessionFromQueue = null
    mockDeviceSessionsMap = new Map()
    mockMainSettings.openCallCardOnHandsetPickup = false
    mockMainSettings.autoAnswerOnHandsetPickup = false

    mockBindSessionToDevice.mockClear()
    mockBindSessionDeviceAffinity.mockClear()
    mockUnbindSession.mockClear()
    mockSetHandsetState.mockClear()
    mockToggleMuteAllSessionsOnDevice.mockClear()
    mockHangupHandsetHandler.mockClear()
    mockOpenHandsetByDevice.mockClear()
    mockInsertDialTextFromHandsetDevice.mockClear()
    mockIsPinnedPanelSessionId.mockClear()
    mockIsPinnedPanelSessionId.mockImplementation((sessionId: string) => sessionId === 'session-pinned')

    mockPinnedSessionFacade.answer.mockClear()
    mockPinnedSessionFacade.unmute.mockClear()
    mockPinnedSessionFacade.terminate.mockClear()
    mockPinnedSessionFacade.sessionState.value = 'connected'
    mockPinnedSessionFacade.session.connection = {}

    mockQueueSessionFacade.answer.mockClear()
    mockQueueSessionFacade.unmute.mockClear()
    mockQueueSessionFacade.terminate.mockClear()
    mockQueueSessionFacade.sessionState.value = 'ringing'

    mockRegularSessionFacade.answer.mockClear()
    mockRegularSessionFacade.unmute.mockClear()
    mockRegularSessionFacade.terminate.mockClear()
    mockRegularSessionFacade.sessionState.value = 'connected'
  })

  it('should bind active pinned session to handset on pickup', () => {
    // Arrange
    mockActivePinnedCallSession = mockPinnedSessionFacade

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.PICKUP))

    // Assert
    expect(mockBindSessionToDevice).toHaveBeenCalledWith('session-pinned', 'device-handset-1')
    expect(mockPinnedSessionFacade.unmute).toHaveBeenCalled()
    expect(mockQueueSessionFacade.answer).not.toHaveBeenCalled()
  })

  it('should answer first queue session on pickup when autoAnswerOnHandsetPickup is enabled', () => {
    // Arrange
    mockFirstRingingSessionFromQueue = mockQueueSessionFacade
    mockMainSettings.autoAnswerOnHandsetPickup = true

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.PICKUP))

    // Assert
    expect(mockQueueSessionFacade.answer).toHaveBeenCalled()
    expect(mockBindSessionToDevice).not.toHaveBeenCalled()
  })

  it('should not answer queue session on pickup when autoAnswerOnHandsetPickup is disabled', () => {
    // Arrange
    mockFirstRingingSessionFromQueue = mockQueueSessionFacade
    mockMainSettings.autoAnswerOnHandsetPickup = false

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.PICKUP))

    // Assert
    expect(mockQueueSessionFacade.answer).not.toHaveBeenCalled()
  })

  it('should open call card on pickup when openCallCardOnHandsetPickup is enabled', () => {
    // Arrange
    mockMainSettings.openCallCardOnHandsetPickup = true

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.PICKUP))

    // Assert
    expect(mockOpenHandsetByDevice).toHaveBeenCalledWith(mockHandsetDevice)
  })

  it('should not open call card on pickup when openCallCardOnHandsetPickup is disabled', () => {
    // Arrange
    mockMainSettings.openCallCardOnHandsetPickup = false

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.PICKUP))

    // Assert
    expect(mockOpenHandsetByDevice).not.toHaveBeenCalled()
  })

  it('should move connected pinned session back to goose with full bind on hangup', () => {
    // Arrange
    mockDeviceSessionsMap = new Map([['handset_L1', ['session-pinned']]])
    mockPinnedSessionFacade.session.connection = {}
    mockPinnedSessionFacade.sessionState.value = 'connected'

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.HANGUP))

    // Assert
    expect(mockBindSessionToDevice).toHaveBeenCalledWith('session-pinned', 'goose_L1', {
      holdOthers: false,
    })
    expect(mockBindSessionDeviceAffinity).not.toHaveBeenCalled()
    expect(mockPinnedSessionFacade.terminate).not.toHaveBeenCalled()
    expect(mockUnbindSession).not.toHaveBeenCalled()
  })

  it('should move pinned session without peerconnection back to goose affinity on hangup', () => {
    // Arrange
    mockDeviceSessionsMap = new Map([['handset_L1', ['session-pinned']]])
    mockPinnedSessionFacade.session.connection = null
    mockPinnedSessionFacade.sessionState.value = 'ringing'

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.HANGUP))

    // Assert
    expect(mockBindSessionDeviceAffinity).toHaveBeenCalledWith('session-pinned', 'goose_L1')
    expect(mockBindSessionToDevice).not.toHaveBeenCalled()
    expect(mockPinnedSessionFacade.terminate).not.toHaveBeenCalled()
  })

  it('should terminate regular handset session on hangup', () => {
    // Arrange
    mockDeviceSessionsMap = new Map([['handset_L1', ['session-regular']]])

    // Act
    handsetEventHandler(createHandsetEvent(ControllerEvents.HANGUP))

    // Assert
    expect(mockUnbindSession).toHaveBeenCalledWith('session-regular')
    expect(mockRegularSessionFacade.terminate).toHaveBeenCalled()
    expect(mockBindSessionDeviceAffinity).not.toHaveBeenCalled()
  })
})
