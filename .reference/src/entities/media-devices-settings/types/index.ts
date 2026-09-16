/** Значения API / runtime: режим микрофона Goose */
export type GooseMicMode = 'stateful' | 'pushToTalk'

/** Значения API / runtime: область PTT Goose */
export type GoosePttScope = 'standard' | 'activePinned'

/**
 * Доменная модель goose-settings на клиенте.
 * `preferredGooseId` ↔ API `preferredGooseModuleId`.
 */
export type GooseSettings = {
  schemaVersion: 1
  preferredGooseId: string | null
  mode: GooseMicMode
  pttScope: GoosePttScope
}

/** Partial body для PUT (клиент); перед отправкой мапится в wire DTO */
export type GooseSettingsPutBody = {
  schemaVersion?: 1
  preferredGooseId?: string | null
  mode?: GooseMicMode
  pttScope?: GoosePttScope
}

/** Полный override одного logical device (GET item) */
export type MediaDeviceOverride = {
  logicalKey: string
  enabled: boolean
  volume: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

/** GET response overrides по hardwareSerial */
export type MediaDeviceOverrides = {
  schemaVersion: 1
  hardwareSerial: string
  devices: MediaDeviceOverride[]
}

/** Partial override для PATCH (required только logicalKey) */
export type MediaDeviceOverridePatch = {
  logicalKey: string
  enabled?: boolean
  volume?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
}

/** PATCH body */
export type MediaDeviceOverridesPatchBody = {
  devices: MediaDeviceOverridePatch[]
}
