import { STATE, type RTCSessionFacade } from '@/entities/call-session'
import {
  PINNED_CALLS_GROUP_INITIAL_MIC_STATE,
  PINNED_CALLS_INITIAL_VOLUME,
  type PinnedCallGroup,
} from '@/entities/pinned-calls'

/**
 * Визуальные состояния футера (см. case.md матрицу):
 * disabled | inactive | inactive-muted | active | active-muted
 * (= п.1 … п.5)
 */
export type BroadcastGroupFooterVisualState =
  | 'disabled'
  | 'inactive'
  | 'inactive-muted'
  | 'active'
  | 'active-muted'

/** У участника есть активная сессия (без VAD). */
export const isBroadcastMemberSessionActive = (
  session?: RTCSessionFacade | null,
): boolean => {
  if (!session) return false

  const state = session.sessionState.value

  return state === STATE.CONNECTED || state === STATE.ONHOLD
}

/**
 * Матрица футера:
 * - disabled / edit / нет активности → disabled (п.1)
 * - active + mic off + vol > 0 → inactive (п.2)
 * - active + mic off + vol = 0 → inactive-muted (п.3)
 * - active + mic on + vol > 0 → active (п.4)
 * - active + mic on + vol = 0 → active-muted (п.5)
 */
export const resolveBroadcastGroupFooterVisualState = (options: {
  forceDisabled: boolean
  hasActiveSession: boolean
  isMicOn: boolean
  volumePercent: number
}): BroadcastGroupFooterVisualState => {
  if (options.forceDisabled || !options.hasActiveSession) return 'disabled'

  const isMuted = options.volumePercent <= 0

  if (options.isMicOn) return isMuted ? 'active-muted' : 'active'

  return isMuted ? 'inactive-muted' : 'inactive'
}

export const resolveBroadcastGroupMicState = (
  group: PinnedCallGroup | null | undefined,
): boolean => {
  return group?.micState ?? PINNED_CALLS_GROUP_INITIAL_MIC_STATE
}

/** Общий уровень слышимости группы для слайдера (0..100) — intent группы, не reverse-sync. */
export const resolveBroadcastGroupVolumePercent = (
  group: PinnedCallGroup | null | undefined,
  lastGroupVolume?: number,
): number => {
  if (!group?.volumeState) return 0

  const volume = lastGroupVolume ?? PINNED_CALLS_INITIAL_VOLUME

  return Math.round(Math.min(1, Math.max(0, volume)) * 100)
}

export const isBroadcastGroupAudible = (volumePercent: number): boolean => {
  return volumePercent > 0
}

/** Mic: не прожат → micM; прожат → micF. */
export const resolveBroadcastGroupMicIcon = (isMicOn: boolean): 'micF' | 'micM' => {
  return isMicOn ? 'micF' : 'micM'
}

/** Volume: 0 → volumeOffM; > 0 → volumeOnF. */
export const resolveBroadcastGroupVolumeIcon = (
  volumePercent: number,
): 'volumeOnF' | 'volumeOffM' => {
  return isBroadcastGroupAudible(volumePercent) ? 'volumeOnF' : 'volumeOffM'
}

export type BroadcastGroupVoiceMember = {
  hasVoice: boolean
  /** Уровень remote voice 0..100 (AnalyserNode), не slot.volume. */
  voiceLevel: number
}

/** OR: есть ли remote voice у кого-то из members. */
export const resolveBroadcastGroupHasVoiceActivity = (
  members: BroadcastGroupVoiceMember[],
): boolean => {
  return members.some(member => member.hasVoice)
}

/**
 * Ширина VD-трека (0..100): max remoteVoiceLevel среди говорящих members.
 * Без говорящих → 0.
 */
export const resolveBroadcastGroupVoiceActivityPercent = (
  members: BroadcastGroupVoiceMember[],
): number => {
  const speakingLevels = members
    .filter(member => member.hasVoice)
    .map(member => Math.min(100, Math.max(0, member.voiceLevel)))

  if (!speakingLevels.length) return 0

  return Math.max(...speakingLevels)
}
