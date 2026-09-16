import { v4 as uuidv4 } from 'uuid'
import { readonly, ref } from 'vue'

import { getAdditionalApiWebSocketURL } from '@/shared/url-helper'

import {
  CollectDiagnosticsRequestedPayload,
  ControllerCommandLoggedPayload,
  DiagnosticsUploadReportedPayload,
  SessionHelloPayload,
  SessionStageChangedPayload,
  TURRET_SCHEMA_VERSION,
  TurretAdminWsConnectionState,
  TurretWsInboundMessage,
  TurretWsOutboundMessage,
} from './types'

const TURRET_ADMIN_WS_PATH = '/ws/turret'
const HEARTBEAT_INTERVAL_MS = 30_000
const RECONNECT_INITIAL_DELAY_MS = 1_000
const RECONNECT_MAX_DELAY_MS = 30_000
const WEBSOCKET_CLOSE_CODE = 1000

type ConnectParams = {
  clientVersion?: string
  userAgent?: string
}

type TurretWsInboundMessageByType<TType extends TurretWsInboundMessage['type']> = Extract<
  TurretWsInboundMessage,
  { type: TType }
>

let websocket: WebSocket | null = null
let connectParams: ConnectParams = {}
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelayMs = RECONNECT_INITIAL_DELAY_MS
let shouldReconnect = false
let sessionUpgradeToken: string | null = null
let sessionSubscriberPayload: Pick<SessionStageChangedPayload, 'subscriberId' | 'subscriberLogin'> = {}
let controllerIdentityPayload: Pick<SessionStageChangedPayload, 'hardwareMac' | 'hardwareSerial'> = {}
let controllerIsOnline = false

/** Reactive mirror for Settings / overrides hydrate (WUI-5528). */
const hardwareSerial = ref<string | null>(null)
const hardwareMac = ref<string | null>(null)

type CollectDiagnosticsRequestedHandler = (payload: CollectDiagnosticsRequestedPayload) => void

const collectDiagnosticsRequestedHandlers = new Set<CollectDiagnosticsRequestedHandler>()

export const onCollectDiagnosticsRequested = (
  handler: CollectDiagnosticsRequestedHandler,
): (() => void) => {
  collectDiagnosticsRequestedHandlers.add(handler)
  return () => {
    collectDiagnosticsRequestedHandlers.delete(handler)
  }
}

const connectionState = ref<TurretAdminWsConnectionState>('idle')
const connectionId = ref<string | null>(null)
const sessionStage = ref<string | null>(null)
const lastMessage = ref<TurretWsOutboundMessage | null>(null)
const lastError = ref<string | null>(null)
const lastPongAt = ref<string | null>(null)

const getDefaultUserAgent = (): string | undefined => {
  if (typeof navigator === 'undefined') {
    return undefined
  }

  return navigator.userAgent
}

const createSessionHelloPayload = (params: ConnectParams): SessionHelloPayload => {
  const payload: SessionHelloPayload = {}
  const userAgent = params.userAgent || getDefaultUserAgent()

  if (params.clientVersion) {
    payload.clientVersion = params.clientVersion
  }

  if (userAgent) {
    payload.userAgent = userAgent
  }

  return payload
}

export const buildTurretAdminWsMessage = <TType extends TurretWsInboundMessage['type']>(
  type: TType,
  payload: TurretWsInboundMessageByType<TType>['payload'],
): TurretWsInboundMessageByType<TType> => {
  return {
    schemaVersion: TURRET_SCHEMA_VERSION,
    messageId: uuidv4(),
    type,
    occurredAt: new Date().toISOString(),
    payload,
  } as TurretWsInboundMessageByType<TType>
}

const parseOutboundMessage = (data: string): TurretWsOutboundMessage => {
  return JSON.parse(data) as TurretWsOutboundMessage
}

const clearHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

const clearReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const send = (message: TurretWsInboundMessage): boolean => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return false
  }

  console.debug('Sending message to Turret Admin WS:', message)
  websocket.send(JSON.stringify(message))
  return true
}

const sendSessionStage = (payload: SessionStageChangedPayload) => {
  return send(buildTurretAdminWsMessage('SessionStageChanged', {
    ...sessionSubscriberPayload,
    ...payload,
  }))
}

const hasReadyIdentity = () => {
  return Boolean(controllerIdentityPayload.hardwareMac && controllerIdentityPayload.hardwareSerial)
}

const sendCurrentControllerStage = () => {
  if (hasReadyIdentity()) {
    return sendSessionStage({
      stage: 'READY',
      ...controllerIdentityPayload,
    })
  }

  if (controllerIsOnline) {
    return sendSessionStage({ stage: 'CONTROLLER_ONLINE' })
  }

  return false
}

const handleMessage = (message: TurretWsOutboundMessage) => {
  lastMessage.value = message

  switch (message.type) {
  case 'SessionAck':
    connectionId.value = message.payload.connectionId
    sessionStage.value = message.payload.stage
    sendCurrentControllerStage()
    break
  case 'SessionUpgradeAck':
    sessionStage.value = message.payload.stage
    sessionSubscriberPayload = {
      subscriberId: message.payload.subscriberId,
      subscriberLogin: message.payload.subscriberLogin,
    }
    sendSessionStage({ stage: message.payload.stage })
    sendCurrentControllerStage()
    lastError.value = null
    break
  case 'SessionUpgradeRejected':
    lastError.value = message.payload.reason
    break
  case 'SessionError':
    lastError.value = `${message.payload.code}: ${message.payload.message}`
    break
  case 'Pong':
    lastPongAt.value = message.payload.serverTime
    break
  case 'CollectDiagnosticsRequested':
    collectDiagnosticsRequestedHandlers.forEach((handler) => {
      try {
        handler(message.payload)
      } catch (error) {
        console.error(error)
      }
    })
    break
  }
}

const isWebSocketActive = (): boolean => {
  return Boolean(
    websocket
    && (websocket.readyState === WebSocket.CONNECTING || websocket.readyState === WebSocket.OPEN),
  )
}

const startHeartbeat = () => {
  clearHeartbeat()
  heartbeatTimer = setInterval(() => {
    sendSessionHeartbeat()
  }, HEARTBEAT_INTERVAL_MS)
}

const scheduleReconnect = () => {
  if (!shouldReconnect) {
    return
  }

  const delay = reconnectDelayMs
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect(connectParams)
  }, delay)
}

const handleOpen = () => {
  connectionState.value = 'open'
  reconnectDelayMs = RECONNECT_INITIAL_DELAY_MS
  sendSessionHello(createSessionHelloPayload(connectParams))

  if (sessionUpgradeToken) {
    sendSessionUpgrade(sessionUpgradeToken)
  }

  startHeartbeat()
}

const handleIncomingMessage = (event: MessageEvent<string>) => {
  try {
    const message = parseOutboundMessage(event.data)
    console.debug('Incoming message from Turret Admin WS:', message)
    handleMessage(message)
  } catch (e) {
    lastError.value = e instanceof Error ? e.message : 'Invalid Turret Admin WS message'
    console.error(e)
  }
}

const handleClose = () => {
  clearHeartbeat()
  connectionState.value = 'closed'
  websocket = null
  scheduleReconnect()
}

const handleError = () => {
  connectionState.value = 'error'
  lastError.value = 'Turret Admin WebSocket connection error'
  websocket?.close()
}

const connect = (params: ConnectParams = {}): boolean => {
  connectParams = params
  shouldReconnect = true
  clearReconnect()

  if (isWebSocketActive()) {
    return true
  }

  const url = getAdditionalApiWebSocketURL(TURRET_ADMIN_WS_PATH)
  if (!url) {
    lastError.value = 'Turret Admin WebSocket URL is not configured'
    connectionState.value = 'error'
    return false
  }

  connectionState.value = 'connecting'
  lastError.value = null
  console.info('Connecting to Turret Admin WebSocket:', url)

  websocket = new WebSocket(url)
  websocket.onopen = handleOpen
  websocket.onmessage = handleIncomingMessage
  websocket.onclose = handleClose
  websocket.onerror = handleError

  return true
}

