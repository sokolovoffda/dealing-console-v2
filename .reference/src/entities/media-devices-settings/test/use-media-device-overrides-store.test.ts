import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import {
  MAIN_MEDIA_DEVICE_LOGICAL_KEY,
  useMediaDeviceOverridesStore,
} from '../model/use-media-device-overrides-store'

const mocks = vi.hoisted(() => ({
  fetchMediaDeviceOverrides: vi.fn(),
  patchMediaDeviceOverrides: vi.fn(),
  changeGlobalVolumeMultiplier: vi.fn(),
  showNotification: vi.fn(),
  setUserMediaOverride: vi.fn(),
  replaceUserMediaOverrides: vi.fn(),
  clearUserMediaOverrides: vi.fn(),
  globalVolumeMultiplier: 1,
  hardwareSerial: null as string | null,
  devices: [{ id: 'goose_L1', module: 'goose_L1' }, { id: 'hub', module: 'hub' }] as {
    id: string
    module?: string
  }[],
  devicesSessionMap: new Map<string, string[]>(),
}))

vi.mock('@/entities/media-devices-settings/api/media-device-overrides-api', () => ({
  useMediaDeviceOverridesApi: () => ({
    fetchMediaDeviceOverrides: mocks.fetchMediaDeviceOverrides,
    patchMediaDeviceOverrides: mocks.patchMediaDeviceOverrides,
  }),
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    get globalVolumeMultiplier () {
      return mocks.globalVolumeMultiplier
    },
    changeGlobalVolumeMultiplier: (value: number) => {
      mocks.globalVolumeMultiplier = value
      mocks.changeGlobalVolumeMultiplier(value)
    },
  }),
}))

vi.mock('@/shared/composables', () => ({
  useDevicesStore: () => ({
    get devices () {
      return mocks.devices
    },
    getDeviceById: (id: string) => mocks.devices.find(device => device.id === id),
    setUserMediaOverride: mocks.setUserMediaOverride,
    replaceUserMediaOverrides: mocks.replaceUserMediaOverrides,
    clearUserMediaOverrides: mocks.clearUserMediaOverrides,
  }),
  useDevicesSessionsStore: () => ({
    devicesSession: mocks.devicesSessionMap,
    getDeviceSessionKey: (device: { id: string, module?: string }) =>
      device.module ?? device.id,
  }),
}))

vi.mock('@/shared/turret-admin-ws', () => ({
  useTurretAdminWs: () => ({
    hardwareSerial: {
      get value () {
        return mocks.hardwareSerial
      },
    },
  }),
}))

vi.mock('@/shared/notifications', () => ({
  useNotification: () => ({
    showNotification: mocks.showNotification,
  }),
}))

vi.mock('@/shared/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/i18n')>()
  return {
    ...actual,
    useLocalization: () => ({
      ...actual.useLocalization(),
      t: (key: string, params?: Record<string, string>) =>
        params ? `${key}:${params.error ?? ''}` : key,
    }),
  }
})

