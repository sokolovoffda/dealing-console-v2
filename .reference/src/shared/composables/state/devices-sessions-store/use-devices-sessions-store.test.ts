import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { LogicalMediaDeviceTypeEnum } from '@/shared/composables'
import { ControllerEvents } from '@/shared/controller/types'

import { useDevicesStore } from '../devices-store'
import { type LogicalMediaDevice } from '../devices-store/types'

import { useDevicesSessionsStore } from './use-devices-sessions-store'

const mocks = vi.hoisted(() => ({
  getSessionById: vi.fn(),
}))

vi.mock('@/entities/call-session', () => ({
  STATE: {
    CONNECTED: 'connected',
    PROGRESS: 'progress',
  },
  useSessionStore: () => ({
    getSessionById: mocks.getSessionById,
  }),
}))

const createDevice = (
  override: Partial<LogicalMediaDevice> = {},
): LogicalMediaDevice => ({
  autoGainControl: true,
  controllerDeviceId: 'goose_L1',
  echoCancellation: true,
  enabled: true,
  hasInput: true,
  hasOutput: false,
  icon: 'micSpeaker',
  iconNumber: '1',
  id: 'goose_L1',
  inputId: 'input-id',
  inputLabel: 'Module_L1',
  mode: 'stateful',
  module: 'goose_L1',
  name: 'Goose 1',
  noiseSuppression: true,
  order: 1,
  origin: 'controller',
  pttScope: 'standard',
  status: 'ready',
  type: LogicalMediaDeviceTypeEnum.GOOSE,
  volume: 50,
  ...override,
})

const createSession = () => ({
  currentDevice: ref<LogicalMediaDevice | null>(null),
  isMuted: ref(false),
  isOnHold: () => ({ local: false }),
  localStream: ref(null),
  mute: vi.fn(),
  number: '100',
  pServed: '<sip:100@ROOT>',
  session: {
    connection: undefined,
    isMuted: () => ({ audio: false }),
    isOnHold: () => ({ local: false }),
  },
  sessionId: 'session-1',
  sessionState: ref('connected'),
  setAudioPlayerVolume: vi.fn(),
  setCurrentDevice: vi.fn(),
  toggleHold: vi.fn(),
  unmute: vi.fn(),
})

describe('useDevicesSessionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.getSessionById.mockReset()
  })

  it('binds session to ready logical device runtime key', () => {
    const device = createDevice()
    const session = createSession()
    const devicesStore = useDevicesStore()
    const store = useDevicesSessionsStore()

    devicesStore.setDevices([device])
    mocks.getSessionById.mockReturnValue(session)

    store.bindSessionToDevice('session-1', 'goose_L1')

    expect(store.devicesSession.get('goose_L1')).toEqual(['session-1'])
    expect(session.setCurrentDevice).toHaveBeenCalledWith(device)
  })

  it('affinity bind sets currentDevice without holding other sessions', () => {
    // Arrange
    const handset = createDevice({
      controllerDeviceId: 'handset_L2',
      hasOutput: true,
      id: 'handset_L2',
      module: 'handset_L2',
      name: 'Handset 1',
      outputId: 'output-id',
      outputLabel: 'Module_L2',
      type: LogicalMediaDeviceTypeEnum.HANDSET,
    })
    const connectedSession = createSession()
    const ringingSession = {
      ...createSession(),
      sessionId: 'session-ringing',
      sessionState: ref('progress'),
      setCurrentDevice: vi.fn(),
      toggleHold: vi.fn(),
    }
    const devicesStore = useDevicesStore()
    const store = useDevicesSessionsStore()

    devicesStore.setDevices([handset])
    mocks.getSessionById.mockImplementation((sessionId: string) => {
      if (sessionId === 'session-1') return connectedSession
      if (sessionId === 'session-ringing') return ringingSession

      return undefined
    })

    store.bindSessionToDevice('session-1', 'handset_L2')
    connectedSession.toggleHold.mockClear()
    connectedSession.setCurrentDevice.mockClear()

    // Act
    store.bindSessionDeviceAffinity('session-ringing', 'handset_L2')

    // Assert
    expect(store.devicesSession.get('handset_L2')).toEqual([
      'session-1',
      'session-ringing',
    ])
    expect(ringingSession.setCurrentDevice).toHaveBeenCalledWith(handset)
    expect(connectedSession.toggleHold).not.toHaveBeenCalled()
  })

  it('does not bind session to missing logical device', () => {
    const devicesStore = useDevicesStore()
    const store = useDevicesSessionsStore()

    devicesStore.setDevices([createDevice({
      inputId: undefined,
      status: 'missing',
    })])

    store.bindSessionToDevice('session-1', 'goose_L1')

    expect(store.devicesSession.size).toBe(0)
  })

  it('uses goose push-to-talk state as global mic switch', () => {
    const store = useDevicesSessionsStore()
    const device = createDevice({
      mode: 'pushToTalk',
    })

    expect(store.isGooseMicGloballyEnabled(device)).toBe(false)

    store.setGoosePushToTalkState({
      device: 'goose_L1',
      state: true,
    })

    expect(store.isGooseMicGloballyEnabled(device)).toBe(true)
  })

  it('silences handset session while on-hook and restores audio on pickup', () => {
    // Arrange
    const handset = createDevice({
      controllerDeviceId: 'handset_L2',
      hasOutput: true,
      id: 'handset_L2',
      module: 'handset_L2',
      name: 'Handset 1',
      origin: 'controller',
      outputId: 'output-id',
      outputLabel: 'Module_L2',
      type: LogicalMediaDeviceTypeEnum.HANDSET,
    })
    const session = createSession()
    session.currentDevice.value = handset
    const devicesStore = useDevicesStore()
    const store = useDevicesSessionsStore()

    devicesStore.setDevices([handset])
    mocks.getSessionById.mockReturnValue(session)
    store.bindSessionToDevice('session-1', 'handset_L2')
    session.mute.mockClear()
    session.unmute.mockClear()
    session.setAudioPlayerVolume.mockClear()

    // Act — лежачая трубка (default hangup for controller)
    store.applyStoredHandsetAudioStateToSession(session as never)

    // Assert
    expect(store.isHandsetOffHook(handset)).toBe(false)
    expect(session.mute).toHaveBeenCalled()
    expect(session.setAudioPlayerVolume).toHaveBeenCalledWith(0)

    // Act — сняли трубку
    session.mute.mockClear()
    session.unmute.mockClear()
    session.setAudioPlayerVolume.mockClear()
    store.setHandsetState({
      device: 'handset_L2',
      state: ControllerEvents.PICKUP,
    })

    // Assert
    expect(store.isHandsetOffHook(handset)).toBe(true)
    expect(session.unmute).toHaveBeenCalled()
    expect(session.setAudioPlayerVolume).toHaveBeenCalledWith(1)
  })
})
