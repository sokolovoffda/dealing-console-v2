import type { MainSettings } from '@/entities/main-settings'
import {
  normalizeLocaleFromApi,
  normalizeMainSettingsFromApi,
  sanitizeMainSettingsPatchForApi,
} from '@/entities/main-settings'

import { Locales } from '@/shared/i18n'

describe('main-settings-api-mapper', () => {
  const baseApiSettings = (): MainSettings => ({
    isIncomingCallSoundEnabled: true,
    isAutomaticallyConferenceRecordEnabled: true,
    isDialpadHandsetEnabled: false,
    isSelectContactCards: false,
    isCancelForcedAnswerEnabled: false,
    incomingCallVolume: 100,
    locale: 'ru-RU' as MainSettings['locale'],
    showTraining: 'first-launch',
    incomingRingtoneGuid: '',
    openCallCardOnHandsetPickup: false,
    autoAnswerOnHandsetPickup: false,
  })

  it('should fallback unknown locale from API to ru-RU', () => {
    expect(normalizeLocaleFromApi('string')).toBe(Locales.RU_RU)
    expect(
      normalizeMainSettingsFromApi({
        ...baseApiSettings(),
        locale: 'string' as MainSettings['locale'],
        incomingCallVolume: 77,
      }),
    ).toMatchObject({
      locale: Locales.RU_RU,
      incomingCallVolume: 77,
    })
  })

  it('should map null ringtone guid from API to empty string in store', () => {
    expect(
      normalizeMainSettingsFromApi({
        ...baseApiSettings(),
        incomingRingtoneGuid: null,
      }),
    ).toMatchObject({
      incomingRingtoneGuid: '',
    })
  })

  it('should map empty ringtone guid patch to null for API', () => {
    expect(
      sanitizeMainSettingsPatchForApi({
        incomingRingtoneGuid: '',
        incomingCallVolume: 80,
      }),
    ).toEqual({
      incomingRingtoneGuid: null,
      incomingCallVolume: 80,
    })
  })

  it('should keep non-empty ringtone guid in patch', () => {
    expect(
      sanitizeMainSettingsPatchForApi({
        incomingRingtoneGuid: 'custom-guid',
      }),
    ).toEqual({
      incomingRingtoneGuid: 'custom-guid',
    })
  })
})
