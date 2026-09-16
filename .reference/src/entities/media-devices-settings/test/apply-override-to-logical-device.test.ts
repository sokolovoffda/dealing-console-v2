import {
  mediaDeviceOverrideToUserFields,
  mediaDeviceOverridesMapToUserFields,
} from '../lib/apply-override-to-logical-device'

describe('apply-override-to-logical-device', () => {
  it('should map override fields to logical device user media fields', () => {
    // Arrange
    const override = {
      logicalKey: 'goose_L1',
      enabled: false,
      volume: 40,
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
    }

    // Act
    const result = mediaDeviceOverrideToUserFields(override)

    // Assert
    expect(result).toEqual({
      enabled: false,
      volume: 40,
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
    })
  })

  it('should map overrides dictionary by logical key', () => {
    // Arrange
    const byKey = {
      goose_L1: {
        logicalKey: 'goose_L1',
        enabled: false,
        volume: 40,
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: false,
      },
      hub: {
        logicalKey: 'hub',
        enabled: true,
        volume: 80,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }

    // Act
    const result = mediaDeviceOverridesMapToUserFields(byKey)

    // Assert
    expect(result.goose_L1.enabled).toBe(false)
    expect(result.hub.volume).toBe(80)
  })
})
