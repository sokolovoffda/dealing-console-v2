import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { createDefaultMainSettings, useMainSettingsStore } from '@/entities/main-settings'

import { Locales } from '@/shared/i18n'

const mocks = vi.hoisted(() => ({
  setLocaleMock: vi.fn((locale: string) => {
    localStorage.setItem('i18n', locale)
    return Promise.resolve()
  }),
  fetchMainSettings: vi.fn(),
  patchMainSettings: vi.fn(),
  showNotification: vi.fn(),
}))

vi.mock('@/shared/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/i18n')>()
  return {
    ...actual,
    useLocalization: () => ({
      ...actual.useLocalization(),
      setLocale: mocks.setLocaleMock,
      t: (key: string, params?: Record<string, string>) =>
        params ? `${key}:${params.error ?? ''}` : key,
    }),
  }
})

vi.mock('@/entities/conference', () => ({
  useConferenceState: () => ({
    conferences: { value: [] },
  }),
  useRoomControl: () => ({
    roomEnableAutoRecording: vi.fn(() => Promise.resolve()),
    roomDisableAutoRecording: vi.fn(() => Promise.resolve()),
  }),
}))

vi.mock('@/shared/composables', () => ({
  useAutoAnswer: () => ({
    checkAutoAnswerAndGetDevice: vi.fn(),
  }),
  useAppStore: () => ({
    currentUser: ref(undefined),
  }),
}))

vi.mock('@/shared/notifications', () => ({
  useNotification: () => ({
    showNotification: mocks.showNotification,
  }),
}))

vi.mock('@/entities/main-settings/api/main-settings-api', () => ({
  useMainSettingsApi: () => ({
    fetchMainSettings: mocks.fetchMainSettings,
    patchMainSettings: mocks.patchMainSettings,
  }),
}))

