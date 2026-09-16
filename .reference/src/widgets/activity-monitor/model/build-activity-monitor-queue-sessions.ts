import { STATE, type RTCSessionFacade } from '@/entities/call-session'

import { isConferenceRoomNumber } from '@/shared/services'

export const isActivityMonitorQueueState = (state: STATE): boolean => {
  return state === STATE.CONNECTED
    || state === STATE.ONHOLD
    || state === STATE.PROGRESS
    || state === STATE.RINGING
}

/** CONNECTED → ONHOLD → RINGING|PROGRESS; без priority. */
export const getActivityMonitorQueueStatePriority = (state: STATE): number => {
  switch (state) {
  case STATE.CONNECTED:
    return 0
  case STATE.ONHOLD:
    return 1
  case STATE.PROGRESS:
  case STATE.RINGING:
    return 2
  default:
    return 3
  }
}

export const isActivityMonitorConferenceSession = (session: RTCSessionFacade): boolean => {
  if (session.conference) return true
  if (isConferenceRoomNumber(session.pServed)) return true
  if (isConferenceRoomNumber(session.number)) return true
  return false
}

export const buildActivityMonitorQueueSessions = (
  handsetSessions: RTCSessionFacade[],
  pinnedSessionIds: Iterable<string>,
  getSessionById: (sessionId: string) => RTCSessionFacade | undefined,
): RTCSessionFacade[] => {
  const byId = new Map<string, RTCSessionFacade>()

  handsetSessions.forEach((session) => {
    byId.set(session.sessionId, session)
  })

  for (const sessionId of pinnedSessionIds) {
    const session = getSessionById(sessionId)
    if (session) byId.set(sessionId, session)
  }

  return Array.from(byId.values())
    .filter((session) => {
      if (isActivityMonitorConferenceSession(session)) return false

      const state = session.sessionState.value
      return isActivityMonitorQueueState(state)
    })
    .slice()
    .sort((left, right) => {
      return getActivityMonitorQueueStatePriority(left.sessionState.value)
        - getActivityMonitorQueueStatePriority(right.sessionState.value)
    })
}
