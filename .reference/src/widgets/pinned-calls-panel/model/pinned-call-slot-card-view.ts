import { STATE, type RTCSessionFacade } from '@/entities/call-session'

import type { MyBtnIconName } from '@/shared/ui'

/** UI-состояние слота завешенной линии по привязанной сессии. */
export const PINNED_CALL_SLOT_VIEW_STATE = {
  idle: 'idle',
  outgoing: 'outgoing',
  incoming: 'incoming',
  active: 'active',
  hold: 'hold',
} as const

export type PinnedCallSlotViewState =
  typeof PINNED_CALL_SLOT_VIEW_STATE[keyof typeof PINNED_CALL_SLOT_VIEW_STATE]

/**
 * Визуальная матрица карточки (mic / mid / volume / speaker в active):
 * как футер групп + call-accents вне audio-active.
 */
export type PinnedSlotCardVisualState =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'hold'
  | 'inactive'
  | 'inactive-muted'
  | 'active'
  | 'active-muted'

export const resolvePinnedSlotViewState = (
  session?: RTCSessionFacade | null,
): PinnedCallSlotViewState => {
  if (!session) return PINNED_CALL_SLOT_VIEW_STATE.idle

  const state = session.sessionState.value

  if (state === STATE.ONHOLD) return PINNED_CALL_SLOT_VIEW_STATE.hold
  if (state === STATE.CONNECTED) return PINNED_CALL_SLOT_VIEW_STATE.active
  if (state === STATE.ERROR || state === STATE.DISCONNECTED) {
    return PINNED_CALL_SLOT_VIEW_STATE.idle
  }

  if (session.direction === 'incoming') {
    if (state === STATE.RINGING || state === STATE.INITIAL) {
      return PINNED_CALL_SLOT_VIEW_STATE.incoming
    }
  }

  if (state === STATE.PROGRESS || state === STATE.INITIAL) {
    return PINNED_CALL_SLOT_VIEW_STATE.outgoing
  }

  if (state === STATE.RINGING) return PINNED_CALL_SLOT_VIEW_STATE.incoming

  return PINNED_CALL_SLOT_VIEW_STATE.idle
}

/**
 * Локальный hold (мы поставили) — как в call-card (`isOnHold().local` / conf hold).
 * Remote hold снять с нашей стороны нельзя.
 */
export const isPinnedCallLocalHold = (
  session?: RTCSessionFacade | null,
): boolean => {
  if (!session) return false
  if (session.isConfOnHold?.value) return true

  const holdState = session.session?.isOnHold?.() as { local?: boolean } | undefined

  return Boolean(holdState?.local)
}

/** Есть CONNECTED-сессия — можно красить карточку по mic/volume (зелёный/серый). */
export const isPinnedCallAudioConnected = (
  viewState: PinnedCallSlotViewState,
): boolean => {
  return viewState === PINNED_CALL_SLOT_VIEW_STATE.active
}

export const resolvePinnedSlotCardVisualState = (options: {
  viewState: PinnedCallSlotViewState
  isMicOn: boolean
  volumePercent: number
}): PinnedSlotCardVisualState => {
  const { viewState, isMicOn, volumePercent } = options

  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.idle) return 'idle'
  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.outgoing) return 'outgoing'
  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.incoming) return 'incoming'
  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.hold) return 'hold'

  // active: матрица как у футера групп
  const isMuted = volumePercent <= 0

  if (isMicOn) return isMuted ? 'active-muted' : 'active'

  return isMuted ? 'inactive-muted' : 'inactive'
}

/** Mic: не прожат → micM; прожат → micF (как в группах). */
export const resolvePinnedSlotMicIcon = (isMicOn: boolean): 'micF' | 'micM' => {
  return isMicOn ? 'micF' : 'micM'
}

/** Volume/speaker в active: 0 → volumeOffM; > 0 → volumeOnF. */
export const resolvePinnedSlotVolumeIcon = (
  volumePercent: number,
): 'volumeOnF' | 'volumeOffM' => {
  return volumePercent > 0 ? 'volumeOnF' : 'volumeOffM'
}

