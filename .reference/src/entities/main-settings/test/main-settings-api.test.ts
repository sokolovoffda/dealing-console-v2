import axios from 'axios'
import { vi } from 'vitest'

import { createDefaultMainSettings, useMainSettingsApi } from '@/entities/main-settings'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('@/shared/url-helper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/url-helper')>()

  return {
    ...actual,
    getAdditionalApiURL: ({ pathName }: { pathName: string }) => `https://additional.test${pathName}`,
  }
})

describe('useMainSettingsApi', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
    vi.mocked(axios.patch).mockReset()
  })

  it('should fetch main settings and normalize null ringtone guid', async () => {
    // Arrange
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        ...createDefaultMainSettings(),
        incomingRingtoneGuid: null,
      },
    })

    // Act
    const { data } = await useMainSettingsApi().fetchMainSettings()

    // Assert
    expect(axios.get).toHaveBeenCalledWith('https://additional.test/api/v1/me/main-settings')
    expect(data.incomingRingtoneGuid).toBe('')
  })

  it('should patch main settings and sanitize empty ringtone guid', async () => {
    // Arrange
    vi.mocked(axios.patch).mockResolvedValue({
      data: {
        ...createDefaultMainSettings(),
        incomingCallVolume: 80,
        incomingRingtoneGuid: null,
      },
    })

    // Act
    const { data } = await useMainSettingsApi().patchMainSettings({
      incomingCallVolume: 80,
      incomingRingtoneGuid: '',
    })

    // Assert
    expect(axios.patch).toHaveBeenCalledWith(
      'https://additional.test/api/v1/me/main-settings',
      {
        incomingCallVolume: 80,
        incomingRingtoneGuid: null,
      },
    )
    expect(data.incomingCallVolume).toBe(80)
    expect(data.incomingRingtoneGuid).toBe('')
  })
})
