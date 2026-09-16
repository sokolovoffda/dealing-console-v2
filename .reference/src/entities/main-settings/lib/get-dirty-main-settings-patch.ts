import type { MainSettings, MainSettingsPatchBody } from '../types'

/** Поля Main Settings, редактируемые в UI dealing-пульта */
export const MAIN_SETTINGS_UI_KEYS: (keyof MainSettings)[] = [
  'isIncomingCallSoundEnabled',
  'isAutomaticallyConferenceRecordEnabled',
  'incomingCallVolume',
  'locale',
  'showTraining',
  'incomingRingtoneGuid',
  'openCallCardOnHandsetPickup',
  'autoAnswerOnHandsetPickup',
]

const assignIfChanged = <K extends keyof MainSettings>(
  patch: MainSettingsPatchBody,
  key: K,
  current: MainSettings,
  synced: MainSettings,
) => {
  if (current[key] !== synced[key]) {
    patch[key] = current[key]
  }
}

const copyField = <K extends keyof MainSettings>(
  target: Partial<MainSettings>,
  key: K,
  source: MainSettings,
) => {
  target[key] = source[key]
}

export const pickMainSettingsUiFields = (source: MainSettings): Partial<MainSettings> => {
  const picked: Partial<MainSettings> = {}

  for (const key of MAIN_SETTINGS_UI_KEYS) {
    copyField(picked, key, source)
  }

  return picked
}

export const getDirtyMainSettingsPatch = (
  current: MainSettings,
  synced: MainSettings,
): MainSettingsPatchBody => {
  const patch: MainSettingsPatchBody = {}

  for (const key of Object.keys(current) as (keyof MainSettings)[]) {
    assignIfChanged(patch, key, current, synced)
  }

  return patch
}

export const getDirtyMainSettingsUiPatch = (
  current: MainSettings,
  synced: MainSettings,
): MainSettingsPatchBody => {
  const patch: MainSettingsPatchBody = {}

  for (const key of MAIN_SETTINGS_UI_KEYS) {
    assignIfChanged(patch, key, current, synced)
  }

  return patch
}
