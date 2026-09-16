import { PServed, useIM } from '@wui/im'
import { defineStore } from 'pinia'
import { readonly, ref } from 'vue'

import { BindingControllerButtonPreferenceValue, useBindingControllerButtonsStore } from '@/entities/binding-contacts'
import { usePinnedCallsStore } from '@/entities/call-session'
import { GroupContacts, useGroupContactsStore } from '@/entities/group-contacts'
import { CustomizedContact, useCustomizeStore, useMainSettingsStore } from '@/entities/main-settings'
import { useGooseSettingsStore, useMediaDeviceOverridesStore } from '@/entities/media-devices-settings'

import { useNotification } from '@/shared/notifications'

const PREFERENCES_VERSION = 8
const allowedKeys = ['pinnedCalls', 'pinnedCallsGroups', 'tabs', 'bindings', 'version', 'ringtones', 'customize'] as const
type AllowedKey = typeof allowedKeys[number]

export const usePreferencesStore = defineStore('preferences', () => {
  const DEFAULT_PREFERENCES_STATE: Record<AllowedKey, unknown> = {
    pinnedCalls: {},
    pinnedCallsGroups: undefined,
    tabs: undefined,
    bindings: undefined,
    ringtones: undefined,
    customize: undefined,
    version: PREFERENCES_VERSION,
  }
  const preferences = ref<Record<AllowedKey, unknown>>({ ...DEFAULT_PREFERENCES_STATE })

  const isLoaded = ref(false)
  const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  useIM().onPreference((event) => {
    const eventPreferences = isObjectRecord(event.preferences) ? event.preferences : undefined
    const version = eventPreferences?.version
    if (version !== PREFERENCES_VERSION) {
      // Пока только логируем несовпадение версии preferences.
      console.warn('Version preferences does not match: ', `old-version: ${version}`, `actual-version: ${PREFERENCES_VERSION}`)
    }

    if (!eventPreferences || !('pinnedCalls' in eventPreferences)) {
      // Первый вход пользователя: сохраняем дефолтное состояние preferences.
      const defaultPreferences = { ...DEFAULT_PREFERENCES_STATE }
      preferences.value = defaultPreferences
      useIM().setPreference(defaultPreferences)
    }

    if (eventPreferences && Object.keys(eventPreferences).length > 0 && allowedKeys.some(key => key in eventPreferences)) {
      (Object.keys(eventPreferences) as AllowedKey[]).forEach((key) => {
        // Библиотека возвращает объект настроек, поэтому сохраняем значения как есть.
        setPreferences(key, eventPreferences[key], false)
      })
    }

    console.debug('Loaded preferences event', event)
    if (!isLoaded.value) {
      usePinnedCallsStore().loadByPreferences(eventPreferences?.['pinnedCalls'] as Record<PServed, unknown> | undefined)
      useGroupContactsStore().loadByPreferences(eventPreferences?.['pinnedCallsGroups'] as Record<number, GroupContacts> | undefined)
      // useContactTabs().loadByPreferences(eventPreferences?.['tabs'] as Record<TabId, Tab> | undefined)
      useBindingControllerButtonsStore().loadByPreferences(eventPreferences?.['bindings'] as Record<string, BindingControllerButtonPreferenceValue> | undefined)
      useMainSettingsStore().init()
      useGooseSettingsStore().init()
      useMediaDeviceOverridesStore().init()
      useCustomizeStore().loadByPreferences(eventPreferences?.['customize'] as Record<PServed, CustomizedContact> | undefined)
      isLoaded.value = true
    }
  })

  const setPreferences = async (key: AllowedKey, value: unknown, needSave: boolean = true) => {
    if(!allowedKeys.includes(key)) {
      console.warn('Preference key not allowed', key)
      return
    }
    try {
      const result = { ...preferences.value, [key]: value }
      preferences.value = result
      if (needSave) {
        await useIM().setPreference(result)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const clearPreferences = async () => {
    try {
      await useIM().setPreference({ ...DEFAULT_PREFERENCES_STATE })
    } catch (e) {
      const { showNotification } = useNotification()
      showNotification({
        type: 'error',
        message: (e as unknown as Error).message,
      })
      console.error(e)
    }
  }

  const getPreferences = (key: AllowedKey) => {
    return preferences.value[key] as Record<PServed, unknown> | undefined
  }

  return {
    preferences: readonly(preferences),
    clearPreferences,
    setPreferences,
    getPreferences,
    $reset: () => {
      isLoaded.value = false
      preferences.value = { ...DEFAULT_PREFERENCES_STATE }
    },
  }
})
