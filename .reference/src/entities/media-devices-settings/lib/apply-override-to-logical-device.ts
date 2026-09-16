import type { LogicalMediaDeviceUserMediaOverride } from '@/shared/composables'

import type { MediaDeviceOverride } from '../types'

/** Map overrides DTO/working copy → fields applied on LogicalMediaDevice. */
export const mediaDeviceOverrideToUserFields = (
  override: MediaDeviceOverride,
): LogicalMediaDeviceUserMediaOverride => ({
  enabled: override.enabled,
  volume: override.volume,
  echoCancellation: override.echoCancellation,
  noiseSuppression: override.noiseSuppression,
  autoGainControl: override.autoGainControl,
})

export const mediaDeviceOverridesMapToUserFields = (
  byKey: Record<string, MediaDeviceOverride>,
): Record<string, LogicalMediaDeviceUserMediaOverride> => {
  return Object.fromEntries(
    Object.entries(byKey).map(([key, value]) => [key, mediaDeviceOverrideToUserFields(value)]),
  )
}