export const getPinnedCallStatusIcon = (
  viewState: PinnedCallSlotViewState,
  options?: {
    isLineAudible?: boolean
    session?: RTCSessionFacade | null
  },
): MyBtnIconName => {
  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.outgoing) return 'arrowNorthEastM'
  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.incoming) return 'arrowSouthWestM'

  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.active) {
    return resolvePinnedSlotVolumeIcon(options?.isLineAudible === false ? 0 : 1)
  }

  if (viewState === PINNED_CALL_SLOT_VIEW_STATE.hold) {
    // Наш hold → pauseF; чужой/remote → pauseM.
    return isPinnedCallLocalHold(options?.session) ? 'pauseF' : 'pauseM'
  }

  return 'phoneM'
}

/** CSS-модификатор карточки / зон для шага стилей. */
export const resolvePinnedSlotCardVisualModifier = (
  visualState: PinnedSlotCardVisualState,
): string => {
  return `pinned-slot-card--${visualState}`
}

/** Средняя зона без opacity: out/inc только блокируют pointer-events. Idle яркий. */
export const isPinnedCallMidDimmed = (viewState: PinnedCallSlotViewState) => {
  return viewState === PINNED_CALL_SLOT_VIEW_STATE.outgoing
    || viewState === PINNED_CALL_SLOT_VIEW_STATE.incoming
}

/** Volume/center disabled только в dialing; в idle volume остаётся доступным. */
export const isPinnedCallMidDisabled = (viewState: PinnedCallSlotViewState) => {
  return viewState === PINNED_CALL_SLOT_VIEW_STATE.outgoing
    || viewState === PINNED_CALL_SLOT_VIEW_STATE.incoming
}

/**
 * Mic кликабелен только в active/hold (сессия «живая»).
 * Idle / out / inc — приглушён и disabled (в отличие от volume в idle).
 */
export const isPinnedCallMicInteractionDisabled = (
  viewState: PinnedCallSlotViewState,
): boolean => {
  return viewState !== PINNED_CALL_SLOT_VIEW_STATE.active
    && viewState !== PINNED_CALL_SLOT_VIEW_STATE.hold
}

/** Mic приглушён вместе с mid вне active/hold. */
export const isPinnedCallMicDimmed = (viewState: PinnedCallSlotViewState): boolean => {
  return isPinnedCallMicInteractionDisabled(viewState)
}

/**
 * Индекс дубля pServed: показывать, если на этого абонента >1 слота.
 * Значение — `slot.slotIndex` из модели.
 */
export const shouldShowPinnedSlotIndex = (slotsWithSamePServedCount: number): boolean => {
  return slotsWithSamePServedCount > 1
}

/**
 * Тон бейджа индекса (Figma `comp/pinnedline/slot/*`):
 * idle/out/inc/hold → dis; active-линия mic off → def; mic on → act.
 */
export type PinnedSlotIndexTone = 'dis' | 'def' | 'act'

export const resolvePinnedSlotIndexTone = (
  visualState: PinnedSlotCardVisualState,
): PinnedSlotIndexTone => {
  if (visualState === 'active' || visualState === 'active-muted') return 'act'
  if (visualState === 'inactive' || visualState === 'inactive-muted') return 'def'

  return 'dis'
}

/** Серая VD-дорожка на слайдере: есть живая сессия (active/hold), как у групп. */
export const isPinnedSlotVadTrackVisible = (
  viewState: PinnedCallSlotViewState,
): boolean => {
  return viewState === PINNED_CALL_SLOT_VIEW_STATE.active
    || viewState === PINNED_CALL_SLOT_VIEW_STATE.hold
}

/**
 * Ширина синей VD-дорожки 0..100 по remoteVoiceLevel.
 * Без remoteVoiceDetected → 0.
 */
export const resolvePinnedSlotVoiceActivityPercent = (options: {
  hasVoice: boolean
  voiceLevel: number
}): number => {
  if (!options.hasVoice) return 0

  return Math.min(100, Math.max(0, options.voiceLevel))
}