describe('useMediaDeviceOverridesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.fetchMediaDeviceOverrides.mockReset()
    mocks.patchMediaDeviceOverrides.mockReset()
    mocks.changeGlobalVolumeMultiplier.mockClear()
    mocks.showNotification.mockClear()
    mocks.setUserMediaOverride.mockClear()
    mocks.replaceUserMediaOverrides.mockClear()
    mocks.clearUserMediaOverrides.mockClear()
    mocks.globalVolumeMultiplier = 1
    mocks.hardwareSerial = 'serial-1'
    mocks.devices = [{ id: 'goose_L1', module: 'goose_L1' }, { id: 'hub', module: 'hub' }]
    mocks.devicesSessionMap = new Map()
  })

  it('should hydrate overrides and apply Main volume to footer runtime', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: false,
            volume: 40,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 75,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          {
            logicalKey: 'orphan_X',
            enabled: true,
            volume: 10,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })

    // Act
    await useMediaDeviceOverridesStore().init()
    const store = useMediaDeviceOverridesStore()

    // Assert
    expect(store.getResolvedOverride('goose_L1').enabled).toBe(false)
    expect(store.getResolvedOverride('goose_L1').volume).toBe(40)
    expect(store.orphanLogicalKeys).toContain('orphan_X')
    expect(mocks.changeGlobalVolumeMultiplier).toHaveBeenCalledWith(0.75)
    expect(store.isDirty).toBe(false)
    expect(mocks.replaceUserMediaOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        goose_L1: expect.objectContaining({
          enabled: false,
          volume: 40,
          echoCancellation: true,
        }),
        hub: expect.objectContaining({ volume: 75 }),
      }),
    )
  })

  it('should mark dirty on patch and build partial dirty patch body', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    const store = useMediaDeviceOverridesStore()

    // Act
    store.patchDevice('goose_L1', { volume: 80, enabled: false })

    // Assert
    expect(store.isDirty).toBe(true)
    expect(store.getDirtyPatchBody()).toEqual({
      devices: [
        {
          logicalKey: 'goose_L1',
          volume: 80,
          enabled: false,
        },
      ],
    })
    expect(mocks.setUserMediaOverride).toHaveBeenCalledWith(
      'goose_L1',
      expect.objectContaining({
        enabled: false,
        volume: 80,
      }),
    )
  })

  it('should exclude Main volume from dirty patch when requested', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    const store = useMediaDeviceOverridesStore()

    // Act
    store.patchDevice(MAIN_MEDIA_DEVICE_LOGICAL_KEY, { volume: 90 })

    // Assert
    expect(store.getDirtyPatchBody({ excludeMainVolume: true })).toEqual({ devices: [] })
    expect(store.getDirtyPatchBody()).toEqual({
      devices: [
        {
          logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
          volume: 90,
        },
      ],
    })
  })

  it('should rollback working copy to synced', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    const store = useMediaDeviceOverridesStore()
    store.patchDevice('goose_L1', { volume: 20 })

    // Act
    store.rollbackToSynced()

    // Assert
    expect(store.getResolvedOverride('goose_L1').volume).toBe(50)
    expect(store.isDirty).toBe(false)
  })

  it('should PATCH non-Main dirty devices on saveIfDirty', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    const store = useMediaDeviceOverridesStore()
    store.patchDevice('goose_L1', { volume: 70 })
    store.patchDevice(MAIN_MEDIA_DEVICE_LOGICAL_KEY, { volume: 90 })

    mocks.patchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 70,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })

    // Act
    await store.saveIfDirty()

    // Assert
    expect(mocks.patchMediaDeviceOverrides).toHaveBeenCalledWith('serial-1', {
      devices: [{ logicalKey: 'goose_L1', volume: 70 }],
    })
  })

  it('should flush pending Main volume as dedicated PATCH', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    const store = useMediaDeviceOverridesStore()
    store.patchDevice(MAIN_MEDIA_DEVICE_LOGICAL_KEY, { volume: 88 })

    mocks.patchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 88,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })

    // Act
    await store.flushPendingMainVolumePersist()

    // Assert
    expect(mocks.patchMediaDeviceOverrides).toHaveBeenCalledWith('serial-1', {
      devices: [{ logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY, volume: 88 }],
    })
    expect(store.isDirty).toBe(false)
  })

  it('should debounce Main volume PATCH via scheduleMainVolumePersist', async () => {
    // Arrange
    vi.useFakeTimers()
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    const store = useMediaDeviceOverridesStore()
    store.patchDevice(MAIN_MEDIA_DEVICE_LOGICAL_KEY, { volume: 60 })
    store.patchDevice(MAIN_MEDIA_DEVICE_LOGICAL_KEY, { volume: 75 })

    mocks.patchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 75,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })

    // Act — schedule twice; only one PATCH after debounce
    store.scheduleMainVolumePersist()
    store.scheduleMainVolumePersist()
    expect(mocks.patchMediaDeviceOverrides).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(400)

    // Assert
    expect(mocks.patchMediaDeviceOverrides).toHaveBeenCalledTimes(1)
    expect(mocks.patchMediaDeviceOverrides).toHaveBeenCalledWith('serial-1', {
      devices: [{ logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY, volume: 75 }],
    })

    vi.useRealTimers()
  })

  it('should block AEC patch when device has bound sessions', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    mocks.setUserMediaOverride.mockClear()
    mocks.devicesSessionMap.set('goose_L1', ['session-1'])
    const store = useMediaDeviceOverridesStore()

    // Act
    const applied = store.patchDevice('goose_L1', { echoCancellation: false })

    // Assert
    expect(applied).toBe(false)
    expect(store.getResolvedOverride('goose_L1').echoCancellation).toBe(true)
    expect(mocks.setUserMediaOverride).not.toHaveBeenCalled()
    expect(mocks.showNotification).toHaveBeenCalledWith({
      type: 'error',
      message: 'MediaDeviceChangeBlockedWhileInCall',
    })
  })

  it('should apply AEC patch to logical device when no bound sessions', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    mocks.setUserMediaOverride.mockClear()
    mocks.devicesSessionMap.clear()
    const store = useMediaDeviceOverridesStore()

    // Act
    const applied = store.patchDevice('goose_L1', { echoCancellation: false })

    // Assert
    expect(applied).toBe(true)
    expect(store.getResolvedOverride('goose_L1').echoCancellation).toBe(false)
    expect(mocks.setUserMediaOverride).toHaveBeenCalledWith(
      'goose_L1',
      expect.objectContaining({ echoCancellation: false }),
    )
    expect(mocks.showNotification).not.toHaveBeenCalled()
  })

  it('should block disable when device has bound sessions', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    mocks.setUserMediaOverride.mockClear()
    mocks.showNotification.mockClear()
    mocks.devicesSessionMap.set('goose_L1', ['session-1'])
    const store = useMediaDeviceOverridesStore()

    // Act
    const applied = store.patchDevice('goose_L1', { enabled: false })

    // Assert
    expect(applied).toBe(false)
    expect(store.getResolvedOverride('goose_L1').enabled).toBe(true)
    expect(mocks.setUserMediaOverride).not.toHaveBeenCalled()
    expect(mocks.showNotification).toHaveBeenCalledWith({
      type: 'error',
      message: 'MediaDeviceDisableBlockedWhileInCall',
    })
  })

  it('should allow Main volume patch while hub has bound sessions', async () => {
    // Arrange
    mocks.fetchMediaDeviceOverrides.mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'serial-1',
        devices: [
          {
            logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY,
            enabled: true,
            volume: 50,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })
    await useMediaDeviceOverridesStore().init()
    mocks.setUserMediaOverride.mockClear()
    mocks.devicesSessionMap.set('hub', ['session-1'])
    const store = useMediaDeviceOverridesStore()

    // Act
    const applied = store.patchDevice(MAIN_MEDIA_DEVICE_LOGICAL_KEY, { volume: 20 })

    // Assert
    expect(applied).toBe(true)
    expect(store.getResolvedOverride(MAIN_MEDIA_DEVICE_LOGICAL_KEY).volume).toBe(20)
  })
})
