import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { useRingtonesStore } from '@/entities/main-settings'
import type { AudioCategory, AudioFileTemplate, AudioFilesUsedSpace } from '@/entities/main-settings'

const currentUserGuid = '2ba8cb13-f504-47b1-92ac-ee91cbd6d927'
const currentUserGuidWithoutDashes = '2ba8cb13f50447b192acee91cbd6d927'

const mocks = vi.hoisted(() => ({
  fetchRingtones: vi.fn<() => Promise<{ data: AudioFileTemplate[] }>>(),
  fetchUsedSpace: vi.fn<() => Promise<{ data: AudioFilesUsedSpace }>>(),
  fetchAudioCategories: vi.fn<() => Promise<AudioCategory[]>>(),
  createAudioCategory: vi.fn<() => Promise<AudioCategory>>(),
  saveRingtone: vi.fn<() => Promise<AudioFileTemplate>>(),
}))

const createMockRingtone = (overrides: Partial<AudioFileTemplate> = {}): AudioFileTemplate => ({
  guid: 'custom-tone',
  id: 'custom-tone',
  owner: currentUserGuidWithoutDashes,
  name: 'Custom tone',
  path: '/prompt/custom-tone.wav',
  type: 'prompt',
  categoryName: 'Custom Ringtone Category',
  textDescription: '',
  description: '',
  isCategoryEditable: false,
  isCustomizable: true,
  isCustomizedOriginPrompt: false,
  isCustomizedTargetPrompt: false,
  isDeletable: true,
  isDescriptionEditable: false,
  isFileReplaceable: false,
  isNameEditable: false,
  isTextDescriptionEditable: false,
  ...overrides,
})

vi.mock('@/entities/main-settings/api/ringtones-api', () => ({
  useRingtonesApi: () => ({
    fetchRingtones: mocks.fetchRingtones,
    fetchUsedSpace: mocks.fetchUsedSpace,
    fetchAudioCategories: mocks.fetchAudioCategories,
    createAudioCategory: mocks.createAudioCategory,
    saveRingtone: mocks.saveRingtone,
    deleteRingtone: vi.fn(() => Promise.resolve(true)),
  }),
}))

vi.mock('@/features/global-ringtone', () => ({
  useGlobalRingtone: () => ({
    changePathInPlayer: vi.fn(),
  }),
}))

vi.mock('@/shared/composables', () => ({
  useAutoAnswer: () => ({
    checkAutoAnswerAndGetDevice: vi.fn(),
  }),
  useDevicesStore: () => ({
    queueDevices: [],
    gooseDevices: [],
  }),
  useDevicesSessionsStore: () => ({
    bindSessionToDevice: vi.fn(),
  }),
  useAppStore: () => ({
    currentUser: ref({ guid: currentUserGuid }),
  }),
  useStatusSubscribe: () => ({
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
  useConfigurationState: () => ({
    configuration: ref({ domainPath: '@ROOT' }),
  }),
}))

vi.mock('@/entities/call-session', () => ({
  useSessionStore: () => ({
    sessions: new Map(),
    addSession: vi.fn(),
    getSessionByPServed: vi.fn(),
    queueSessions: [],
  }),
  usePinnedCallsStore: () => ({
    isPServedSession: vi.fn(),
  }),
  useSessionTimer: () => ({
    duration: ref('01:32'),
    start: vi.fn(),
    stop: vi.fn(),
  }),
  unselectContact: vi.fn(),
}))

vi.mock('@/entities/preference', () => ({
  usePreferencesStore: () => ({
    setPreferences: vi.fn(() => Promise.resolve()),
  }),
}))

describe('useRingtonesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.fetchRingtones.mockResolvedValue({ data: [] })
    mocks.fetchUsedSpace.mockResolvedValue({
      data: { allSpace: 5120, freeSpace: 5120, usedSpace: 0 },
    })
    mocks.fetchAudioCategories.mockResolvedValue([])
    mocks.createAudioCategory.mockResolvedValue({
      guid: 'new-category-guid',
      owner: currentUserGuid,
      name: 'Custom Ringtone Category',
      isSystem: false,
    })
    mocks.saveRingtone.mockResolvedValue(createMockRingtone({
      guid: 'ringtone-guid',
      path: '/prompt/custom.wav',
    }))
  })

  it('should replace stale categoryGuid from preferences before upload', async () => {
    // Arrange
    const store = useRingtonesStore()
    store.customRingtone.categoryGuid = 'stale-category-guid'
    store.customRingtone.categoryName = 'Custom Ringtone Category'
    mocks.fetchAudioCategories.mockResolvedValue([{
      guid: 'valid-category-guid',
      owner: currentUserGuidWithoutDashes,
      name: 'Custom Ringtone Category',
      isSystem: false,
    }])

    // Act
    await store.saveNewRingtone(new File(['test'], 'tone.wav'), {
      lang: 'ru-RU',
      categoryName: 'Custom Ringtone Category',
      categoryGuid: '',
      promptName: 'tone',
    })

    // Assert
    expect(store.customRingtone.categoryGuid).toBe('valid-category-guid')
    expect(mocks.createAudioCategory).not.toHaveBeenCalled()
    expect(mocks.saveRingtone).toHaveBeenCalledWith(
      expect.any(FormData),
      expect.objectContaining({ categoryGuid: 'valid-category-guid' }),
    )
  })

  it('should include owner-matched ringtones when guid format differs by dashes', async () => {
    // Arrange
    mocks.fetchRingtones.mockResolvedValue({
      data: [createMockRingtone()],
    })
    const store = useRingtonesStore()

    // Act
    await store.loadStore()

    // Assert
    expect(store.ringtonesList.size).toBe(1)
    expect(store.ringtonesList.get('custom-tone')?.name).toBe('Custom tone')
  })
})
