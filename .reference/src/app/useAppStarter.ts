import { UserInfo } from '@wui/common-library'
import { IMApi, useIM } from '@wui/im'

import { name } from '@/../package.json'

import { usePreferencesStore } from '@/entities/preference'

import { useAppStore } from '@/shared/composables'
import { useWebLocation } from '@/shared/composables/useWebLocation'
import { getAbsoluteWebSocketURL } from '@/shared/url-helper'
import { isElectron } from '@/shared/utils/electron-helpers'

const resolveImWebSocketUrl = (): string => {
  if (isElectron()) {
    const url = getAbsoluteWebSocketURL('/im')
    if (!url) {
      throw new Error('IM WebSocket URL is not configured')
    }
    return url
  }

  const { getWebSocketProtocol } = useWebLocation()
  const protocol = getWebSocketProtocol()
  return `${protocol}//${location.host}/im`
}

export const useAppStarter = (currentUser: Readonly<UserInfo>) => {
  const im: IMApi = useIM()

  im.debug.disable()
  if (import.meta.env.DEV) {
    im.debug.enable('CommandAccepted') // только дев
  }

  const imUser = currentUser.imLogin
  const imPassword = currentUser.terminalPassword
  const imTerminalId = 10

  // подрубаем слушатель преференсов юзера в сторе обязательно ДО старта IM
  usePreferencesStore()

  const startIM = (): Promise<boolean> => {
    return im.init(resolveImWebSocketUrl(), {
      login: imUser,
      password: imPassword,
      terminalId: imTerminalId,
      productName: name,
    })
  }

  im.onReady(() => {
    useAppStore().setIMReady(true)
  })

  return {
    startIM,
  }
}
