import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useDevicesStore } from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'

import { useGooseSettingsApi } from '../api/goose-settings-api'
import { createDefaultGooseSettings } from '../lib/goose-settings-api-mapper'
import type { GooseSettings, GooseSettingsPutBody } from '../types'

const LEGACY_GOOSE_SETTINGS_STORAGE_KEY = 'dealing-console:goose-settings'

const cloneGooseSettings = (value: GooseSettings): GooseSettings => ({ ...value })

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unknown error'
}

const clearLegacyGooseSettingsStorage = () => {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.removeItem(LEGACY_GOOSE_SETTINGS_STORAGE_KEY)
  } catch (error) {
    console.warn('[goose-settings] Failed to clear legacy localStorage key:', error)
  }
}

const readRuntimeGooseSettings = (): GooseSettings => {
  const devicesStore = useDevicesStore()

  return {
    schemaVersion: 1,
    preferredGooseId: devicesStore.preferredGooseId ?? null,
    mode: devicesStore.gooseMode,
    pttScope: devicesStore.goosePttScope,
  }
}

const applyRuntimeGooseSettings = (settings: GooseSettings) => {
  const devicesStore = useDevicesStore()

  devicesStore.setGooseMode(settings.mode)
  devicesStore.setGoosePttScope(settings.pttScope)
  devicesStore.setPreferredGooseId(settings.preferredGooseId ?? undefined)
}

const isSameGooseSettings = (left: GooseSettings, right: GooseSettings): boolean => {
  return (
    (left.preferredGooseId ?? null) === (right.preferredGooseId ?? null)
    && left.mode === right.mode
    && left.pttScope === right.pttScope
  )
}

export const useGooseSettingsStore = defineStore('goose-settings', () => {
  const { fetchGooseSettings, putGooseSettings } = useGooseSettingsApi()

  const loading = ref(true)
  const saving = ref(false)
  const lastSyncedAt = ref<number | null>(null)
  const syncedSettings = ref(cloneGooseSettings(createDefaultGooseSettings()))

  const isDirty = computed(() => !isSameGooseSettings(readRuntimeGooseSettings(), syncedSettings.value))

  const notifySaveError = (error: unknown) => {
    const { showNotification } = useNotification()
    const { t } = useLocalization()

    showNotification({
      type: 'error',
      message: t('GooseSettingsSaveFailed', { error: getErrorMessage(error) }),
    })
  }

  const markSyncedFromRuntime = () => {
    syncedSettings.value = cloneGooseSettings(readRuntimeGooseSettings())
    lastSyncedAt.value = Date.now()
  }

  const applyFromApi = (settings: GooseSettings) => {
    syncedSettings.value = cloneGooseSettings(settings)
    applyRuntimeGooseSettings(settings)
    lastSyncedAt.value = Date.now()
  }

  const rollbackToSynced = () => {
    applyRuntimeGooseSettings(syncedSettings.value)
  }

  const getPutBody = (): GooseSettingsPutBody => {
    const runtime = readRuntimeGooseSettings()

    return {
      schemaVersion: 1,
      preferredGooseId: runtime.preferredGooseId,
      mode: runtime.mode,
      pttScope: runtime.pttScope,
    }
  }

  const saveIfDirty = async () => {
    if (!isDirty.value || saving.value) {
      return
    }

    saving.value = true

    try {
      const { data } = await putGooseSettings(getPutBody())
      applyFromApi(data)
    } catch (error) {
      rollbackToSynced()
      notifySaveError(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  const init = async () => {
    loading.value = true
    clearLegacyGooseSettingsStorage()

    try {
      const { data } = await fetchGooseSettings()
      applyFromApi(data)
    } catch (error) {
      console.error('[goose-settings] Failed to load settings from API:', error)
      applyFromApi(createDefaultGooseSettings())
    } finally {
      loading.value = false
    }
  }

  const resetStore = () => {
    loading.value = true
    saving.value = false
    lastSyncedAt.value = null
    const defaults = createDefaultGooseSettings()
    syncedSettings.value = cloneGooseSettings(defaults)
    applyRuntimeGooseSettings(defaults)
    loading.value = false
  }

  return {
    syncedSettings,
    isDirty,
    loading,
    saving,
    lastSyncedAt,
    getPutBody,
    applyFromApi,
    markSyncedFromRuntime,
    rollbackToSynced,
    saveIfDirty,
    flushPendingSave: saveIfDirty,
    init,
    resetStore,
  }
})
