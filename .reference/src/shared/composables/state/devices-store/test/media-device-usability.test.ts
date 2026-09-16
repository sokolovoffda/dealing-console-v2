import { LogicalMediaDeviceIconEnum, LogicalMediaDeviceTypeEnum, type LogicalMediaDevice } from '../types'
import { isUsableForMediaDevice } from '../media-device-usability'

const createDevice = (
  overrides: Partial<LogicalMediaDevice> = {},
): LogicalMediaDevice => ({
  id: 'goose_L1',
  name: 'Goose',
  type: LogicalMediaDeviceTypeEnum.GOOSE,
  order: 1,
  icon: LogicalMediaDeviceIconEnum.MIC_SPEAKER,
  iconNumber: '1',
  origin: 'controller',
  hasInput: true,
  hasOutput: false,
  status: 'ready',
  enabled: true,
  volume: 50,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  ...overrides,
})

describe('isUsableForMediaDevice', () => {
  it('should accept ready enabled device', () => {
    // Arrange
    const device = createDevice()

    // Act / Assert
    expect(isUsableForMediaDevice(device)).toBe(true)
  })

  it('should reject disabled or not-ready device', () => {
    // Arrange / Act / Assert
    expect(isUsableForMediaDevice(createDevice({ enabled: false }))).toBe(false)
    expect(isUsableForMediaDevice(createDevice({ status: 'missing' }))).toBe(false)
    expect(isUsableForMediaDevice(undefined)).toBe(false)
  })
})
