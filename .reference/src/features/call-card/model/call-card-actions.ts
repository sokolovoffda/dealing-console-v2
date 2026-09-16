import type { LogicalMediaDevice } from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'

import type { CallCardHandsetSlot } from './types'

type StartCallCardOutgoingCallConfig = {
  number: string
  handsetSlot: CallCardHandsetSlot | undefined
  extraHeaders?: string[]
}

const getAvailableHandsetDevice = (
  handsetSlot: CallCardHandsetSlot | undefined,
): LogicalMediaDevice | null => {
  if (!handsetSlot?.isAvailable) return null

  return handsetSlot.device
}

export const startCallCardOutgoingCall = (
  config: StartCallCardOutgoingCallConfig,
): boolean => {
  const target = config.number.trim()
  const device = getAvailableHandsetDevice(config.handsetSlot)

  if (!target || !device) return false

  const { switchToCall } = useWebRTC()

  switchToCall(target, device, config.extraHeaders)

  return true
}
