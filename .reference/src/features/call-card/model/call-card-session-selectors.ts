import {
  STATE,
  type RTCSessionFacade,
} from '@/entities/call-session'

import {
  type CallCardHandsetId,
  type CallCardHandsetSlot,
  type CallCardSessionRouting,
} from './types'

export {
  getCallCardHandsetSlotById,
  getCallCardHandsetSlots,
  getFirstAvailableCallCardHandsetSlot,
  isCallCardHandsetAvailable,
  resolveCallCardHandsetId,
} from './call-card-handset-slots'

type DeviceSessionKey = string
type SessionId = string

type CallCardSessionLookup = {
  devicesSession: ReadonlyMap<DeviceSessionKey, readonly SessionId[]>
  getSessionById: (id: SessionId) => RTCSessionFacade | undefined
  isPinnedSessionId: (id: SessionId) => boolean
  queueSessions?: readonly RTCSessionFacade[]
  routedSessionHandsetIds?: ReadonlyMap<SessionId, CallCardHandsetId>
}

export const getCallCardSessionById = (
  sessionId: SessionId | null | undefined,
  lookup: CallCardSessionLookup,
): RTCSessionFacade | undefined => {
  if (!sessionId || lookup.isPinnedSessionId(sessionId)) return undefined

  return lookup.getSessionById(sessionId)
}

export const getCallCardSessionsForSlot = (
  slot: CallCardHandsetSlot | undefined,
  lookup: CallCardSessionLookup,
): RTCSessionFacade[] => {
  if (!slot?.runtimeKey) return []

  const sessionIds = lookup.devicesSession.get(slot.runtimeKey) ?? []
  const sessionsById = new Map<SessionId, RTCSessionFacade>()

  sessionIds
    .map(id => getCallCardSessionById(id, lookup))
    .filter((session): session is RTCSessionFacade => Boolean(session))
    .forEach(session => {
      sessionsById.set(session.sessionId, session)
    })

  lookup.queueSessions?.forEach((session) => {
    const routedHandsetId = lookup.routedSessionHandsetIds?.get(session.sessionId)

    if (
      routedHandsetId === slot.id
      && !session.currentDevice.value
      && !lookup.isPinnedSessionId(session.sessionId)
    ) {
      sessionsById.set(session.sessionId, session)
    }
  })

  return Array.from(sessionsById.values())
}

export const isCallCardActiveSession = (
  session: RTCSessionFacade | undefined,
): session is RTCSessionFacade =>
  Boolean(
    session
    && (
      session.sessionState.value === STATE.CONNECTED
      || session.sessionState.value === STATE.PROGRESS
    ),
  )

export const getCallCardActiveSessionForSlot = (
  slot: CallCardHandsetSlot | undefined,
  lookup: CallCardSessionLookup,
): RTCSessionFacade | undefined =>
  getCallCardSessionsForSlot(slot, lookup)
    .find(isCallCardActiveSession)

export const getCallCardSessionDisplayPriority = (
  session: RTCSessionFacade,
): number => {
  if (session.sessionState.value === STATE.CONNECTED) return 0
  if (session.sessionState.value === STATE.PROGRESS) return 1
  if (
    session.direction === 'incoming'
    && session.sessionState.value === STATE.RINGING
  ) {
    return 2
  }
  if (session.sessionState.value === STATE.ONHOLD) return 3

  return 4
}

export const sortCallCardSessionsByDisplayPriority = (
  sessions: readonly RTCSessionFacade[],
): RTCSessionFacade[] =>
  [...sessions].sort((left, right) =>
    getCallCardSessionDisplayPriority(left)
    - getCallCardSessionDisplayPriority(right),
  )

export const getCallCardPreferredSession = (
  sessions: readonly RTCSessionFacade[],
): RTCSessionFacade | undefined =>
  sortCallCardSessionsByDisplayPriority(sessions).at(0)

export const getCallCardSelectedSessionForSlot = (
  slot: CallCardHandsetSlot | undefined,
  selectedSessionId: SessionId | null,
  lookup: CallCardSessionLookup,
): RTCSessionFacade | undefined => {
  const sessions = getCallCardSessionsForSlot(slot, lookup)
  const selectedSession = selectedSessionId
    ? sessions.find(session => session.sessionId === selectedSessionId)
    : undefined

  if (selectedSession) return selectedSession

  return getCallCardPreferredSession(sessions)
}

export const isCallCardSessionRoutedToHandset = (
  routing: CallCardSessionRouting,
  sessionId: SessionId,
  handsetId: CallCardHandsetId,
): boolean =>
  routing.get(sessionId) === handsetId
