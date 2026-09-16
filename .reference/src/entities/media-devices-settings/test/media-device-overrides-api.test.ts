import axios from 'axios'
import { vi } from 'vitest'

import { useMediaDeviceOverridesApi } from '@/entities/media-devices-settings'

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

describe('useMediaDeviceOverridesApi', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
    vi.mocked(axios.patch).mockReset()
  })

  it('should fetch overrides by hardwareSerial', async () => {
    // Arrange
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'abc123',
        devices: [
          {
            logicalKey: 'goose_L1',
            enabled: true,
            volume: 60,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
        ],
      },
    })

    // Act
    const { data } = await useMediaDeviceOverridesApi().fetchMediaDeviceOverrides('abc123')

    // Assert
    expect(axios.get).toHaveBeenCalledWith(
      'https://additional.test/api/v1/me/media-device-overrides/abc123',
    )
    expect(data.devices).toHaveLength(1)
    expect(data.devices[0]?.logicalKey).toBe('goose_L1')
    expect(data.devices[0]?.volume).toBe(60)
  })

  it('should encode hardwareSerial in path and sanitize patch body', async () => {
    // Arrange
    vi.mocked(axios.patch).mockResolvedValue({
      data: {
        schemaVersion: 1,
        hardwareSerial: 'ser/ial',
        devices: [
          {
            logicalKey: 'hub',
            enabled: true,
            volume: 80,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        ],
      },
    })

    // Act
    const { data } = await useMediaDeviceOverridesApi().patchMediaDeviceOverrides('ser/ial', {
      devices: [
        {
          logicalKey: 'hub',
          volume: 80,
        },
      ],
    })

    // Assert
    expect(axios.patch).toHaveBeenCalledWith(
      'https://additional.test/api/v1/me/media-device-overrides/ser%2Fial',
      {
        devices: [
          {
            logicalKey: 'hub',
            volume: 80,
          },
        ],
      },
    )
    expect(data.devices[0]?.volume).toBe(80)
  })
})