describe('useMainSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.setLocaleMock.mockClear()
    mocks.fetchMainSettings.mockReset()
    mocks.patchMainSettings.mockReset()
    mocks.showNotification.mockClear()
    localStorage.clear()
  })

  it('should expose defaults and not be dirty initially', () => {
    const store = useMainSettingsStore()

    expect(store.settings).toMatchObject({
      isIncomingCallSoundEnabled: true,
      isAutomaticallyConferenceRecordEnabled: true,
      isDialpadHandsetEnabled: false,
      isSelectContactCards: false,
      isCancelForcedAnswerEnabled: false,
      incomingCallVolume: 100,
      openCallCardOnHandsetPickup: false,
      autoAnswerOnHandsetPickup: false,
      showTraining: 'first-launch',
      incomingRingtoneGuid: '',
    })
    expect(store.isDirty).toBe(false)
  })

  it('should patch settings and mark dirty', () => {
    const store = useMainSettingsStore()

    store.patchSettings({
      isIncomingCallSoundEnabled: false,
      incomingCallVolume: 30,
    })

    expect(store.settings.isIncomingCallSoundEnabled).toBe(false)
    expect(store.settings.incomingCallVolume).toBe(30)
    expect(store.isDirty).toBe(true)
  })

  it('should update single field via updateSettingsField', () => {
    const store = useMainSettingsStore()

    store.updateSettingsField('openCallCardOnHandsetPickup', true)

    expect(store.settings.openCallCardOnHandsetPickup).toBe(true)
    expect(store.isDirty).toBe(true)
  })

  it('should reset UI fields to defaults and keep SODS values from server', () => {
    const store = useMainSettingsStore()

    store.applyFromApi({
      ...createDefaultMainSettings(),
      isDialpadHandsetEnabled: true,
      isSelectContactCards: true,
      isCancelForcedAnswerEnabled: true,
      incomingCallVolume: 10,
    })
    store.resetToDefaults()

    expect(store.settings.incomingCallVolume).toBe(100)
    expect(store.settings.isDialpadHandsetEnabled).toBe(true)
    expect(store.settings.isSelectContactCards).toBe(true)
    expect(store.settings.isCancelForcedAnswerEnabled).toBe(true)
    expect(store.isDirty).toBe(true)
  })

  it('should apply locale via setLocale', async () => {
    const store = useMainSettingsStore()

    await store.applyLocale(Locales.EN_GB)

    expect(store.settings.locale).toBe(Locales.EN_GB)
    expect(mocks.setLocaleMock).toHaveBeenCalledWith(Locales.EN_GB)
    expect(localStorage.getItem('i18n')).toBe(Locales.EN_GB)
  })

  it('should read locale from localStorage on createDefaultMainSettings', () => {
    localStorage.setItem('i18n', Locales.ZH_CN)

    expect(createDefaultMainSettings().locale).toBe(Locales.ZH_CN)
  })

  it('should build dirty patch only for changed UI fields', () => {
    const store = useMainSettingsStore()

    store.applyFromApi({
      ...createDefaultMainSettings(),
      isDialpadHandsetEnabled: true,
    })
    store.patchSettings({ incomingCallVolume: 77, showTraining: 'never' })

    expect(store.getDirtyPatch()).toEqual({
      incomingCallVolume: 77,
      showTraining: 'never',
    })
  })

  it('should load settings from API on init', async () => {
    const apiSettings = {
      ...createDefaultMainSettings(),
      incomingCallVolume: 42,
      locale: Locales.EN_GB,
    }

    mocks.fetchMainSettings.mockResolvedValue({ data: apiSettings })

    const store = useMainSettingsStore()

    await store.init()

    expect(store.settings.incomingCallVolume).toBe(42)
    expect(store.settings.locale).toBe(Locales.EN_GB)
    expect(store.isDirty).toBe(false)
    expect(store.loading).toBe(false)
    expect(mocks.setLocaleMock).toHaveBeenCalledWith(Locales.EN_GB)
  })

  it('should fall back to defaults when init fails', async () => {
    mocks.fetchMainSettings.mockRejectedValue(new Error('network'))

    const store = useMainSettingsStore()

    await store.init()

    expect(store.settings).toMatchObject(createDefaultMainSettings())
    expect(store.isDirty).toBe(false)
    expect(store.loading).toBe(false)
    expect(mocks.setLocaleMock).toHaveBeenCalled()
  })

  it('should keep API settings when locale apply fails during init', async () => {
    mocks.fetchMainSettings.mockResolvedValue({
      data: {
        ...createDefaultMainSettings(),
        incomingCallVolume: 77,
        openCallCardOnHandsetPickup: true,
        autoAnswerOnHandsetPickup: true,
        locale: Locales.EN_GB,
      },
    })
    mocks.setLocaleMock
      .mockRejectedValueOnce(new Error('locale load failed'))
      .mockResolvedValueOnce(undefined)

    const store = useMainSettingsStore()

    await store.init()

    expect(store.settings.incomingCallVolume).toBe(77)
    expect(store.settings.openCallCardOnHandsetPickup).toBe(true)
    expect(store.settings.autoAnswerOnHandsetPickup).toBe(true)
    expect(store.isDirty).toBe(false)
    expect(mocks.setLocaleMock).toHaveBeenCalledTimes(2)
  })

  it('should PATCH dirty UI fields on saveIfDirty', async () => {
    const store = useMainSettingsStore()

    store.applyFromApi(createDefaultMainSettings())
    store.patchSettings({ incomingCallVolume: 77 })

    mocks.patchMainSettings.mockResolvedValue({
      data: {
        ...createDefaultMainSettings(),
        incomingCallVolume: 77,
      },
    })

    await store.saveIfDirty()

    expect(mocks.patchMainSettings).toHaveBeenCalledWith({ incomingCallVolume: 77 })
    expect(store.isDirty).toBe(false)
  })

  it('should rollback and notify when saveIfDirty fails', async () => {
    const store = useMainSettingsStore()

    store.applyFromApi({
      ...createDefaultMainSettings(),
      incomingCallVolume: 50,
      locale: Locales.RU_RU,
    })
    await store.applyLocale(Locales.EN_GB)
    store.patchSettings({ incomingCallVolume: 77 })

    mocks.patchMainSettings.mockRejectedValue(new Error('network'))

    await expect(store.saveIfDirty()).rejects.toThrow('network')

    expect(store.settings.incomingCallVolume).toBe(50)
    expect(store.settings.locale).toBe(Locales.RU_RU)
    expect(mocks.setLocaleMock).toHaveBeenLastCalledWith(Locales.RU_RU)
    expect(mocks.showNotification).toHaveBeenCalled()
  })

  it('should PATCH UI defaults on resetToDefaultsAndSave', async () => {
    const store = useMainSettingsStore()

    store.applyFromApi({
      ...createDefaultMainSettings(),
      isDialpadHandsetEnabled: true,
      incomingCallVolume: 10,
    })
    store.patchSettings({ incomingCallVolume: 10, showTraining: 'never' })

    mocks.patchMainSettings.mockResolvedValue({
      data: {
        ...createDefaultMainSettings(),
        isDialpadHandsetEnabled: true,
        incomingCallVolume: 100,
        showTraining: 'first-launch',
      },
    })

    await store.resetToDefaultsAndSave()

    expect(mocks.patchMainSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        incomingCallVolume: 100,
        showTraining: 'first-launch',
      }),
    )
    expect(store.settings.isDialpadHandsetEnabled).toBe(true)
    expect(store.isDirty).toBe(false)
  })
})
