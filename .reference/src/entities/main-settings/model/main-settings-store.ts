import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useConferenceState, useRoomControl } from '@/entities/conference'

import { Locales, useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'

import { useMainSettingsApi } from '../api/main-settings-api'
import { getDirtyMainSettingsUiPatch, pickMainSettingsUiFields } from '../lib/get-dirty-main-settings-patch'
import type { MainSettings, MainSettingsPatchBody } from '../types'

const LOCALE_STORAGE_KEY = 'i18n'

const readStoredLocale = (): Locales => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locales | null
    if (stored && Object.values(Locales).includes(stored)) {
      return stored
    }
  } catch (e) {
    console.error(e)
  }

  return Locales.RU_RU
}

export const createDefaultMainSettings = (): MainSettings => ({
  isIncomingCallSoundEnabled: true,
  isAutomaticallyConferenceRecordEnabled: true,
  isDialpadHandsetEnabled: false,
  isSelectContactCards: false,
  isCancelForcedAnswerEnabled: false,
  incomingCallVolume: 100,
  openCallCardOnHandsetPickup: false,
  autoAnswerOnHandsetPickup: false,
  locale: readStoredLocale(),
  showTraining: 'first-launch',
  incomingRingtoneGuid: '',
})

const cloneSettings = (value: MainSettings): MainSettings => ({ ...value })

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unknown error'
}

export const useMainSettingsStore = defineStore('main-settings', () => {
  const { fetchMainSettings, patchMainSettings } = useMainSettingsApi()
  const { conferences } = useConferenceState()
  const { roomEnableAutoRecording, roomDisableAutoRecording } = useRoomControl()

  const loading = ref(true)
  const saving = ref(false)
  const lastSyncedAt = ref<number | null>(null)
  const syncedSettings = ref(cloneSettings(createDefaultMainSettings()))
  const settings = ref(cloneSettings(syncedSettings.value))

  const isDirty = computed(
    () => JSON.stringify(settings.value) !== JSON.stringify(syncedSettings.value),
  )

  const notifySaveError = (error: unknown) => {
    const { showNotification } = useNotification()
    const { t } = useLocalization()

    showNotification({
      type: 'error',
      message: t('MainSettingsSaveFailed', { error: getErrorMessage(error) }),
    })
  }

  const applyLocaleFromSettings = async (locale: Locales) => {
    await useLocalization().setLocale(locale)
  }

  const applyLocaleFromSettingsSafe = async (locale: Locales) => {
    try {
      await applyLocaleFromSettings(locale)
    } catch (error) {
      console.error('[main-settings] Failed to apply locale from settings:', locale, error)
      await applyLocaleFromSettings(readStoredLocale())
    }
  }

  const rollbackToSynced = async () => {
    const snapshot = cloneSettings(syncedSettings.value)
    settings.value = snapshot
    await applyLocaleFromSettings(snapshot.locale)
  }

  const patchSettings = (partial: Partial<MainSettings>) => {
    settings.value = { ...settings.value, ...partial }
  }

  const updateSettingsField = <T extends keyof MainSettings>(field: T, value: MainSettings[T]) => {
    patchSettings({ [field]: value } as Partial<MainSettings>)
  }

  const applyFromApi = (apiSettings: MainSettings) => {
    syncedSettings.value = cloneSettings(apiSettings)
    settings.value = cloneSettings(apiSettings)
    lastSyncedAt.value = Date.now()
  }

  const markSynced = () => {
    syncedSettings.value = cloneSettings(settings.value)
    lastSyncedAt.value = Date.now()
  }

  const applyLocale = async (locale: Locales) => {
    patchSettings({ locale })
    await applyLocaleFromSettings(locale)
  }

  const patchToApi = async (patch: MainSettingsPatchBody) => {
    if (Object.keys(patch).length === 0) {
      return
    }

    if (saving.value) {
      return
    }

    saving.value = true

    try {
      const { data } = await patchMainSettings(patch)
      applyFromApi(data)
    } catch (error) {
      await rollbackToSynced()
      notifySaveError(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  /** Локальный сброс UI-полей; SODS-поля сохраняют значения с сервера */
  const resetToDefaults = () => {
    patchSettings(pickMainSettingsUiFields(createDefaultMainSettings()))
  }

  const saveIfDirty = async () => {
    if (!isDirty.value || saving.value) {
      return
    }

    const patch = getDirtyMainSettingsUiPatch(settings.value, syncedSettings.value)

    if (Object.keys(patch).length === 0) {
      markSynced()
      return
    }

    await patchToApi(patch)
  }

  const resetToDefaultsAndSave = async () => {
    if (saving.value) {
      return
    }

    const patch = pickMainSettingsUiFields(createDefaultMainSettings())
    const previousSettings = cloneSettings(settings.value)
    const previousSynced = cloneSettings(syncedSettings.value)

    patchSettings(patch)
    saving.value = true

    try {
      const { data } = await patchMainSettings(patch)
      applyFromApi(data)
      await applyLocaleFromSettingsSafe(data.locale)
    } catch (error) {
      syncedSettings.value = previousSynced
      settings.value = previousSettings
      await applyLocaleFromSettingsSafe(previousSettings.locale)
      notifySaveError(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  const init = async () => {
    loading.value = true

    try {
      const { data } = await fetchMainSettings()
      applyFromApi(data)
      await applyLocaleFromSettingsSafe(data.locale)
    } catch (error) {
      console.error('[main-settings] Failed to load settings from API:', error)
      const defaults = createDefaultMainSettings()
      applyFromApi(defaults)
      await applyLocaleFromSettingsSafe(defaults.locale)
    } finally {
      loading.value = false
    }
  }

  const resetStore = () => {
    loading.value = true
    saving.value = false
    lastSyncedAt.value = null
    const defaults = createDefaultMainSettings()
    syncedSettings.value = cloneSettings(defaults)
    settings.value = cloneSettings(defaults)
    loading.value = false
  }

  watch(
    () => settings.value.isAutomaticallyConferenceRecordEnabled,
    (value) => {
      const fn = value ? roomEnableAutoRecording : roomDisableAutoRecording

      conferences.value.forEach((conf) => {
        fn(conf.pServed).catch(console.error)
      })
    },
  )

  return {
    settings,
    syncedSettings,
    isDirty,
    loading,
    saving,
    lastSyncedAt,
    getDirtyPatch: (): MainSettingsPatchBody =>
      getDirtyMainSettingsUiPatch(settings.value, syncedSettings.value),
    patchSettings,
    updateSettingsField,
    applyFromApi,
    markSynced,
    applyLocale,
    resetToDefaults,
    resetToDefaultsAndSave,
    saveIfDirty,
    flushPendingSave: saveIfDirty,
    init,
    resetStore,
  }
})
