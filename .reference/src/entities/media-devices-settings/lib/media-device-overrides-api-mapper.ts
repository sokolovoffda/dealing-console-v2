import type {
  MediaDeviceOverride,
  MediaDeviceOverridePatch,
  MediaDeviceOverrides,
  MediaDeviceOverridesPatchBody,
} from '../types'

/** Wire DTO: OpenAPI `MediaDeviceOverridesDto` / `MediaDeviceOverrideDevice` */
export type MediaDeviceOverridesApiDto = {
  schemaVersion: 1
  hardwareSerial: string
  devices: MediaDeviceOverride[]
}

/** Wire DTO: OpenAPI `MediaDeviceOverridesPatchBody` */
export type MediaDeviceOverridesApiPatchBody = {
  devices: MediaDeviceOverridePatch[]
}

const DEFAULT_OVERRIDE: Omit<MediaDeviceOverride, 'logicalKey'> = {
  enabled: true,
  volume: 50,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

export const createDefaultMediaDeviceOverride = (logicalKey: string): MediaDeviceOverride => ({
  logicalKey,
  ...DEFAULT_OVERRIDE,
})

export const createEmptyMediaDeviceOverrides = (hardwareSerial: string): MediaDeviceOverrides => ({
  schemaVersion: 1,
  hardwareSerial,
  devices: [],
})

const clampVolume = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(100, Math.max(0, Math.round(value)))
}

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value
  return fallback
}

const normalizeOverrideDevice = (raw: Partial<MediaDeviceOverride> | null | undefined): MediaDeviceOverride | null => {
  const logicalKey = typeof raw?.logicalKey === 'string' ? raw.logicalKey.trim() : ''
  if (!logicalKey) return null

  return {
    logicalKey,
    enabled: toBoolean(raw?.enabled, DEFAULT_OVERRIDE.enabled),
    volume: clampVolume(raw?.volume, DEFAULT_OVERRIDE.volume),
    echoCancellation: toBoolean(raw?.echoCancellation, DEFAULT_OVERRIDE.echoCancellation),
    noiseSuppression: toBoolean(raw?.noiseSuppression, DEFAULT_OVERRIDE.noiseSuppression),
    autoGainControl: toBoolean(raw?.autoGainControl, DEFAULT_OVERRIDE.autoGainControl),
  }
}

export const normalizeMediaDeviceOverridesFromApi = (
  data: MediaDeviceOverridesApiDto,
  fallbackSerial = '',
): MediaDeviceOverrides => {
  const hardwareSerial =
    typeof data.hardwareSerial === 'string' && data.hardwareSerial.trim()
      ? data.hardwareSerial.trim()
      : fallbackSerial

  const devices = Array.isArray(data.devices)
    ? data.devices
      .map((device) => normalizeOverrideDevice(device))
      .filter((device): device is MediaDeviceOverride => device != null)
    : []

  return {
    schemaVersion: 1,
    hardwareSerial,
    devices,
  }
}

const sanitizeOverridePatchDevice = (
  raw: MediaDeviceOverridePatch,
): MediaDeviceOverridePatch | null => {
  const logicalKey = typeof raw.logicalKey === 'string' ? raw.logicalKey.trim() : ''
  if (!logicalKey) return null

  const result: MediaDeviceOverridePatch = { logicalKey }

  if (raw.enabled !== undefined) result.enabled = Boolean(raw.enabled)
  if (raw.volume !== undefined) result.volume = clampVolume(raw.volume, DEFAULT_OVERRIDE.volume)
  if (raw.echoCancellation !== undefined) result.echoCancellation = Boolean(raw.echoCancellation)
  if (raw.noiseSuppression !== undefined) result.noiseSuppression = Boolean(raw.noiseSuppression)
  if (raw.autoGainControl !== undefined) result.autoGainControl = Boolean(raw.autoGainControl)

  return result
}

export const sanitizeMediaDeviceOverridesPatchForApi = (
  body: MediaDeviceOverridesPatchBody,
): MediaDeviceOverridesApiPatchBody => {
  const devices = Array.isArray(body.devices)
    ? body.devices
      .map((device) => sanitizeOverridePatchDevice(device))
      .filter((device): device is MediaDeviceOverridePatch => device != null)
    : []

  return { devices }
}
