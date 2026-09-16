import axios, { AxiosResponse } from 'axios'

import { getAdditionalApiURL } from '@/shared/url-helper'

import type {
  CreateFastDialGroupPayload,
  FastDialGroupDto,
  FastDialPanelDto,
  ReorderFastDialGroupPayload,
  UpdateFastDialGroupPayload,
} from '../model/types'

const fetchFastDialPanel = (): Promise<AxiosResponse<FastDialPanelDto>> => {
  return axios.get<FastDialPanelDto>(getAdditionalApiURL({ pathName: '/api/v1/me/fast-dial' }))
}

const createFastDialGroup = (payload: CreateFastDialGroupPayload): Promise<AxiosResponse<FastDialGroupDto>> => {
  return axios.post<FastDialGroupDto>(getAdditionalApiURL({ pathName: '/api/v1/me/fast-dial/groups' }), payload)
}

const reorderFastDialGroup = (payload: ReorderFastDialGroupPayload): Promise<AxiosResponse<FastDialPanelDto>> => {
  return axios.put<FastDialPanelDto>(getAdditionalApiURL({ pathName: '/api/v1/me/fast-dial/groups/reorder' }), payload)
}

const updateFastDialGroup = (
  id: string,
  payload: UpdateFastDialGroupPayload,
): Promise<AxiosResponse<FastDialGroupDto>> => {
  return axios.put<FastDialGroupDto>(getAdditionalApiURL({ pathName: `/api/v1/me/fast-dial/groups/${id}` }), payload)
}

const deleteFastDialGroup = (id: string): Promise<AxiosResponse<void>> => {
  return axios.delete<void>(getAdditionalApiURL({ pathName: `/api/v1/me/fast-dial/groups/${id}` }))
}

export const useFastDialApi = () => {
  return {
    fetchFastDialPanel,
    createFastDialGroup,
    reorderFastDialGroup,
    updateFastDialGroup,
    deleteFastDialGroup,
  }
}