const sendSessionHello = (payload: SessionHelloPayload = {}) => {
  return send(buildTurretAdminWsMessage('SessionHello', payload))
}

const sendSessionUpgrade = (token: string) => {
  sessionUpgradeToken = token
  return send(buildTurretAdminWsMessage('SessionUpgrade', { token }))
}

const sendSessionStageChanged = (payload: SessionStageChangedPayload) => {
  return sendSessionStage(payload)
}

const sendSessionHeartbeat = () => {
  return send(buildTurretAdminWsMessage('SessionHeartbeat', {
    occurredAt: new Date().toISOString(),
  }))
}

const sendControllerCommandLogged = (payload: ControllerCommandLoggedPayload) => {
  return send(buildTurretAdminWsMessage('ControllerCommandLogged', payload))
}

const sendDiagnosticsUploadReported = (payload: DiagnosticsUploadReportedPayload) => {
  return send(buildTurretAdminWsMessage('DiagnosticsUploadReported', payload))
}

const clearSessionUpgradeToken = () => {
  sendSessionStage({ stage: 'CONNECTED_UNAUTH' })
  sessionUpgradeToken = null
  sessionSubscriberPayload = {}
}

const sendControllerOnlineStage = () => {
  controllerIsOnline = true
  return sendCurrentControllerStage()
}

const sendControllerOfflineStage = () => {
  controllerIsOnline = false

  if (sessionUpgradeToken || sessionSubscriberPayload.subscriberId) {
    return sendSessionStage({ stage: 'AUTHENTICATED' })
  }

  return sendSessionStage({ stage: 'CONNECTED_UNAUTH' })
}

const updateControllerIdentity = (payload: Pick<SessionStageChangedPayload, 'hardwareMac' | 'hardwareSerial'>) => {
  controllerIsOnline = true
  controllerIdentityPayload = {
    ...controllerIdentityPayload,
    ...(payload.hardwareMac ? { hardwareMac: payload.hardwareMac } : {}),
    ...(payload.hardwareSerial ? { hardwareSerial: payload.hardwareSerial } : {}),
  }

  if (payload.hardwareMac) {
    hardwareMac.value = payload.hardwareMac
  }
  if (payload.hardwareSerial) {
    hardwareSerial.value = payload.hardwareSerial
  }

  return sendCurrentControllerStage()
}

const close = () => {
  shouldReconnect = false
  clearHeartbeat()
  clearReconnect()

  if (
    !websocket
    || websocket.readyState === WebSocket.CLOSED
    || websocket.readyState === WebSocket.CLOSING
  ) {
    websocket = null
    connectionState.value = 'closed'
    return
  }

  websocket.close(WEBSOCKET_CLOSE_CODE)
  websocket = null
  connectionState.value = 'closed'
}

export const useTurretAdminWs = () => {
  return {
    clearSessionUpgradeToken,
    close,
    connect,
    connectionId: readonly(connectionId),
    connectionState: readonly(connectionState),
    hardwareMac: readonly(hardwareMac),
    hardwareSerial: readonly(hardwareSerial),
    lastError: readonly(lastError),
    lastMessage: readonly(lastMessage),
    lastPongAt: readonly(lastPongAt),
    send,
    sendControllerCommandLogged,
    sendDiagnosticsUploadReported,
    sendControllerOfflineStage,
    sendControllerOnlineStage,
    sendSessionHeartbeat,
    sendSessionHello,
    sendSessionStageChanged,
    sendSessionUpgrade,
    updateControllerIdentity,
    sessionStage: readonly(sessionStage),
  }
}
