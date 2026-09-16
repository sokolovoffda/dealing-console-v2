import { vi } from 'vitest'

const isElectronMock = vi.fn(() => true)
const getViteServerElectronMock = vi.fn(() => 'https://env-rtu.example')

vi.mock('@/shared/utils/electron-helpers', () => ({
  isElectron: () => isElectronMock(),
  getViteServerElectron: () => getViteServerElectronMock(),
}))

describe('stand-config runtime urls', () => {
  beforeEach(() => {
    isElectronMock.mockReturnValue(true)
    getViteServerElectronMock.mockReturnValue('https://env-rtu.example')
  })

  afterEach(async () => {
    const { applyStandConfig } = await import('../stand-config-runtime')
    applyStandConfig(null)
    vi.resetModules()
  })

  it('should prefer runtime rtu/aps over env fallback', async () => {
    // Arrange
    const { applyStandConfig, getApsBaseUrl, getRtuBaseUrl } = await import('../stand-config-runtime')
    applyStandConfig({
      host: '192.168.1.10',
      rtuBaseUrl: 'https://runtime-rtu.example:9999',
      apsBaseUrl: 'http://runtime-aps.example:9996',
      mode: 'manual',
    })

    // Act
    const rtu = getRtuBaseUrl()
    const aps = getApsBaseUrl()

    // Assert
    expect(rtu).toBe('https://runtime-rtu.example:9999')
    expect(aps).toBe('http://runtime-aps.example:9996')
  })

  it('should fall back to env rtu when runtime empty in electron', async () => {
    // Arrange
    const { applyStandConfig, getRtuBaseUrl } = await import('../stand-config-runtime')
    applyStandConfig(null)

    // Act
    const rtu = getRtuBaseUrl()

    // Assert
    expect(rtu).toBe('https://env-rtu.example')
  })

  it('should build getAppURL from runtime rtu base', async () => {
    // Arrange
    const { applyStandConfig } = await import('../stand-config-runtime')
    const { getAppURL } = await import('@/shared/url-helper')
    applyStandConfig({
      host: null,
      rtuBaseUrl: 'https://runtime-rtu.example:9999',
      apsBaseUrl: 'http://runtime-aps.example:9996',
      mode: 'manual',
    })

    // Act
    const loginUrl = getAppURL({ pathName: '/api/user/login' })

    // Assert
    expect(loginUrl).toBe('https://runtime-rtu.example:9999/api/user/login')
  })

  it('should build getAdditionalApiURL from runtime aps base', async () => {
    // Arrange
    const { applyStandConfig } = await import('../stand-config-runtime')
    const { getAdditionalApiURL } = await import('@/shared/url-helper')
    applyStandConfig({
      host: null,
      rtuBaseUrl: 'https://runtime-rtu.example:9999',
      apsBaseUrl: 'http://runtime-aps.example:9996',
      mode: 'manual',
    })

    // Act
    const healthUrl = getAdditionalApiURL({ pathName: '/api/health' })

    // Assert
    expect(healthUrl).toBe('http://runtime-aps.example:9996/api/health')
  })
})
