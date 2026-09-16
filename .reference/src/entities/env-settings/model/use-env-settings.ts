import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, Ref, ref } from 'vue'

import { getViteServerElectron, isElectron } from '@/shared/utils/electron-helpers'
import {getAppURL} from "@/shared/url-helper";

export interface EnvSettingsDto {
  section?: string;
  key: string;
  value: string;
}

export const useEnvSettingsStore = defineStore('env-settings', () => {
  const settings: Ref<EnvSettingsDto[]> = ref([])
  const isLoading = ref(false)

  const getSettingByKey = computed(() => {
    return (key: string) => settings.value.find(s => s.key === key)
  })

  const loadAllSettings = (): Promise<EnvSettingsDto[]> => {
    return new Promise((resolve, reject) => {
      isLoading.value = true
      axios
        .get<EnvSettingsDto[]>(getAppURL({ pathName: '/api/env/settings' }))
        .then((response: { status: number; data: EnvSettingsDto[] | PromiseLike<EnvSettingsDto[]> }) => {
          if (response.status === 200) {
            setSettings(response.data as [])
            resolve(response.data)
          } else {
            reject(new Error('Во время запроса произошла ошибка ' + response.status ))
          }
        })
        .catch((e: unknown) => reject(e))
        .finally(() => isLoading.value = false)
    })
  }

  const setSettings = (settingsPayload: EnvSettingsDto[]) => {
    settings.value = settingsPayload
  }

  return {
    settings,
    isLoading,
    getSettingByKey,
    loadAllSettings,
  }
})
