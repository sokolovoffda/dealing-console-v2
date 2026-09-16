export { useGooseSettingsApi } from './api/goose-settings-api'
export { useMediaDeviceOverridesApi } from './api/media-device-overrides-api'
export {
  createDefaultGooseSettings,
  normalizeGooseSettingsFromApi,
  sanitizeGooseSettingsPutForApi,
} from './lib/goose-settings-api-mapper'
export type {
  GooseSettingsApiDto,
  GooseSettingsApiPutBody,
} from './lib/goose-settings-api-mapper'
export {
  createDefaultMediaDeviceOverride,
  createEmptyMediaDeviceOverrides,
  normalizeMediaDeviceOverridesFromApi,
  sanitizeMediaDeviceOverridesPatchForApi,
} from './lib/media-device-overrides-api-mapper'
export {
  mediaDeviceOverrideToUserFields,
  mediaDeviceOverridesMapToUserFields,
} from './lib/apply-override-to-logical-device'
export type {
  MediaDeviceOverridesApiDto,
  MediaDeviceOverridesApiPatchBody,
} from './lib/media-device-overrides-api-mapper'
export { useGooseMediaSettings } from './model/use-goose-media-settings'
export { useGooseSettingsStore } from './model/use-goose-settings-store'
export {
  MAIN_MEDIA_DEVICE_LOGICAL_KEY,
  useMediaDeviceOverridesStore,
} from './model/use-media-device-overrides-store'
export type * from './types'
export { default as GooseMediaSettingsPanel } from './ui/GooseMediaSettingsPanel.vue'
export { default as SelectDeviceIconDialog } from './ui/SelectDeviceIconDialog.vue'
export { default as MediaDeviceItem } from './ui/MediaDeviceItem.vue'
