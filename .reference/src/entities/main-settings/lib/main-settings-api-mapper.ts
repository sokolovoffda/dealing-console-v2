import type { MainSettings, MainSettingsPatchBody } from '../types'

/** Wire DTO: `null` = системная мелодия по умолчанию */
export type MainSettingsApiDto = Omit<MainSettings, 'incomingRingtoneGuid'> & {
  incomingRingtoneGuid: string | null
}

export type MainSettingsApiPatchBody = Partial<Omit<MainSettings, 'incomingRingtoneGuid'>> & {
  incomingRingtoneGuid?: string | null
}

/** Дублируем допустимые locale без импорта @/shared/i18n (partial mock в vitest). */
const MAIN_SETTINGS_LOCALE_VALUES = new Set<string>([
  'ru-RU',
  'en-GB',
  'zh-CN',
  'zh-TW',
])

const DEFAULT_MAIN_SETTINGS_LOCALE = 'ru-RU' as MainSettings['locale']

export const normalizeLocaleFromApi = (
  locale: string,
  fallback: MainSettings['locale'] = DEFAULT_MAIN_SETTINGS_LOCALE,
): MainSettings['locale'] => {
  if (MAIN_SETTINGS_LOCALE_VALUES.has(locale)) {
    return locale as MainSettings['locale']
  }

  if (locale !== fallback) {
    console.warn('[main-settings] Unknown locale from API, fallback applied:', locale, '→', fallback)
  }

  return fallback
}

export const normalizeMainSettingsFromApi = (data: MainSettingsApiDto): MainSettings => ({
  ...data,
  locale: normalizeLocaleFromApi(data.locale),
  incomingRingtoneGuid: data.incomingRingtoneGuid ?? '',
})

export const sanitizeMainSettingsPatchForApi = (
  patch: MainSettingsPatchBody,
): MainSettingsApiPatchBody => {
  const result: MainSettingsApiPatchBody = { ...patch }

  if (result.incomingRingtoneGuid === '') {
    result.incomingRingtoneGuid = null
  }

  return result
}
