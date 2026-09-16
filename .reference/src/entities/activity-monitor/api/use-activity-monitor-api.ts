import axios, { AxiosResponse } from 'axios'

import { getAdditionalApiURL } from '@/shared/url-helper'

import type {
  ActivityMonitorPanelDto,
  ActivityMonitorSubscriptionDto,
  ActivityMonitorSubscriptionPayload,
  ReorderActivityMonitorSubscriptionsPayload,
  ReplaceActivityMonitorSubscriptionsPayload,
} from '../model/types'

const ACTIVITY_MONITOR_PATH = '/api/v1/me/activity-monitor'
const ACTIVITY_MONITOR_SUBSCRIPTIONS_PATH = `${ACTIVITY_MONITOR_PATH}/subscriptions`

const fetchActivityMonitorPanel = (): Promise<AxiosResponse<ActivityMonitorPanelDto>> => {
  return axios.get<ActivityMonitorPanelDto>(getAdditionalApiURL({ pathName: ACTIVITY_MONITOR_PATH }))
}

const createActivityMonitorSubscription = (
  payload: ActivityMonitorSubscriptionPayload,
): Promise<AxiosResponse<ActivityMonitorSubscriptionDto>> => {
  return axios.post<ActivityMonitorSubscriptionDto>(
    getAdditionalApiURL({ pathName: ACTIVITY_MONITOR_SUBSCRIPTIONS_PATH }),
    payload,
  )
}

const replaceActivityMonitorSubscriptions = (
  payload: ReplaceActivityMonitorSubscriptionsPayload,
): Promise<AxiosResponse<ActivityMonitorPanelDto>> => {
  return axios.put<ActivityMonitorPanelDto>(
    getAdditionalApiURL({ pathName: ACTIVITY_MONITOR_SUBSCRIPTIONS_PATH }),
    payload,
  )
}

const reorderActivityMonitorSubscriptions = (
  payload: ReorderActivityMonitorSubscriptionsPayload,
): Promise<AxiosResponse<ActivityMonitorPanelDto>> => {
  return axios.put<ActivityMonitorPanelDto>(
    getAdditionalApiURL({ pathName: `${ACTIVITY_MONITOR_SUBSCRIPTIONS_PATH}/reorder` }),
    payload,
  )
}

const deleteActivityMonitorSubscription = (
  contactGuid: string,
): Promise<AxiosResponse<void>> => {
  return axios.delete<void>(
    getAdditionalApiURL({ pathName: `${ACTIVITY_MONITOR_SUBSCRIPTIONS_PATH}/${contactGuid}` }),
  )
}

export const useActivityMonitorApi = () => {
  return {
    fetchActivityMonitorPanel,
    createActivityMonitorSubscription,
    replaceActivityMonitorSubscriptions,
    reorderActivityMonitorSubscriptions,
    deleteActivityMonitorSubscription,
  }
}
