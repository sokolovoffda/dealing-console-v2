import axios, { AxiosResponse } from 'axios'

import { getAdditionalApiURL } from '@/shared/url-helper'

import {
  normalizeMediaDeviceOverridesFromApi,
  sanitizeMediaDeviceOverridesPatchForApi,
  type MediaDeviceOverridesApiDto,
} from '../lib/media-device-overrides-api-mapper'
import type { MediaDeviceOverrides, MediaDeviceOverridesPatchBody } from '../types'

const mediaDeviceOverridesPath = (hardwareSerial: string) =>
  `/api/v1/me/media-device-overrides/${encodeURIComponent(hardwareSerial)}`

const fetchMediaDeviceOverrides = (
  hardwareSerial: string,
): Promise<AxiosResponse<MediaDeviceOverrides>> => {
  return axios
    .get<MediaDeviceOverridesApiDto>(
      getAdditionalApiURL({ pathName: mediaDeviceOverridesPath(hardwareSerial) }),
    )
    .then((response) => ({
      ...response,
      data: normalizeMediaDeviceOverridesFromApi(response.data, hardwareSerial),
    }))
}

const patchMediaDeviceOverrides = (
  hardwareSerial: string,
  payload: MediaDeviceOverridesPatchBody,
): Promise<AxiosResponse<MediaDeviceOverrides>> => {
  return axios
    .patch<MediaDeviceOverridesApiDto>(
      getAdditionalApiURL({ pathName: mediaDeviceOverridesPath(hardwareSerial) }),
      sanitizeMediaDeviceOverridesPatchForApi(payload),
    )
    .then((response) => ({
      ...response,
      data: normalizeMediaDeviceOverridesFromApi(response.data, hardwareSerial),
    }))
}

export const useMediaDeviceOverridesApi = () => ({
  fetchMediaDeviceOverrides,
  patchMediaDeviceOverrides,
})
