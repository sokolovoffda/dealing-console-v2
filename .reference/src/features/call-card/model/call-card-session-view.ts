import {
  STATE,
  type RTCSessionFacade,
} from '@/entities/call-session'
import { useContactCachedStore } from '@/entities/contact'

import {
  CALL_CARD_SESSION_CONTROL_LAYOUTS,
  CALL_CARD_SESSION_VIEW_STATES,
  type CallCardSessionActions,
  type CallCardSessionControlLayout,
  type CallCardSessionDirection,
  type CallCardSessionIconName,
  type CallCardTone,
  type CallCardSessionViewModel,
  type CallCardSessionViewState,
} from './types'

type SessionContactLike = {
  internalNumber?: string
  name?: string
}

type SessionConferenceLike = {
  name?: string
  pServed?: string
}

const getCallCardSessionDirection = (
  session: RTCSessionFacade,
): CallCardSessionDirection =>
  session.direction === 'incoming' ? 'incoming' : 'outgoing'

/** Локальное удержание (мы нажали) — только его можно снять с call-card. */
const isCallCardLocalHold = (session: RTCSessionFacade): boolean => {
  if (session.isConfOnHold?.value) return true

  const holdState = session.session?.isOnHold?.() as { local?: boolean } | undefined

  return Boolean(holdState?.local)
}

export const getCallCardSessionViewState = (
  session: RTCSessionFacade,
): CallCardSessionViewState | null => {
  switch (session.sessionState.value) {
  case STATE.CONNECTED:
    return CALL_CARD_SESSION_VIEW_STATES.active
  case STATE.ONHOLD:
    return CALL_CARD_SESSION_VIEW_STATES.hold
  case STATE.RINGING:
    return CALL_CARD_SESSION_VIEW_STATES.incoming
  case STATE.INITIAL:
  case STATE.PROGRESS:
    return getCallCardSessionDirection(session) === 'incoming'
      ? CALL_CARD_SESSION_VIEW_STATES.incoming
      : CALL_CARD_SESSION_VIEW_STATES.outgoing
  default:
    return null
  }
}

const getCallCardSessionIcon = (
  state: CallCardSessionViewState,
  session: RTCSessionFacade,
): CallCardSessionIconName => {
  switch (state) {
  case CALL_CARD_SESSION_VIEW_STATES.active:
    return 'phoneCallF'
  case CALL_CARD_SESSION_VIEW_STATES.hold:
    // Local hold → F; remote («входящее») hold → M.
    return isCallCardLocalHold(session) ? 'phonePauseF' : 'phonePauseM'
  case CALL_CARD_SESSION_VIEW_STATES.incoming:
    return 'arrowSouthWestM'
  case CALL_CARD_SESSION_VIEW_STATES.outgoing:
    return 'arrowNorthEastM'
  }
}

const getCallCardSessionActions = (
  state: CallCardSessionViewState,
  session: RTCSessionFacade,
): CallCardSessionActions => ({
  canAnswer: state === CALL_CARD_SESSION_VIEW_STATES.incoming,
  canHangup: true,
  canHold: state === CALL_CARD_SESSION_VIEW_STATES.active,
  canOpenDialpad: true,
  canOpenQueue: true,
  canTransfer:
    state === CALL_CARD_SESSION_VIEW_STATES.active
    || state === CALL_CARD_SESSION_VIEW_STATES.hold,
  // Remote hold нельзя снять с нашей стороны.
  canUnhold:
    state === CALL_CARD_SESSION_VIEW_STATES.hold
    && isCallCardLocalHold(session),
})

const getCallCardSessionTone = (
  state: CallCardSessionViewState,
  isHighPriority: boolean,
): CallCardTone => {
  switch (state) {
  case CALL_CARD_SESSION_VIEW_STATES.active:
    return 'callcon'
  case CALL_CARD_SESSION_VIEW_STATES.hold:
  case CALL_CARD_SESSION_VIEW_STATES.outgoing:
    return 'waitcon'
  case CALL_CARD_SESSION_VIEW_STATES.incoming:
    return isHighPriority ? 'negcon' : 'warncon'
  }
}

const getCallCardSessionControlLayout = (
  state: CallCardSessionViewState,
): CallCardSessionControlLayout => {
  switch (state) {
  case CALL_CARD_SESSION_VIEW_STATES.incoming:
  case CALL_CARD_SESSION_VIEW_STATES.outgoing:
    return CALL_CARD_SESSION_CONTROL_LAYOUTS.handsetSwap
  case CALL_CARD_SESSION_VIEW_STATES.active:
  case CALL_CARD_SESSION_VIEW_STATES.hold:
    return CALL_CARD_SESSION_CONTROL_LAYOUTS.sessionCommon
  }
}


const getCallCardSessionName = (session: RTCSessionFacade): string => {
  const contact = getCallCardSessionContact(session)
  const conference = session.conference as SessionConferenceLike | undefined

  return contact?.name
    ?? conference?.name
    ?? session.number
}

const getCallCardSessionNumber = (session: RTCSessionFacade): string => {
  const contact = getCallCardSessionContact(session)
  const conference = session.conference as SessionConferenceLike | undefined

  return contact?.internalNumber
    ?? conference?.pServed
    ?? session.number
}

const getCallCardSessionContact = (
  session: RTCSessionFacade,
): SessionContactLike | undefined => {
  const contactCachedStore = useContactCachedStore()

  return contactCachedStore.getLocalByPServed(session.pServed)
    ?? (session.contact as SessionContactLike | undefined)
}

export const getCallCardSessionViewModel = (
  session: RTCSessionFacade | undefined,
): CallCardSessionViewModel | null => {
  if (!session) return null

  const state = getCallCardSessionViewState(session)

  if (!state) return null

  const isHighPriority = false

  return {
    actions: getCallCardSessionActions(state, session),
    colorStatus: state,
    controlLayout: getCallCardSessionControlLayout(state),
    direction: getCallCardSessionDirection(session),
    duration: session.timer.duration.value,
    icon: getCallCardSessionIcon(state, session),
    isHighPriority,
    name: getCallCardSessionName(session),
    number: getCallCardSessionNumber(session),
    sessionId: session.sessionId,
    state,
    tone: getCallCardSessionTone(state, isHighPriority),
  }
}
