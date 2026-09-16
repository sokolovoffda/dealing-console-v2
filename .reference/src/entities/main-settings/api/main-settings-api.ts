import axios, { AxiosResponse } from 'axios'

import type { MainSettings, MainSettingsPatchBody } from '@/entities/main-settings'

import { getAdditionalApiURL } from '@/shared/url-helper'

import {
  normalizeMainSettingsFromApi,
  sanitizeMainSettingsPatchForApi,
  type MainSettingsApiDto,
} from '../lib/main-settings-api-mapper'

const MAIN_SETTINGS_PATH = '/api/v1/me/main-settings'

const fetchMainSettings = (): Promise<AxiosResponse<MainSettings>> => {
  return axios
    .get<MainSettingsApiDto>(getAdditionalApiURL({ pathName: MAIN_SETTINGS_PATH }))
    .then((response) => ({
      ...response,
      data: normalizeMainSettingsFromApi(response.data),
    }))
}

const patchMainSettings = (
  payload: MainSettingsPatchBody,
): Promise<AxiosResponse<MainSettings>> => {
  return axios
    .patch<MainSettingsApiDto>(
      getAdditionalApiURL({ pathName: MAIN_SETTINGS_PATH }),
      sanitizeMainSettingsPatchForApi(payload),
    )
    .then((response) => ({
      ...response,
      data: normalizeMainSettingsFromApi(response.data),
    }))
}

export const useMainSettingsApi = () => ({
  fetchMainSettings,
  patchMainSettings,
})
