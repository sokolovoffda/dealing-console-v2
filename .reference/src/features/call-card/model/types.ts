import type { RTCSessionFacade } from '@/entities/call-session'

import type { LogicalMediaDevice } from '@/shared/composables'

export const CALL_CARD_HANDSET_IDS = {
  left: 'left',
  right: 'right',
} as const

export type CallCardHandsetId =
  typeof CALL_CARD_HANDSET_IDS[keyof typeof CALL_CARD_HANDSET_IDS]

export const CALL_CARD_HANDSET_TITLES: Record<CallCardHandsetId, string> = {
  left: 'Левая',
  right: 'Правая',
}

export const CALL_CARD_PANEL_MODES = {
  none: 'none',
  dialpad: 'dialpad',
  history: 'history',
  queue: 'queue',
} as const

export type CallCardPanelMode =
  typeof CALL_CARD_PANEL_MODES[keyof typeof CALL_CARD_PANEL_MODES]

export type CallCardHandsetSlot = {
  id: CallCardHandsetId
  title: string
  device: LogicalMediaDevice | null
  runtimeKey: string | null
  isAvailable: boolean
  disabled: boolean
}

export type CallCardHandsetState = {
  selectedSessionId: string | null
  queueVirtualPosition: CallCardQueueVirtualPosition | null
  panelMode: CallCardPanelMode
  dialBuffer: string
  dialContactName: string
  dialSelectionStart: number | null
  dialSelectionEnd: number | null
  transferState: CallCardTransferState
  isMuted: boolean
  volume: number
}

export type CallCardHandsetSessions = Record<
  CallCardHandsetId,
  RTCSessionFacade | undefined
>

export type CallCardHandsetSessionQueues = Record<
  CallCardHandsetId,
  RTCSessionFacade[]
>

export type CallCardSessionRouting = Map<string, CallCardHandsetId>

export type CallCardQueueVirtualPosition = 'before' | 'after'

export type CallCardTransferState = {
  consultationStage: 'idle' | 'starting' | 'active'
  sourceSessionId: string | null
  targetName: string
  targetNumber: string
  targetSelectionStart: number | null
  targetSelectionEnd: number | null
  targetSessionId: string | null
}

export const CALL_CARD_SESSION_VIEW_STATES = {
  active: 'active',
  hold: 'hold',
  incoming: 'incoming',
  outgoing: 'outgoing',
} as const

export type CallCardSessionViewState =
  typeof CALL_CARD_SESSION_VIEW_STATES[keyof typeof CALL_CARD_SESSION_VIEW_STATES]

export const CALL_CARD_SESSION_CONTROL_LAYOUTS = {
  handsetSwap: 'handsetSwap',
  outgoing: 'outgoing',
  sessionCommon: 'sessionCommon',
  transfer: 'transfer',
} as const

export type CallCardSessionControlLayout =
  typeof CALL_CARD_SESSION_CONTROL_LAYOUTS[keyof typeof CALL_CARD_SESSION_CONTROL_LAYOUTS]

export type CallCardTone =
  | 'neutcon'
  | 'waitcon'
  | 'callcon'
  | 'warncon'
  | 'negcon'

export type CallCardSessionDirection = 'incoming' | 'outgoing'

export type CallCardSessionIconName =
  | 'arrowNorthEastM'
  | 'arrowNorthWestM'
  | 'arrowSouthWestM'
  | 'arrowSouthEastM'
  | 'phoneCallF'
  | 'phoneCallInvF'
  | 'phonePauseF'
  | 'phonePauseM'
  | 'arrowSouthWestInvM'
  | 'phonePauseInvF'
  | 'phonePauseInvM'

export type CallCardSessionActions = {
  canAnswer: boolean
  canHangup: boolean
  canHold: boolean
  canOpenDialpad: boolean
  canOpenQueue: boolean
  canTransfer: boolean
  canUnhold: boolean
}

export type CallCardSessionViewModel = {
  actions: CallCardSessionActions
  colorStatus: CallCardSessionViewState
  controlLayout: CallCardSessionControlLayout
  direction: CallCardSessionDirection
  duration: string
  icon: CallCardSessionIconName
  isHighPriority: boolean
  name: string
  number: string
  sessionId: string
  state: CallCardSessionViewState
  tone: CallCardTone
}

export type CallCardFooterHandsetIconName =
  | 'phoneM'
  | 'phoneInvM'
  | CallCardSessionIconName

export type CallCardFooterHandsetView = {
  disabled: boolean
  icon: CallCardFooterHandsetIconName
  id: CallCardHandsetId
  statusText: string
  title: string
  tone: CallCardTone
}

export const CALL_CARD_DEFAULT_VOLUME = 1

export const CALL_CARD_DEFAULT_HANDSET_ID: CallCardHandsetId =
  CALL_CARD_HANDSET_IDS.left
