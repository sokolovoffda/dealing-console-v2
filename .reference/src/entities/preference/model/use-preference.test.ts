import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

const mocks = vi.hoisted(() => {
  return {
    onPreference: undefined as ((event: { preferences?: unknown }) => void) | undefined,
    setPreference: vi.fn(() => Promise.resolve()),
    loadPinnedCalls: vi.fn(),
    loadPinnedCallsGroups: vi.fn(),
    loadBindings: vi.fn(),
    initMainSettings: vi.fn(() => Promise.resolve()),
    initGooseSettings: vi.fn(() => Promise.resolve()),
    initMediaDeviceOverrides: vi.fn(() => Promise.resolve()),
    loadCustomize: vi.fn(),
  }
})

vi.mock('@wui/im', () => ({
  useIM: () => ({
    onPreference: (callback: (event: { preferences?: unknown }) => void) => {
      mocks.onPreference = callback
    },
    setPreference: mocks.setPreference,
  }),
}))

vi.mock('@/entities/call-session', () => ({
  usePinnedCallsStore: () => ({
    loadByPreferences: mocks.loadPinnedCalls,
  }),
}))

vi.mock('@/entities/group-contacts', () => ({
  useGroupContactsStore: () => ({
    loadByPreferences: mocks.loadPinnedCallsGroups,
  }),
}))

vi.mock('@/entities/binding-contacts', () => ({
  useBindingControllerButtonsStore: () => ({
    loadByPreferences: mocks.loadBindings,
  }),
}))

vi.mock('@/entities/main-settings', () => ({
  useCustomizeStore: () => ({
    loadByPreferences: mocks.loadCustomize,
  }),
  useMainSettingsStore: () => ({
    init: mocks.initMainSettings,
  }),
}))

vi.mock('@/entities/media-devices-settings', () => ({
  useGooseSettingsStore: () => ({
    init: mocks.initGooseSettings,
  }),
  useMediaDeviceOverridesStore: () => ({
    init: mocks.initMediaDeviceOverrides,
  }),
}))

vi.mock('@/shared/notifications', () => ({
  useNotification: () => ({
    showNotification: vi.fn(),
  }),
}))

describe('usePreferencesStore regressions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.onPreference = undefined
    mocks.setPreference.mockClear()
    mocks.loadPinnedCalls.mockClear()
    mocks.loadPinnedCallsGroups.mockClear()
    mocks.loadBindings.mockClear()
    mocks.initMainSettings.mockClear()
    mocks.initGooseSettings.mockClear()
    mocks.initMediaDeviceOverrides.mockClear()
    mocks.loadCustomize.mockClear()
  })

  it('sanity check', () => {
    expect(true).toBe(true)
  })

  it('should clear preference-backed stores even when a new user receives empty array preferences', async () => {
    const { usePreferencesStore } = await import('./use-preference')
    usePreferencesStore()

    expect(typeof mocks.onPreference).toBe('function')

    mocks.onPreference?.({ preferences: [] })

    expect(mocks.setPreference).toHaveBeenCalledTimes(1)
    expect(mocks.setPreference).toHaveBeenCalledWith(expect.objectContaining({ pinnedCalls: {} }))
    expect(mocks.loadPinnedCalls).toHaveBeenCalledWith(undefined)
    expect(mocks.loadPinnedCalls).toHaveBeenCalled()
    expect(mocks.loadPinnedCallsGroups).toHaveBeenCalled()
    expect(mocks.initMainSettings).toHaveBeenCalled()
    expect(mocks.initGooseSettings).toHaveBeenCalled()
    expect(mocks.initMediaDeviceOverrides).toHaveBeenCalled()
    expect(mocks.loadCustomize).toHaveBeenCalled()
  })
})
