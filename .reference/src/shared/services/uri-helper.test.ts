import { vi } from 'vitest'

vi.mock('@/shared/composables', () => ({
  useConfigurationState: () => ({
    configuration: { value: { domainPath: 'ROOT' } },
  }),
}))

import { isConferenceRoomNumber } from './uri-helper'

describe('isConferenceRoomNumber', () => {
  it('should return false for internal numbers', () => {
    // Arrange
    const internalNumbers = ['9001', '3450']

    // Act
    const results = internalNumbers.map((number) => isConferenceRoomNumber(number))

    // Assert
    expect(results).toEqual([false, false])
  })

  it('should return true for 32-char room guid', () => {
    // Arrange
    const roomGuid = '4BD87736B65862772AFA6DE721EE5AF7'

    // Act
    const result = isConferenceRoomNumber(roomGuid)

    // Assert
    expect(result).toBe(true)
  })

  it('should return true for ROOMS-prefixed number', () => {
    // Arrange
    const roomNumber = 'ROOMS-4BD87736B65862772AFA6DE721EE5AF7'

    // Act
    const result = isConferenceRoomNumber(roomNumber)

    // Assert
    expect(result).toBe(true)
  })

  it('should return true for conference pServed', () => {
    // Arrange
    const conferencePServed = '<sip:ROOMS-4BD87736B65862772AFA6DE721EE5AF7@ROOT>'

    // Act
    const result = isConferenceRoomNumber(conferencePServed)

    // Assert
    expect(result).toBe(true)
  })

  it('should return false for contact pServed', () => {
    // Arrange
    const contactPServed = '<sip:9001@ROOT>'

    // Act
    const result = isConferenceRoomNumber(contactPServed)

    // Assert
    expect(result).toBe(false)
  })

  it('should return false for empty value', () => {
    // Arrange
    const emptyNumber = ''

    // Act
    const result = isConferenceRoomNumber(emptyNumber)

    // Assert
    expect(result).toBe(false)
  })
})
