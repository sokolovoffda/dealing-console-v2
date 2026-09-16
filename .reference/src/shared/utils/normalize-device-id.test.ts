import { normalizeAudioDeviceIdConstraint } from './normalize-device-id'

describe('normalizeAudioDeviceIdConstraint', () => {
  it('should return { exact: deviceId } for valid deviceId', () => {
    // Arrange & Act
    const result = normalizeAudioDeviceIdConstraint('device-123')

    // Assert
    expect(result).toEqual({ exact: 'device-123' })
  })

  it('should return "default" for undefined', () => {
    // Arrange & Act
    const result = normalizeAudioDeviceIdConstraint(undefined)

    // Assert
    expect(result).toBe('default')
  })

  it('should return "default" for null', () => {
    // Arrange & Act
    const result = normalizeAudioDeviceIdConstraint(null)

    // Assert
    expect(result).toBe('default')
  })

  it('should return "default" for empty string', () => {
    // Arrange & Act
    const result = normalizeAudioDeviceIdConstraint('')

    // Assert
    expect(result).toBe('default')
  })

  it('should return "default" for literal "default"', () => {
    // Arrange & Act
    const result = normalizeAudioDeviceIdConstraint('default')

    // Assert
    expect(result).toBe('default')
  })

  it('should return { exact: deviceId } for non-default deviceId', () => {
    // Arrange & Act
    const result = normalizeAudioDeviceIdConstraint('input-device-456')

    // Assert
    expect(result).toEqual({ exact: 'input-device-456' })
  })
})
