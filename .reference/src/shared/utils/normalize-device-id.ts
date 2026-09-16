/**
 * Нормализует deviceId для использования в mediaConstraints.audio.deviceId
 * 
 * @param deviceId - ID устройства или 'default'
 * @returns Константа для mediaConstraints: { exact: deviceId } или 'default'
 */
export const normalizeAudioDeviceIdConstraint = (
  deviceId: string | undefined | null,
): string | { exact: string } => {
  if (deviceId && deviceId !== 'default') {
    return { exact: deviceId }
  }
  return 'default'
}
