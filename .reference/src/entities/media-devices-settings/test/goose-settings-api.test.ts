import axios from 'axios'
import { vi } from 'vitest'

import { useGooseSettingsApi } from '@/entities/media-devices-settings'

import { createDefaultGooseSettings } from '../lib/goose-settings-api-mapper'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/shared/url-helper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/url-helper')>()

  return {
    ...actual,
    getAdditionalApiURL: ({ pathName }: { pathName: string }) => `https://additional.test${pathName}`,
  }
})

describe('useGooseSettingsApi', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
    vi.mocked(axios.put).mockReset()
  })

  it('should fetch goose settings and map module id to preferredGooseId', async () => {
    // Arrange
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        schemaVersion: 1,
        preferredGooseModuleId: 'goose_L1',
        mode: 'stateful',
        pttScope: 'standard',
      },
    })

    // Act
    const { data } = await useGooseSettingsApi().fetchGooseSettings()

    // Assert
    expect(axios.get).toHaveBeenCalledWith('https://additional.test/api/v1/me/goose-settings')
    expect(data).toEqual({
      schemaVersion: 1,
      preferredGooseId: 'goose_L1',
      mode: 'stateful',
      pttScope: 'standard',
    })
  })

  it('should put goose settings and sanitize preferredGooseId for API', async () => {
    // Arrange
    const defaults = createDefaultGooseSettings()
    vi.mocked(axios.put).mockResolvedValue({
      data: {
        schemaVersion: 1,
        preferredGooseModuleId: 'goose_R1',
        mode: 'pushToTalk',
        pttScope: 'activePinned',
      },
    })

    // Act
    const { data } = await useGooseSettingsApi().putGooseSettings({
      ...defaults,
      preferredGooseId: 'goose_R1',
      mode: 'pushToTalk',
      pttScope: 'activePinned',
    })

    // Assert
    expect(axios.put).toHaveBeenCalledWith(
      'https://additional.test/api/v1/me/goose-settings',
      {
        schemaVersion: 1,
        preferredGooseModuleId: 'goose_R1',
        mode: 'pushToTalk',
        pttScope: 'activePinned',
      },
    )
    expect(data.preferredGooseId).toBe('goose_R1')
    expect(data.mode).toBe('pushToTalk')
    expect(data.pttScope).toBe('activePinned')
  })
})
