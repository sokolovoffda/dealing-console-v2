import axios, { AxiosResponse } from 'axios'

import { getAdditionalApiURL } from '@/shared/url-helper'

import type {
  PinnedCallGroupDto,
  PinnedCallGroupMemberDto,
  PinnedCallGroupUpdateBody,
  PinnedCallPanelDto,
  PinnedCallSlotDto,
  PinnedCallSlotPutBody,
  PinnedCallSlotUpsertBody,
  PinnedCallGroupsReorderBody,
  PinnedCallSlotsReorderBody,
  PinnedCallsGroupsLayoutBody,
  PinnedCallsImportBody,
} from '../model/types'

const PINNED_CALLS_PATH = '/api/v1/me/pinned-calls'

const fetchPinnedCallsPanel = (): Promise<AxiosResponse<PinnedCallPanelDto>> => {
  return axios.get<PinnedCallPanelDto>(getAdditionalApiURL({ pathName: PINNED_CALLS_PATH }))
}

const putPinnedCallSlot = (
  order: number,
  payload: PinnedCallSlotPutBody,
): Promise<AxiosResponse<PinnedCallSlotDto | void>> => {
  return axios.put<PinnedCallSlotDto | void>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/slots/${order}` }),
    payload,
  )
}

const upsertPinnedCallSlot = (
  order: number,
  payload: PinnedCallSlotUpsertBody,
): Promise<AxiosResponse<PinnedCallSlotDto>> => {
  return axios.put<PinnedCallSlotDto>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/slots/${order}` }),
    payload,
  )
}

const clearPinnedCallSlot = (order: number): Promise<AxiosResponse<void>> => {
  return axios.put<void>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/slots/${order}` }),
    { clear: true },
  )
}

const reorderPinnedCallSlots = (
  payload: PinnedCallSlotsReorderBody,
): Promise<AxiosResponse<PinnedCallPanelDto>> => {
  return axios.put<PinnedCallPanelDto>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/slots/reorder` }),
    payload,
  )
}

const reorderPinnedCallGroups = (
  payload: PinnedCallGroupsReorderBody,
): Promise<AxiosResponse<PinnedCallPanelDto>> => {
  return axios.put<PinnedCallPanelDto>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/groups/reorder` }),
    payload,
  )
}

const updatePinnedCallGroup = (
  index: number,
  payload: PinnedCallGroupUpdateBody,
): Promise<AxiosResponse<PinnedCallGroupDto>> => {
  return axios.put<PinnedCallGroupDto>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/groups/${index}` }),
    payload,
  )
}

const addPinnedCallGroupMember = (
  index: number,
  payload: PinnedCallGroupMemberDto,
): Promise<AxiosResponse<PinnedCallGroupDto>> => {
  return axios.post<PinnedCallGroupDto>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/groups/${index}/members` }),
    payload,
  )
}

const removePinnedCallGroupMember = (
  index: number,
  payload: PinnedCallGroupMemberDto,
): Promise<AxiosResponse<void>> => {
  return axios.delete<void>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/groups/${index}/members` }),
    { data: payload },
  )
}

const importPinnedCalls = (
  payload: PinnedCallsImportBody,
): Promise<AxiosResponse<PinnedCallPanelDto>> => {
  return axios.put<PinnedCallPanelDto>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/import` }),
    payload,
  )
}

const updatePinnedCallsGroupsLayout = (
  payload: PinnedCallsGroupsLayoutBody,
): Promise<AxiosResponse<PinnedCallPanelDto>> => {
  return axios.put<PinnedCallPanelDto>(
    getAdditionalApiURL({ pathName: `${PINNED_CALLS_PATH}/groups/layout` }),
    payload,
  )
}

export const usePinnedCallsApi = () => {
  return {
    fetchPinnedCallsPanel,
    putPinnedCallSlot,
    upsertPinnedCallSlot,
    clearPinnedCallSlot,
    reorderPinnedCallSlots,
    reorderPinnedCallGroups,
    updatePinnedCallGroup,
    addPinnedCallGroupMember,
    removePinnedCallGroupMember,
    importPinnedCalls,
    updatePinnedCallsGroupsLayout,
  }
}
