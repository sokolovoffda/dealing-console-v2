import {
  normalizeBaseUrlInput,
  normalizeHostInput,
  normalizeStandConfig,
  resolveFailure,
} from '../../../../electron/stand-config.mjs'

describe('electron/stand-config normalizeStandConfig', () => {
  it('should return null for empty payload', () => {
    // Arrange
    const input = {}

    // Act
    const result = normalizeStandConfig(input)

    // Assert
    expect(result).toBeNull()
  })

  it('should normalize trimmed stand config fields', () => {
    // Arrange
    const input = {
      host: '  192.168.1.10  ',
      rtuBaseUrl: ' https://rtu.example:9999/ ',
      apsBaseUrl: ' http://aps.example:9996/ ',
      mode: 'manual',
    }

    // Act
    const result = normalizeStandConfig(input)

    // Assert
    expect(result).toEqual({
      host: '192.168.1.10',
      rtuBaseUrl: 'https://rtu.example:9999/',
      apsBaseUrl: 'http://aps.example:9996/',
      mode: 'manual',
    })
  })

  it('should reject unknown mode', () => {
    // Arrange
    const input = {
      host: '192.168.1.10',
      mode: 'weird',
    }

    // Act
    const result = normalizeStandConfig(input)

    // Assert
    expect(result).toEqual({
      host: '192.168.1.10',
      rtuBaseUrl: null,
      apsBaseUrl: null,
      mode: null,
    })
  })
})

describe('electron/stand-config normalizeHostInput', () => {
  it('should extract hostname from url', () => {
    // Arrange
    const input = 'https://webclientrtudev.satel.org:9999/path'

    // Act
    const result = normalizeHostInput(input)

    // Assert
    expect(result).toBe('webclientrtudev.satel.org')
  })

  it('should strip port from host:port', () => {
    // Arrange
    const input = '192.168.1.10:6001'

    // Act
    const result = normalizeHostInput(input)

    // Assert
    expect(result).toBe('192.168.1.10')
  })
})

describe('electron/stand-config normalizeBaseUrlInput', () => {
  it('should keep origin for full url with trailing slash', () => {
    // Arrange
    const input = 'https://webclientrtudev.satel.org:9999/'

    // Act
    const result = normalizeBaseUrlInput(input)

    // Assert
    expect(result).toBe('https://webclientrtudev.satel.org:9999')
  })

  it('should add http scheme when missing', () => {
    // Arrange
    const input = '192.168.1.10:3000'

    // Act
    const result = normalizeBaseUrlInput(input)

    // Assert
    expect(result).toBe('http://192.168.1.10:3000')
  })
})

describe('electron/stand-config resolveFailure', () => {
  const okTarget = {
    ok: true,
    url: 'http://example:6001/api/user/login',
    statusCode: 401,
    error: null,
    identity: 'unknown',
  }

  const failedTarget = {
    ok: false,
    url: 'http://example:3000/api/health',
    statusCode: null,
    error: 'Connection timeout',
    identity: null,
  }

  it('should return none when both targets ok', () => {
    // Arrange / Act
    const result = resolveFailure(okTarget, { ...okTarget, identity: 'aps' })

    // Assert
    expect(result).toBe('none')
  })

  it('should return both when both targets failed', () => {
    // Arrange / Act
    const result = resolveFailure(failedTarget, failedTarget)

    // Assert
    expect(result).toBe('both')
  })

  it('should return identity when RTU looks like APS', () => {
    // Arrange
    const rtuLooksLikeAps = {
      ...failedTarget,
      identity: 'aps',
      error: 'RTU URL looks like APS (identity mismatch)',
    }

    // Act
    const result = resolveFailure(rtuLooksLikeAps, { ...okTarget, identity: 'aps' })

    // Assert
    expect(result).toBe('identity')
  })

  it('should return aps when only APS failed', () => {
    // Arrange / Act
    const result = resolveFailure(okTarget, failedTarget)

    // Assert
    expect(result).toBe('aps')
  })
})
