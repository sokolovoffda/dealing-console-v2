import {
  CALL_CARD_HANDSET_IDS,
  CALL_CARD_HANDSET_TITLES,
  type CallCardHandsetId,
  type CallCardHandsetSlot,
} from './types'

type HandsetLogicalDevice = CallCardHandsetSlot['device']

type DeviceSessionKey = string

const CALL_CARD_HANDSET_ORDER: readonly CallCardHandsetId[] = [
  CALL_CARD_HANDSET_IDS.left,
  CALL_CARD_HANDSET_IDS.right,
]

const getDefaultDeviceSessionKey = (
  device: NonNullable<HandsetLogicalDevice>,
): DeviceSessionKey =>
  device.module ?? device.controllerDeviceId ?? device.id

/** Ready + user-enabled handset (soft-disable aware). */
export const isCallCardHandsetAvailable = (
  device: HandsetLogicalDevice | null | undefined,
): device is NonNullable<HandsetLogicalDevice> =>
  Boolean(device && device.status === 'ready' && device.enabled)

export const getCallCardHandsetSlots = (
  handsetDevices: readonly NonNullable<HandsetLogicalDevice>[],
  getDeviceSessionKey = getDefaultDeviceSessionKey,
): CallCardHandsetSlot[] =>
  CALL_CARD_HANDSET_ORDER.map((id, index) => {
    const device = handsetDevices[index] ?? null
    const isAvailable = isCallCardHandsetAvailable(device)

    return {
      id,
      title: CALL_CARD_HANDSET_TITLES[id],
      device,
      runtimeKey: device ? getDeviceSessionKey(device) : null,
      isAvailable,
      disabled: !isAvailable,
    }
  })

export const getCallCardHandsetSlotById = (
  slots: readonly CallCardHandsetSlot[],
  handsetId: CallCardHandsetId,
): CallCardHandsetSlot | undefined =>
  slots.find(slot => slot.id === handsetId)

export const getFirstAvailableCallCardHandsetSlot = (
  slots: readonly CallCardHandsetSlot[],
): CallCardHandsetSlot | undefined =>
  slots.find(slot => slot.isAvailable)

export const resolveCallCardHandsetId = (
  slots: readonly CallCardHandsetSlot[],
  requestedHandsetId: CallCardHandsetId,
): CallCardHandsetId => {
  const requestedSlot = getCallCardHandsetSlotById(slots, requestedHandsetId)

  if (requestedSlot?.isAvailable) return requestedHandsetId

  return getFirstAvailableCallCardHandsetSlot(slots)?.id ?? requestedHandsetId
}
