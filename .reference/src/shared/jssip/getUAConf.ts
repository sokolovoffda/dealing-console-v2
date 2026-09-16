import { UserInfo } from '@wui/common-library'

import { UAConf } from '@/shared/jssip'
import { getAppHost } from '@/shared/url-helper'

export function getUAConf (
  currentUser: UserInfo,
  domainPath: string,
): UAConf {
  const {
    internalNumber: number,
    terminalLogin: authUser,
    terminalPassword: password,
  } = currentUser

  const host = getAppHost()
  const [domain] = domainPath.split('.')
  let uri
  if (domain === 'ROOT') {
    uri = `sip:${number}@${host}`
  } else {
    uri = `sip:${number}$${domain}@${host}`
  }

  return {
    uri,
    password,
    authorization_user: authUser,
  }
}