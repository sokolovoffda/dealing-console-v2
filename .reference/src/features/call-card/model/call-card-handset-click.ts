import type { CallCardHandsetSlot } from './types'

/** Soft-disable footer: OFF + no activity → no click; OFF + activity → open card for view. */
export const isFooterHandsetClickDisabled = (
  slot: CallCardHandsetSlot | undefined,
  hasActivity: boolean,
): boolean => {
  const isMediaAvailable = Boolean(slot?.isAvailable)
  if (isMediaAvailable) return false
  return !hasActivity
}
