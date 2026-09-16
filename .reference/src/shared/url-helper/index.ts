import { getApsBaseUrl, getRtuBaseUrl } from '@/shared/stand-config'
import { isElectron } from '@/shared/utils/electron-helpers'

import { normalizeBaseUrl } from './normalizeBaseUrl'

type Protocol = 'wss:' | 'ws:' | 'http:' | 'https:'
type Params = {
  protocol?: Protocol,
  pathName: string
}

const withLeadingSlash = (value: string): string => {
  return value.startsWith('/') ? value : `/${value}`
}

const getElectronServer = (): string | undefined => normalizeBaseUrl(getRtuBaseUrl())
const getAdditionalApiServer = (): string | undefined => normalizeBaseUrl(getApsBaseUrl())

export const getAppURL = (params: Params): string => {
  const { pathName, protocol: paramsProtocol } = params
  try {
    if (isElectron()) {
      const electronServer = getElectronServer()
      if (!electronServer) {
        return pathName
      }

      const { origin, host } = new URL(electronServer)
      if (paramsProtocol) {
        const correctProtocol = paramsProtocol.endsWith(':') ? paramsProtocol : `${paramsProtocol}:`
        return new URL(pathName, `${correctProtocol}//${host}`).href
      }
      return new URL(pathName, origin).href
    }
    return pathName
  } catch (e) {
    console.error(e)
    return pathName
  }
}

export const getAdditionalApiURL = (params: Params): string => {
  const { pathName, protocol: paramsProtocol } = params

  try {
    // Browser dev: same-origin + Vite proxy. Electron/production: absolute additional backend.
    if (import.meta.env.DEV && !isElectron()) {
      return pathName
    }

    const additionalApiServer = getAdditionalApiServer()
    if (!additionalApiServer) {
      return pathName
    }

    const { origin, host } = new URL(additionalApiServer)
    if (paramsProtocol) {
      const correctProtocol = paramsProtocol.endsWith(':') ? paramsProtocol : `${paramsProtocol}:`
      return new URL(pathName, `${correctProtocol}//${host}`).href
    }

    return new URL(pathName, origin).href
  } catch (e) {
    console.error(e)
    return pathName
  }
}

const getAbsoluteAppURL = (path: string): string | undefined => {
  const normalizedPath = withLeadingSlash(path)

  if (!path.startsWith('/')) {
    console.warn('Path should start with "/". Adding "/" automatically.')
  }

  if (isElectron()) {
    const electronServer = getElectronServer()
    return electronServer ? `${electronServer}${normalizedPath}` : undefined
  }

  if (import.meta.env.DEV) {
    return `${window.location.origin}${normalizedPath}`
  }

  return `${window.location.origin}${normalizedPath}`
}

const toWebSocketProtocol = (protocol: string): 'ws:' | 'wss:' | undefined => {
  if (protocol === 'http:') {
    return 'ws:'
  }

  if (protocol === 'https:') {
    return 'wss:'
  }

  return undefined
}

export const getAbsoluteWebSocketURL = (path: string): string | undefined => {
  const appURL = getAbsoluteAppURL(path)

  if (!appURL) {
    return undefined
  }

  const url = new URL(appURL)
  const webSocketProtocol = toWebSocketProtocol(url.protocol)
  if (!webSocketProtocol) {
    return undefined
  }

  url.protocol = webSocketProtocol
  console.debug('WebSocket URL:', url.href)
  return url.href
}

export const getAdditionalApiWebSocketURL = (path: string): string | undefined => {
  const normalizedPath = withLeadingSlash(path)

  if (import.meta.env.DEV && !isElectron()) {
    return getAbsoluteWebSocketURL(normalizedPath)
  }

  const additionalApiServer = getAdditionalApiServer()
  if (!additionalApiServer) {
    return getAbsoluteWebSocketURL(normalizedPath)
  }

  try {
    const url = new URL(normalizedPath, additionalApiServer)
    const webSocketProtocol = toWebSocketProtocol(url.protocol)
    if (!webSocketProtocol) {
      return undefined
    }

    url.protocol = webSocketProtocol
    console.debug('Additional API WebSocket URL:', url.href)
    return url.href
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export const getAppHost = (): string => {
  const webSocketURL = getAbsoluteWebSocketURL('/')
  if (!webSocketURL) {
    throw new Error('Application host is not configured')
  }

  return new URL(webSocketURL).host
}
