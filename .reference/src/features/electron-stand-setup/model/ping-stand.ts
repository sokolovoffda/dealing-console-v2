import type { StandPingRequest, StandPingResult } from '@/shared/stand-config'
import { isElectron } from '@/shared/utils/electron-helpers'

export const pingStand = async (request: StandPingRequest): Promise<StandPingResult> => {
  if (!isElectron() || typeof window.electronAPI?.pingStandConfig !== 'function') {
    throw new Error('Stand ping is available only in Electron')
  }

  return window.electronAPI.pingStandConfig(request)
}
