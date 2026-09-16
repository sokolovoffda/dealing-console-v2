import { UserCapacity, UserInfo } from '@wui/common-library'
import axios from 'axios'
import { defineStore } from 'pinia'
import { readonly, ref, shallowRef, triggerRef } from 'vue'

import {
  diagnosticCategories,
  diagnosticLogLevels,
  trackRendererDiagnosticEvent,
} from '@/features/diagnostics'
import { NetworkInterface } from '@/shared/controller'
import { getAppURL } from '@/shared/url-helper'

export const useAppStore = defineStore('app', () => {
  const onIMReady = ref<boolean>(false)
  const currentUser = ref<UserInfo | undefined>()
  const networkInterfaces = shallowRef<NetworkInterface[]>([])
  const hostname = ref<string>('')
  const capacity = ref<UserCapacity | undefined>() // Емкость
  const isNetworkInfoLoading = ref(false)

  const setCurrentUser = (data: UserInfo) => {
    try {
      currentUser.value = data
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.APP_METADATA,
        level: diagnosticLogLevels.INFO,
        source: 'app-store',
        message: 'Current user metadata updated',
        payload: {
          name: data.name,
          internalNumber: data.internalNumber,
          imLogin: data.imLogin ?? null,
        },
        tags: ['app-metadata-user'],
      })
    } catch (e) {
      console.error(e)
    }
  }

  const clearCurrentUser = () => {
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.APP_METADATA,
      level: diagnosticLogLevels.INFO,
      source: 'app-store',
      message: 'Current user metadata cleared',
      tags: ['app-metadata-user-clear'],
    })
    currentUser.value = undefined
  }

  const setIMReady = (value: boolean) => {
    onIMReady.value = value
  }

  const setNetworkInterfaces = (interfaces: NetworkInterface[]) => {
    networkInterfaces.value = interfaces
    triggerRef(networkInterfaces)
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.APP_METADATA,
      level: diagnosticLogLevels.INFO,
      source: 'app-store',
      message: 'Network interfaces metadata updated',
      payload: {
        interfacesCount: interfaces.length,
      },
      tags: ['app-metadata-network'],
    })
  }

  const setHostname = (name: string) => {
    hostname.value = name
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.APP_METADATA,
      level: diagnosticLogLevels.INFO,
      source: 'app-store',
      message: 'Hostname metadata updated',
      payload: {
        hostname: name,
      },
      tags: ['app-metadata-hostname'],
    })
  }

  const loadCapacity = async ()  => {
    try {
      const response = await axios.get<UserInfo>(getAppURL({ pathName: '/api/user/who-am-i' }))
      capacity.value = response.data.capacity
    } catch (e) {
      console.error(e)
    }
  }

  const setNetworkInfoLoading = (value: boolean) => {
    isNetworkInfoLoading.value = value
  }

  return {
    currentUser: readonly(currentUser),
    onIMReady: readonly(onIMReady),
    interfaces: readonly(networkInterfaces),
    hostname: readonly(hostname),
    capacity: readonly(capacity),
    isNetworkInfoLoading: readonly(isNetworkInfoLoading),
    setCurrentUser,
    clearCurrentUser,
    setIMReady,
    setNetworkInterfaces,
    setHostname,
    loadCapacity,
    setNetworkInfoLoading,
  }
})
