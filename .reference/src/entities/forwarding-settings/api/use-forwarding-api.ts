import axios, { AxiosResponse } from 'axios'

import {
  ForwardingConditions,
  Forwarding,
  SubscriberService,
  Scenarios,
} from '@/entities/forwarding-settings'

import { getAppURL } from '@/shared/url-helper'

export const useForwardingApi = () => {
  return {
    getForwarding (condition: ForwardingConditions): Promise<AxiosResponse<Forwarding[]>> {
      return axios.get<Forwarding[]>(getAppURL({ pathName: `/api/Forwarding?condition=${condition}` }))
    },
    getSubscriberServices (): Promise<AxiosResponse<SubscriberService>> {
      return axios.get<SubscriberService>(getAppURL({ pathName: '/api/subscriber-service' }))
    },
    getScenarios (): Promise<AxiosResponse<Scenarios>> {
      return axios.get<Scenarios>(getAppURL({ pathName: '/api/Scenario' }))
    },
    removeForwardingItem (guid: string): Promise<AxiosResponse> {
      return axios.delete(getAppURL({ pathName: `/api/Forwarding/${guid}` }))
    },
    addForwarding (forwarding: Forwarding): Promise<AxiosResponse> {
      return axios.post(getAppURL({ pathName: '/api/Forwarding' }), forwarding)
    },
    saveForwarding (forwarding: Forwarding): Promise<AxiosResponse> {
      return axios.put(getAppURL({ pathName: '/api/Forwarding' }), forwarding)
    },
    getTimetableTemplates (): Promise<AxiosResponse> {
      return axios.get(getAppURL({ pathName: '/api/timetable-template' }))
    },
  }
}
