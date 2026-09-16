import type { LogicalMediaDevice } from './types'

/** Ready + user-enabled: usable for answer / dial / bind / PTT media. */
export const isUsableForMediaDevice = (
  device: LogicalMediaDevice | null | undefined,
): device is LogicalMediaDevice => {
  return Boolean(device && device.status === 'ready' && device.enabled)
}
