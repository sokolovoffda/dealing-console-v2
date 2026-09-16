import { PServed } from '@wui/im'

import type { Locales } from '@/shared/i18n'

/** Значения API: `showTraining` */
export type ShowTraining = 'first-launch' | 'always' | 'never'

/** GET / PATCH response — плоский DTO Main Settings */
export type MainSettings = {
  isIncomingCallSoundEnabled: boolean
  isAutomaticallyConferenceRecordEnabled: boolean
  isDialpadHandsetEnabled: boolean
  isSelectContactCards: boolean
  isCancelForcedAnswerEnabled: boolean
  incomingCallVolume: number
  locale: Locales
  showTraining: ShowTraining
  incomingRingtoneGuid: string
  openCallCardOnHandsetPickup: boolean
  autoAnswerOnHandsetPickup: boolean
}

export type MainSettingsPatchBody = Partial<MainSettings>

export type CustomRingtone = {
  guid: string,
  path: string,
  categoryGuid: string,
  categoryName: string,
}

export type AudioFilesUsedSpace = {
  allSpace: number, // 5120
  freeSpace: number, // 5120
  usedSpace: number, // 0
}

export type AudioFileTemplate = {
  id: string // "alarm"
  name: string // "Alarm"
  guid: string // "alarm"
  path: string // "/prompt/system/ru/alarm_alarm.wav"
  type: string // "prompt"
  categoryName: string // "Personal sounds"
  owner: string // "ffffffff-ffff-ffff-ffff-ffffffffffff"
  textDescription: string // "alarm"
  description: string // ""
  isCategoryEditable: boolean // false
  isCustomizable: boolean // true
  isCustomizedOriginPrompt: boolean // false
  isCustomizedTargetPrompt: boolean // false
  isDeletable: boolean // false
  isDescriptionEditable: boolean // false
  isFileReplaceable: boolean // false
  isNameEditable: boolean // false
  isTextDescriptionEditable: boolean // false
}

export interface NewAudioFile {
  lang : string,
  categoryName: string,
  categoryGuid: string,
  promptName: string,
  promptDescription?: string,
  promptTextDescription?: string,
}

export interface AudioCategory {
  guid: string,
  owner: string,
  name: string,
  isSystem: boolean,
}

export interface AudioCategoryTemplate {
  guid: string,
  name : string,
  isSystem?: boolean,
}

export interface CustomizedContact {
  pServed: PServed
  ringtoneGuid?: string
  ringtonePath?: string
  color?: string
}
