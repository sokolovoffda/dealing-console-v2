import { createPinia, setActivePinia } from 'pinia'

import {
  controllerMediaDevice,
  realMediaDevice,
} from '@/__mocks_/mock-media-devices'

import {
  LogicalMediaDeviceTypeEnum,
  type ControllerMediaModule,
} from './types'
import { useDevicesStore } from './use-devices-store'

describe('useDevicesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('builds ready logical controller devices from modules and browser endpoints', () => {
    const store = useDevicesStore()

    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    expect(store.readyGooseDevices).toHaveLength(2)
    expect(store.readyHandsetDevices).toHaveLength(2)

    expect(store.getDeviceByModule('hub')).toMatchObject({
      id: 'hub',
      name: 'Основной динамик',
      hasInput: false,
      hasOutput: true,
      outputLabel: 'Main',
      origin: 'controller',
      status: 'ready',
      type: LogicalMediaDeviceTypeEnum.MAIN,
    })
    expect(store.getDeviceByModule('goose_L1')).toMatchObject({
      id: 'goose_L1',
      inputLabel: 'Module_L1',
      status: 'ready',
      type: LogicalMediaDeviceTypeEnum.GOOSE,
    })
    expect(store.getDeviceByModule('handset_L2')).toMatchObject({
      id: 'handset_L2',
      inputLabel: 'Module_L2',
      outputLabel: 'Module_L2',
      status: 'ready',
      type: LogicalMediaDeviceTypeEnum.HANDSET,
    })
    expect(store.devices.some(device =>
      device.origin === 'browser' && device.outputLabel === 'Main',
    )).toBe(false)
    expect(store.devices.some(device =>
      device.origin === 'browser' && device.inputLabel === 'Main',
    )).toBe(false)
    expect(store.devices.at(-1)).toMatchObject({
      id: 'hub',
      type: LogicalMediaDeviceTypeEnum.MAIN,
    })
  })

  it('builds main speaker as missing when Main output endpoint is absent', () => {
    // Arrange
    const store = useDevicesStore()

    // Act
    store.setControllerModules([{
      available: true,
      audiolabel: 'Main',
      features: { audio_in: true, audio_out: true },
      id: 'hub',
      name: 'HUB',
      position: 'center',
      sinks: ['Main'],
      sources: ['Main'],
      type: 0,
    }])
    store.setMediaDevices([])

    // Assert
    expect(store.getDeviceByModule('hub')).toMatchObject({
      id: 'hub',
      hasInput: false,
      hasOutput: true,
      outputId: undefined,
      status: 'missing',
      type: LogicalMediaDeviceTypeEnum.MAIN,
    })
  })

  it('keeps preferredPinnedOutputId on Main when hub logical device exists', () => {
    // Arrange
    const store = useDevicesStore()

    // Act
    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    // Assert
    expect(store.preferredPinnedOutputId).toBe(
      'd695643ddfacc9d1d1b879f01cbf859e5e6b39a97533cf567d22df3527555d84',
    )
    expect(store.getDeviceByModule('hub')?.outputId).toBe(store.preferredPinnedOutputId)
  })

  it('keeps controller logical device as missing when endpoint is absent', () => {
    const store = useDevicesStore()

    store.setControllerModules([{
      available: true,
      features: { audio_in: true, audio_out: false },
      id: 'goose_L1',
      name: 'GOOSE',
      position: 'L1',
      sources: ['Module_L1'],
      type: 1,
    }])
    store.setMediaDevices([])

    expect(store.gooseDevices[0]).toMatchObject({
      id: 'goose_L1',
      inputId: undefined,
      status: 'missing',
    })
    expect(store.readyGooseDevices).toHaveLength(0)
  })

  it('assigns next unused audioinput to goose when module labels are missing', () => {
    const store = useDevicesStore()

    store.setControllerModules([{
      available: true,
      features: { audio_in: true, audio_out: false },
      id: 'goose_L1',
      name: 'GOOSE',
      position: 'L1',
      sources: ['Module_L1'],
      type: 1,
    }])
    store.setMediaDevices([
      {
        deviceId: 'mic-dev-1',
        groupId: 'g1',
        kind: 'audioinput',
        label: 'Headset Microphone',
        toJSON: () => ({}),
      } as MediaDeviceInfo,
    ])

    expect(store.gooseDevices[0]).toMatchObject({
      id: 'goose_L1',
      inputId: 'mic-dev-1',
      inputLabel: 'Headset Microphone',
      status: 'ready',
      type: LogicalMediaDeviceTypeEnum.GOOSE,
    })
    expect(store.readyGooseDevices).toHaveLength(1)
  })

  it('exposes unmatched browser endpoints as ready input and output devices', () => {
    const store = useDevicesStore()

    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    expect(store.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          inputLabel: 'Main',
          origin: 'browser',
          status: 'ready',
          type: LogicalMediaDeviceTypeEnum.INPUT,
        }),
        expect.objectContaining({
          origin: 'browser',
          outputLabel: 'Main',
          status: 'ready',
          type: LogicalMediaDeviceTypeEnum.OUTPUT,
        }),
      ]),
    )
    expect(store.audioDevices.some(device => device.deviceId === 'default')).toBe(false)
    expect(store.audioDevices.some(device => /echo cancelled/i.test(device.label))).toBe(false)
  })

  it('prefers Main output for pinned playback', () => {
    const store = useDevicesStore()

    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    expect(store.preferredPinnedOutputId).toBe(
      'd695643ddfacc9d1d1b879f01cbf859e5e6b39a97533cf567d22df3527555d84',
    )
  })

  it('falls back to default output when no named outputs remain', () => {
    const store = useDevicesStore()

    store.setMediaDevices([{
      deviceId: 'default',
      groupId: 'default',
      kind: 'audiooutput',
      label: 'Default',
      toJSON: () => ({}),
    } as MediaDeviceInfo])

    expect(store.preferredPinnedOutputId).toBe('default')
  })

  it('defaults preferred goose to the first available goose', () => {
    // Arrange
    const store = useDevicesStore()

    // Act
    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    // Assert
    expect(store.preferredGooseId).toBe('goose_L1')
    expect(store.preferredGoose?.id).toBe('goose_L1')
    expect(store.readyPreferredGoose?.id).toBe('goose_L1')
    expect(store.gooseMode).toBe('stateful')
    expect(store.goosePttScope).toBe('standard')
    expect(store.gooseDevices.every(device => device.mode === 'stateful')).toBe(true)
    expect(store.gooseDevices.every(device => device.pttScope === 'standard')).toBe(true)
  })

  it('keeps goose mode and preferred id in runtime memory without localStorage', () => {
    // Arrange
    localStorage.setItem(
      'dealing-console:goose-settings',
      JSON.stringify({
        preferredGooseId: 'goose_R1',
        gooseMode: 'pushToTalk',
        goosePttScope: 'activePinned',
      }),
    )
    const store = useDevicesStore()
    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    // Act
    store.setPreferredGooseId('goose_R1')
    store.setGooseMode('pushToTalk')
    store.setGoosePttScope('activePinned')

    // Assert
    expect(store.preferredGooseId).toBe('goose_R1')
    expect(store.preferredGoose?.id).toBe('goose_R1')
    expect(store.gooseMode).toBe('pushToTalk')
    expect(store.goosePttScope).toBe('activePinned')
    expect(store.gooseDevices.every(device => device.mode === 'pushToTalk')).toBe(true)
    expect(store.gooseDevices.every(device => device.pttScope === 'activePinned')).toBe(true)
    expect(localStorage.getItem('dealing-console:goose-settings')).toBeTruthy()

    setActivePinia(createPinia())
    const restoredStore = useDevicesStore()
    expect(restoredStore.preferredGooseId).toBeUndefined()
    expect(restoredStore.gooseMode).toBe('stateful')
    expect(restoredStore.goosePttScope).toBe('standard')
  })

  it('keeps user media overrides after rebuildDevices', () => {
    // Arrange
    const store = useDevicesStore()
    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    // Act
    store.setUserMediaOverride('goose_L1', {
      enabled: false,
      volume: 33,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
    })
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    // Assert
    expect(store.getDeviceById('goose_L1')).toMatchObject({
      enabled: false,
      volume: 33,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
    })
    expect(store.readyGooseDevices.some(device => device.id === 'goose_L1')).toBe(false)
  })

  it('excludes disabled goose from readyPreferredGoose fallback', () => {
    // Arrange
    const store = useDevicesStore()
    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])
    store.setPreferredGooseId('goose_L1')
    store.setUserMediaOverride('goose_L1', {
      enabled: false,
      volume: 50,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    })

    // Act / Assert
    expect(store.preferredGooseId).toBe('goose_L1')
    expect(store.readyPreferredGoose?.id).not.toBe('goose_L1')
    expect(store.readyPreferredGoose?.enabled).toBe(true)
  })

  it('uses selected preferred goose when it is ready', () => {
    // Arrange
    const store = useDevicesStore()
    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    // Act
    store.setPreferredGooseId('goose_R1')

    // Assert
    expect(store.preferredGooseId).toBe('goose_R1')
    expect(store.preferredGoose?.id).toBe('goose_R1')
    expect(store.readyPreferredGoose?.id).toBe('goose_R1')
  })

  it('falls back preferredGooseId to first goose when stored id is absent', () => {
    // Arrange
    const store = useDevicesStore()
    store.setControllerModules(controllerMediaDevice as ControllerMediaModule[])
    store.setMediaDevices(realMediaDevice as MediaDeviceInfo[])

    // Act
    store.setPreferredGooseId('goose_missing')

    // Assert
    expect(store.preferredGooseId).toBe('goose_L1')
    expect(store.preferredGoose?.id).toBe('goose_L1')
  })
})
