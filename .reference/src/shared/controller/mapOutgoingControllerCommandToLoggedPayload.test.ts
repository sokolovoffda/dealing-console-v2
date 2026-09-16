import { mapOutgoingControllerCommandToLoggedPayload } from './mapOutgoingControllerCommandToLoggedPayload'

describe('mapOutgoingControllerCommandToLoggedPayload', () => {
  it('maps brightness command to ControllerCommandLogged payload', () => {
    // Arrange
    const wire = {
      sender: 'input_1',
      uid: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: '1710000000000',
      name: 'brightness',
      target: 'goose_L1:keyboard',
      recipients: [],
      attrs: { value: 50 },
      model: 'command',
      version: '1.0',
    }

    // Act
    const payload = mapOutgoingControllerCommandToLoggedPayload(wire)

    // Assert
    expect(payload).toEqual({
      wireModel: 'command',
      wireName: 'brightness',
      wirePayload: {
        sender: 'input_1',
        uid: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '1710000000000',
        target: 'goose_L1:keyboard',
        recipients: [],
        attrs: { value: 50 },
        version: '1.0',
      },
      direction: 'console_to_hardware',
      correlationId: '550e8400-e29b-41d4-a716-446655440000',
    })
  })

  it('maps register message without requiring attrs', () => {
    // Arrange
    const wire = {
      sender: 'input_1',
      uid: 'not-a-uuid',
      timestamp: '1710000000000',
      name: 'register',
      message: { name: 'input_1' },
      model: 'register',
      version: '1.0',
    }

    // Act
    const payload = mapOutgoingControllerCommandToLoggedPayload(wire)

    // Assert
    expect(payload).toEqual({
      wireModel: 'register',
      wireName: 'register',
      wirePayload: {
        sender: 'input_1',
        uid: 'not-a-uuid',
        timestamp: '1710000000000',
        message: { name: 'input_1' },
        version: '1.0',
      },
      direction: 'console_to_hardware',
    })
  })

  it('returns null when model or name is missing', () => {
    // Arrange
    const withoutName = { model: 'command', attrs: { value: 1 } }
    const withoutModel = { name: 'brightness', attrs: { value: 1 } }

    // Act
    const payloadWithoutName = mapOutgoingControllerCommandToLoggedPayload(withoutName)
    const payloadWithoutModel = mapOutgoingControllerCommandToLoggedPayload(withoutModel)
    const payloadNonObject = mapOutgoingControllerCommandToLoggedPayload('brightness')

    // Assert
    expect(payloadWithoutName).toBeNull()
    expect(payloadWithoutModel).toBeNull()
    expect(payloadNonObject).toBeNull()
  })
})
