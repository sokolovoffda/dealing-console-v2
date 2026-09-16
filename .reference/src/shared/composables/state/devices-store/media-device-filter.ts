import type {
  AudioInputMediaDevice,
  AudioMediaDevice,
  AudioOutputMediaDevice,
} from './types'

const ECHO_CANCELLED_LABEL_PATTERN = /echo cancelled/i

export const isAudioInputMediaDevice = (
  device: MediaDeviceInfo,
): device is AudioInputMediaDevice => device.kind === 'audioinput'

export const isAudioOutputMediaDevice = (
  device: MediaDeviceInfo,
): device is AudioOutputMediaDevice => device.kind === 'audiooutput'

export const isAudioMediaDevice = (
  device: MediaDeviceInfo,
): device is AudioMediaDevice =>
  isAudioInputMediaDevice(device) || isAudioOutputMediaDevice(device)

export const isDefaultMediaDevice = (device: MediaDeviceInfo): boolean =>
  device.deviceId === 'default'

export const isEchoCancelledMediaDevice = (device: MediaDeviceInfo): boolean =>
  ECHO_CANCELLED_LABEL_PATTERN.test(device.label)

export const isAvailableAudioMediaDevice = (
  device: MediaDeviceInfo,
): device is AudioMediaDevice =>
  isAudioMediaDevice(device) &&
  !isDefaultMediaDevice(device) &&
  !isEchoCancelledMediaDevice(device)

export const filterAvailableAudioMediaDevices = (
  devices: readonly MediaDeviceInfo[],
): AudioMediaDevice[] => devices.filter(isAvailableAudioMediaDevice)
