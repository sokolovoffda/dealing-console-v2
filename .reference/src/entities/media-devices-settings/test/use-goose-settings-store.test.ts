import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import { useGooseSettingsStore } from '@/entities/media-devices-settings'

import { useDevicesStore } from '@/shared/composables'

const mocks = vi.hoisted(() => ({
  fetchGooseSettings: vi.fn(),
  putGooseSettings: vi.fn(),
  showNotification: vi.fn(),
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

vi.mock('@/shared/notifications', () => ({
  useNotification: () => ({
    showNotification: mocks.showNotification,
  }),
}))

vi.mock('@/entities/media-devices-settings/api/goose-settings-api', () => ({
  useGooseSettingsApi: () => ({
    fetchGooseSettings: mocks.fetchGooseSettings,
    putGooseSettings: mocks.putGooseSettings,
  }),
}))

describe('useGooseSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mocks.fetchGooseSettings.mockReset()
    mocks.putGooseSettings.mockReset()
    mocks.showNotification.mockClear()
  })

  it('should hydrate devices-store from API and clear legacy localStorage', async () => {
    // Arrange
    localStorage.setItem('dealing-console:goose-settings', '{"preferredGooseId":"legacy"}')
    mocks.fetchGooseSettings.mockResolvedValue({
      data: {
        schemaVersion: 1,
        preferredGooseId: 'goose_R1',
        mode: 'pushToTalk',
        pttScope: 'activePinned',
      },
    })

    // Act
    await useGooseSettingsStore().init()
    const devicesStore = useDevicesStore()

    // Assert
    expect(devicesStore.preferredGooseId).toBe('goose_R1')
    expect(devicesStore.gooseMode).toBe('pushToTalk')
    expect(devicesStore.goosePttScope).toBe('activePinned')
    expect(useGooseSettingsStore().isDirty).toBe(false)
    expect(localStorage.getItem('dealing-console:goose-settings')).toBeNull()
  })

  it('should mark dirty when runtime goose settings diverge from synced', async () => {
    // Arrange
    mocks.fetchGooseSettings.mockResolvedValue({
      data: {
        schemaVersion: 1,
        preferredGooseId: null,
        mode: 'stateful',
        pttScope: 'standard',
      },
    })
    await useGooseSettingsStore().init()
    const devicesStore = useDevicesStore()

    // Act
    devicesStore.setGooseMode('pushToTalk')

    // Assert
    expect(useGooseSettingsStore().isDirty).toBe(true)
  })

  it('should put dirty settings and mark synced on success', async () => {
    // Arrange
    mocks.fetchGooseSettings.mockResolvedValue({
      data: {
        schemaVersion: 1,
        preferredGooseId: null,
        mode: 'stateful',
        pttScope: 'standard',
      },
    })
    await useGooseSettingsStore().init()
    useDevicesStore().setGooseMode('pushToTalk')
    mocks.putGooseSettings.mockResolvedValue({
      data: {
        schemaVersion: 1,
        preferredGooseId: null,
        mode: 'pushToTalk',
        pttScope: 'standard',
      },
    })

    // Act
    await useGooseSettingsStore().saveIfDirty()

    // Assert
    expect(mocks.putGooseSettings).toHaveBeenCalledWith({
      schemaVersion: 1,
      preferredGooseId: null,
      mode: 'pushToTalk',
      pttScope: 'standard',
    })
    expect(useGooseSettingsStore().isDirty).toBe(false)
  })

  it('should rollback runtime and notify on save failure', async () => {
    // Arrange
    mocks.fetchGooseSettings.mockResolvedValue({
      data: {
        schemaVersion: 1,
        preferredGooseId: null,
        mode: 'stateful',
        pttScope: 'standard',
      },
    })
    await useGooseSettingsStore().init()
    useDevicesStore().setGooseMode('pushToTalk')
    mocks.putGooseSettings.mockRejectedValue(new Error('network'))

    // Act
    await expect(useGooseSettingsStore().saveIfDirty()).rejects.toThrow('network')

    // Assert
    expect(useDevicesStore().gooseMode).toBe('stateful')
    expect(useGooseSettingsStore().isDirty).toBe(false)
    expect(mocks.showNotification).toHaveBeenCalled()
  })

  it('should apply defaults when fetch fails', async () => {
    // Arrange
    mocks.fetchGooseSettings.mockRejectedValue(new Error('offline'))

    // Act
    await useGooseSettingsStore().init()

    // Assert
    expect(useDevicesStore().gooseMode).toBe('stateful')
    expect(useDevicesStore().goosePttScope).toBe('standard')
    expect(useDevicesStore().preferredGooseId).toBeUndefined()
    expect(useGooseSettingsStore().isDirty).toBe(false)
  })
})
