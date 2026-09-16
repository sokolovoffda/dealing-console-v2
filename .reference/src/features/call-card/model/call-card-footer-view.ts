import type { RTCSessionFacade } from '@/entities/call-session'

import { isFooterHandsetClickDisabled } from './call-card-handset-click'
import { getCallCardSessionViewModel } from './call-card-session-view'
import {
  CALL_CARD_HANDSET_IDS,
  CALL_CARD_HANDSET_TITLES,
  CALL_CARD_SESSION_VIEW_STATES,
  type CallCardFooterHandsetIconName,
  type CallCardFooterHandsetView,
  type CallCardHandsetId,
  type CallCardHandsetSlot,
  type CallCardSessionViewModel,
} from './types'

export const getCallCardFooterIndicatorPriority = (
  session: RTCSessionFacade,
): number => {
  const view = getCallCardSessionViewModel(session)

  if (!view) return Number.MAX_SAFE_INTEGER
  if (
    view.state === CALL_CARD_SESSION_VIEW_STATES.incoming
    && view.isHighPriority
  ) {
    return 0
  }
  if (view.state === CALL_CARD_SESSION_VIEW_STATES.incoming) return 1
  if (view.state === CALL_CARD_SESSION_VIEW_STATES.outgoing) return 2
  if (view.state === CALL_CARD_SESSION_VIEW_STATES.active) return 3
  if (view.state === CALL_CARD_SESSION_VIEW_STATES.hold) return 4

  return Number.MAX_SAFE_INTEGER
}

export const getCallCardFooterIndicatorSession = (
  sessions: readonly RTCSessionFacade[],
): RTCSessionFacade | undefined =>
  [...sessions].sort((left, right) =>
    getCallCardFooterIndicatorPriority(left) - getCallCardFooterIndicatorPriority(right),
  ).at(0)

const resolveCallCardFooterIconName = (
  view: CallCardSessionViewModel,
  handsetId: CallCardHandsetId,
): CallCardFooterHandsetIconName => {
  if (
    handsetId === CALL_CARD_HANDSET_IDS.right
    && view.icon === 'arrowNorthEastM'
  ) {
    return 'arrowNorthWestM'
  }

  if (
    handsetId === CALL_CARD_HANDSET_IDS.right
    && view.icon === 'arrowSouthWestM'
  ) {
    return 'arrowSouthEastM'
  }

  if (
    handsetId === CALL_CARD_HANDSET_IDS.right
    && view.icon === 'phoneCallF'
  ) {
    return 'phoneCallInvF'
  }

  if (
    handsetId === CALL_CARD_HANDSET_IDS.right
    && view.icon === 'phonePauseM'
  ) {
    return 'phonePauseInvM'
  }

  if (
    handsetId === CALL_CARD_HANDSET_IDS.right
    && view.icon === 'phonePauseF'
  ) {
    return 'phonePauseInvF'
  }

  return view.icon
}

export const getFreeCallCardFooterHandsetView = (
  handsetId: CallCardHandsetId,
  slot: CallCardHandsetSlot | undefined,
): CallCardFooterHandsetView => ({
  disabled: isFooterHandsetClickDisabled(slot, false),
  icon: handsetId === CALL_CARD_HANDSET_IDS.left ? 'phoneM' : 'phoneInvM',
  id: handsetId,
  statusText: 'Свободна',
  title: slot?.title ?? CALL_CARD_HANDSET_TITLES[handsetId],
  tone: 'neutcon',
})

export const getCallCardFooterHandsetView = (
  handsetId: CallCardHandsetId,
  slot: CallCardHandsetSlot | undefined,
  session: RTCSessionFacade | undefined,
): CallCardFooterHandsetView => {
  const sessionView = getCallCardSessionViewModel(session)

  if (!sessionView) return getFreeCallCardFooterHandsetView(handsetId, slot)

  return {
    disabled: isFooterHandsetClickDisabled(slot, true),
    icon: resolveCallCardFooterIconName(sessionView, handsetId),
    id: handsetId,
    statusText: sessionView.name || sessionView.number || 'Вызов',
    title: sessionView.number || CALL_CARD_HANDSET_TITLES[handsetId],
    tone: sessionView.tone,
  }
}
