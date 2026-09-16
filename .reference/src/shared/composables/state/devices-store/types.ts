export type AudioInputMediaDevice = MediaDeviceInfo & {
  kind: 'audioinput'
}

export type AudioOutputMediaDevice = MediaDeviceInfo & {
  kind: 'audiooutput'
}

export type AudioMediaDevice = AudioInputMediaDevice | AudioOutputMediaDevice

export const LogicalMediaDeviceTypeEnum = {
  GOOSE: 'goose',
  HANDSET: 'handset',
  HEADSET: 'headset',
  /** Hub main speaker (controller `hub` / audiolabel Main). */
  MAIN: 'main',
  INPUT: 'input',
  OUTPUT: 'output',
  OTHER: 'other',
} as const

export type LogicalMediaDeviceType =
  typeof LogicalMediaDeviceTypeEnum[keyof typeof LogicalMediaDeviceTypeEnum]

export const LogicalMediaDeviceIconEnum = {
  MIC_SPEAKER: 'micSpeaker',
  PHONE: 'phone',
  HEADSET_MIC: 'headsetMic',
  WORKSPACES: 'workspaces',
  SPEAKER: 'speaker',
  SETTINGS_PHONE: 'settingsPhone',
  RECORD_VOICE_OVER: 'recordVoiceOver',
  MIC: 'mic',
  HEADPHONES: 'headphones',
  AUDIO_CONTROL: 'audioControl',
} as const

export type LogicalMediaDeviceIcon =
  typeof LogicalMediaDeviceIconEnum[keyof typeof LogicalMediaDeviceIconEnum]

export type LogicalMediaDeviceMode = 'stateful' | 'pushToTalk'
export type LogicalMediaDevicePttScope = 'standard' | 'activePinned'
export type LogicalMediaDeviceStatus = 'ready' | 'partial' | 'missing'
export type LogicalMediaDeviceOrigin = 'browser' | 'controller' | 'custom'

export type ControllerMediaModule = {
  position: string
  available: boolean
  id?: string
  name?: string
  type?: number
  audiolabel?: string
  features?: {
    audio_in?: boolean
    audio_out?: boolean
    display?: boolean
  }
  sinks?: string[]
  sources?: string[]
}

export type LogicalMediaDevice = {
  id: string
  name: string
  type: LogicalMediaDeviceType
  order: number
  icon: LogicalMediaDeviceIcon
  iconNumber: string
  inputId?: string
  outputId?: string
  inputLabel?: string
  outputLabel?: string
  module?: string
  controllerDeviceId?: string
  origin: LogicalMediaDeviceOrigin
  hasInput: boolean
  hasOutput: boolean
  status: LogicalMediaDeviceStatus
  mode?: LogicalMediaDeviceMode
  pttScope?: LogicalMediaDevicePttScope
  /** User override: device usable for call media (soft-disable). Default true. */
  enabled: boolean
  /** User override volume 0–100. Main playback still uses globalVolumeMultiplier. */
  volume: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

/** User media fields from overrides; survive logical-device rebuild. */
export type LogicalMediaDeviceUserMediaOverride = {
  enabled: boolean
  volume: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}
