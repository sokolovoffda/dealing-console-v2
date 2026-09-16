import {
  STATE,
  type RTCSessionFacade,
} from '@/entities/call-session'

import type { CallCardHandsetId } from './types'

type DeviceSessionKey = string
type SessionId = string

type RouteIncomingSessionsConfig = {
  devicesSession: ReadonlyMap<DeviceSessionKey, readonly SessionId[]>
  isPinnedSessionId: (id: SessionId) => boolean
  queueSessions: readonly RTCSessionFacade[]
  routedSessionHandsetIds: ReadonlyMap<SessionId, CallCardHandsetId>
  targetHandsetId: CallCardHandsetId | null
}

const isSessionBoundToDevice = (
  session: RTCSessionFacade,
  devicesSession: ReadonlyMap<DeviceSessionKey, readonly SessionId[]>,
): boolean => {
  if (session.currentDevice.value) return true

  for (const sessionIds of devicesSession.values()) {
    if (sessionIds.includes(session.sessionId)) return true
  }

  return false
}

export const isCallCardIncomingRingingSession = (
  session: RTCSessionFacade,
): boolean =>
  session.direction === 'incoming'
  && session.sessionState.value === STATE.RINGING

export const routeCallCardIncomingSessions = (
  config: RouteIncomingSessionsConfig,
): Map<SessionId, CallCardHandsetId> => {
  const nextRouting = new Map<SessionId, CallCardHandsetId>()

  config.routedSessionHandsetIds.forEach((handsetId, sessionId) => {
    const session = config.queueSessions.find(item => item.sessionId === sessionId)

    if (
      session
      && !config.isPinnedSessionId(sessionId)
      && !isSessionBoundToDevice(session, config.devicesSession)
    ) {
      nextRouting.set(sessionId, handsetId)
    }
  })

  const targetHandsetId = config.targetHandsetId

  if (!targetHandsetId) return nextRouting

  config.queueSessions.forEach((session) => {
    if (
      !nextRouting.has(session.sessionId)
      && !config.isPinnedSessionId(session.sessionId)
      && isCallCardIncomingRingingSession(session)
      && !isSessionBoundToDevice(session, config.devicesSession)
    ) {
      nextRouting.set(session.sessionId, targetHandsetId)
    }
  })

  return nextRouting
}
