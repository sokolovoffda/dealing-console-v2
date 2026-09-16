import {
  createDefaultMediaDeviceOverride,
  normalizeMediaDeviceOverridesFromApi,
  sanitizeMediaDeviceOverridesPatchForApi,
} from '../lib/media-device-overrides-api-mapper'

describe('media-device-overrides-api-mapper', () => {
  it('should normalize overrides list and clamp volume', () => {
    // Arrange
    const apiDto = {
      schemaVersion: 1 as const,
      hardwareSerial: 'serial-1',
      devices: [
        {
          logicalKey: 'goose_L1',
          enabled: false,
          volume: 150,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
        {
          logicalKey: '  ',
          enabled: true,
          volume: 40,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      ],
    }

    // Act
    const result = normalizeMediaDeviceOverridesFromApi(apiDto)

    // Assert
    expect(result).toEqual({
      schemaVersion: 1,
      hardwareSerial: 'serial-1',
      devices: [
        {
          logicalKey: 'goose_L1',
          enabled: false,
          volume: 100,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      ],
    })
  })

  it('should apply default fields for incomplete device from API', () => {
    // Arrange / Act
    const result = normalizeMediaDeviceOverridesFromApi({
      schemaVersion: 1,
      hardwareSerial: 'serial-2',
      devices: [
        {
          logicalKey: 'hub',
        } as never,
      ],
    })

    // Assert
    expect(result.devices).toEqual([createDefaultMediaDeviceOverride('hub')])
  })

  it('should fallback hardwareSerial when API omits it', () => {
    // Arrange / Act
    const result = normalizeMediaDeviceOverridesFromApi(
      {
        schemaVersion: 1,
        hardwareSerial: '',
        devices: [],
      },
      'fallback-serial',
    )

    // Assert
    expect(result.hardwareSerial).toBe('fallback-serial')
  })

  it('should sanitize patch body and drop devices without logicalKey', () => {
    // Arrange / Act
    const result = sanitizeMediaDeviceOverridesPatchForApi({
      devices: [
        {
          logicalKey: 'handset_L1',
          volume: -10,
          enabled: true,
        },
        {
          logicalKey: '',
          volume: 30,
        },
        {
          logicalKey: 'goose_L1',
          echoCancellation: false,
        },
      ],
    })

    // Assert
    expect(result).toEqual({
      devices: [
        {
          logicalKey: 'handset_L1',
          volume: 0,
          enabled: true,
        },
        {
          logicalKey: 'goose_L1',
          echoCancellation: false,
        },
      ],
    })
  })
})
