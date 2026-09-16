import {
  getDirtyMainSettingsPatch,
  getDirtyMainSettingsUiPatch,
  MAIN_SETTINGS_UI_KEYS,
  type MainSettings,
} from '@/entities/main-settings'

const baseSettings = (): MainSettings => ({
  isIncomingCallSoundEnabled: true,
  isAutomaticallyConferenceRecordEnabled: true,
  isDialpadHandsetEnabled: true,
  isSelectContactCards: false,
  isCancelForcedAnswerEnabled: true,
  incomingCallVolume: 100,
  locale: 'ru-RU' as MainSettings['locale'],
  showTraining: 'first-launch',
  incomingRingtoneGuid: 'ringtone-guid',
  openCallCardOnHandsetPickup: false,
  autoAnswerOnHandsetPickup: false,
})

describe('getDirtyMainSettingsPatch', () => {
  it('should return empty patch when settings are equal', () => {
    const settings = baseSettings()

    expect(getDirtyMainSettingsPatch(settings, settings)).toEqual({})
  })

  it('should return all changed keys including SODS fields', () => {
    const synced = baseSettings()
    const current: MainSettings = {
      ...synced,
      incomingCallVolume: 50,
      isDialpadHandsetEnabled: false,
    }

    expect(getDirtyMainSettingsPatch(current, synced)).toEqual({
      incomingCallVolume: 50,
      isDialpadHandsetEnabled: false,
    })
  })
})

describe('getDirtyMainSettingsUiPatch', () => {
  it('should ignore SODS-only changes', () => {
    const synced = baseSettings()
    const current: MainSettings = {
      ...synced,
      isDialpadHandsetEnabled: false,
      isSelectContactCards: true,
    }

    expect(getDirtyMainSettingsUiPatch(current, synced)).toEqual({})
  })

  it('should include only changed UI fields', () => {
    const synced = baseSettings()
    const current: MainSettings = {
      ...synced,
      incomingCallVolume: 80,
      showTraining: 'never',
      isDialpadHandsetEnabled: false,
    }

    expect(getDirtyMainSettingsUiPatch(current, synced)).toEqual({
      incomingCallVolume: 80,
      showTraining: 'never',
    })
  })

  it('should list all UI keys without SODS fields', () => {
    expect(MAIN_SETTINGS_UI_KEYS).not.toContain('isDialpadHandsetEnabled')
    expect(MAIN_SETTINGS_UI_KEYS).toContain('showTraining')
  })
})
