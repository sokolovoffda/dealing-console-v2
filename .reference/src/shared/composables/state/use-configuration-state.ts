import axios from 'axios'
import { readonly, Ref, shallowRef } from 'vue'

import { getAppURL } from '@/shared/url-helper'

interface ConfigurationDto {
  domainPath: string
  imWs: string
  selectorServerIPAddress: string
  sipWs: string
}

const DEFAULT_SIP_WS = '/sip'

const innerData: Ref<ConfigurationDto> = shallowRef({} as ConfigurationDto)

const configuration = readonly(innerData)

const fetchConfiguration = async () => {
  try {
    const { data } = await axios.get<ConfigurationDto>(getAppURL({ pathName: '/api/user/configuration' }))
    console.debug('configuration data: ', data)
    innerData.value = {
      ...data,
      sipWs: DEFAULT_SIP_WS,
    }
  } catch (e) {
    console.error(e)
  }
}

export const useConfigurationState = () => {
  return {
    fetchConfiguration,
    configuration,
  }
}
