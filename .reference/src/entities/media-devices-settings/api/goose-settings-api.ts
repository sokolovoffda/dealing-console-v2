import axios, { AxiosResponse } from 'axios'

import { getAdditionalApiURL } from '@/shared/url-helper'

import {
  normalizeGooseSettingsFromApi,
  sanitizeGooseSettingsPutForApi,
  type GooseSettingsApiDto,
} from '../lib/goose-settings-api-mapper'
import type { GooseSettings, GooseSettingsPutBody } from '../types'

const GOOSE_SETTINGS_PATH = '/api/v1/me/goose-settings'

const fetchGooseSettings = (): Promise<AxiosResponse<GooseSettings>> => {
  return axios
    .get<GooseSettingsApiDto>(getAdditionalApiURL({ pathName: GOOSE_SETTINGS_PATH }))
    .then((response) => ({
      ...response,
      data: normalizeGooseSettingsFromApi(response.data),
    }))
}

const putGooseSettings = (
  payload: GooseSettingsPutBody,
): Promise<AxiosResponse<GooseSettings>> => {
  return axios
    .put<GooseSettingsApiDto>(
      getAdditionalApiURL({ pathName: GOOSE_SETTINGS_PATH }),
      sanitizeGooseSettingsPutForApi(payload),
    )
    .then((response) => ({
      ...response,
      data: normalizeGooseSettingsFromApi(response.data),
    }))
}

export const useGooseSettingsApi = () => ({
  fetchGooseSettings,
  putGooseSettings,
})
