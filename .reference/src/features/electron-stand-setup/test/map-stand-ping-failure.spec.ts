import { mapStandPingFailureToKey } from '../model/map-stand-ping-failure'

type Failure = 'none' | 'rtu' | 'aps' | 'both' | 'identity'

const createResult = (failure: Failure) => ({
  ok: failure === 'none',
  mode: 'optimistic' as const,
  host: '192.168.1.10',
  rtuBaseUrl: 'http://192.168.1.10:6001',
  apsBaseUrl: 'http://192.168.1.10:3000',
  rtu: {
    ok: failure === 'none' || failure === 'aps',
    url: 'http://192.168.1.10:6001/api/user/login',
    statusCode: 401,
    error: null,
    identity: 'unknown' as const,
  },
  aps: {
    ok: failure === 'none' || failure === 'rtu',
    url: 'http://192.168.1.10:3000/api/health',
    statusCode: 200,
    error: null,
    identity: 'aps' as const,
  },
  failure,
})

describe('mapStandPingFailureToKey', () => {
  it('should map identity failure', () => {
    // Arrange
    const result = createResult('identity')

    // Act
    const key = mapStandPingFailureToKey(result)

    // Assert
    expect(key).toBe('StandPingIdentityError')
  })

  it('should map rtu failure', () => {
    // Arrange
    const result = createResult('rtu')

    // Act
    const key = mapStandPingFailureToKey(result)

    // Assert
    expect(key).toBe('StandPingRtuError')
  })

  it('should map aps failure', () => {
    // Arrange
    const result = createResult('aps')

    // Act
    const key = mapStandPingFailureToKey(result)

    // Assert
    expect(key).toBe('StandPingApsError')
  })

  it('should map both failure', () => {
    // Arrange
    const result = createResult('both')

    // Act
    const key = mapStandPingFailureToKey(result)

    // Assert
    expect(key).toBe('StandPingBothError')
  })

  it('should map unknown failure to generic key', () => {
    // Arrange
    const result = createResult('none')

    // Act
    const key = mapStandPingFailureToKey(result)

    // Assert
    expect(key).toBe('StandPingFailed')
  })
})
