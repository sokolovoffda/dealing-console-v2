import type { IconName } from '@wui/common-library'

import {
  CONTACT_CARD_DEVICE_KINDS,
  CONTACT_CARD_DEVICE_SIDES,
  resolveContactCardDeviceKind,
  resolveContactCardDeviceSide,
  type ContactCardDeviceSide,
} from '@/features/contact-card'

import { STATE, type RTCSessionFacade } from '@/entities/call-session'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'


export type ActivityMonitorQueueCardTone = {
  root: string
  iconName: IconName
  iconClass: string
  name: string
  number: string
  duration: string
}

/** Не active: временные токены AM queue (bg 12% / brd 28%), пока нет DS-токенов. */
const NEUTCON_ROOT = 'bg-card-am-queue-bg-def border border-card-am-queue-brd-def'
const NEUTCON_NAME = 'text-card-neutcon-name-def'
const NEUTCON_NUMBER = 'text-card-neutcon-num-def'
const NEUTCON_DURATION = 'text-card-neutcon-name-def'

/** Active: зелёный фон (как ПБВ callcon). Остальные — фон/бордер выше, цвет только у иконки. */
const CONNECTED_TONE = {
  root: 'bg-card-state-bg-callcon-def border border-card-state-brd-callcon-def',
  iconClass: 'text-card-state-avt-def',
  name: 'text-card-state-name-def',
  number: 'text-card-state-num-def',
  duration: 'text-card-state-name-def',
} as const

/** Как в contact-card: завешенные / goose — mic, не phone. */
const PINNED_MIC_ICON: IconName = 'micLeftF'
const PINNED_LOCAL_HOLD_ICON: IconName = 'micPauseLeftF'
const PINNED_REMOTE_HOLD_ICON: IconName = 'micPauseLeftM'

const RIGHT_SIDE_ICON_MIRROR: Partial<Record<IconName, IconName>> = {
  arrowSouthWestM: 'arrowSouthEastM',
  arrowNorthEastM: 'arrowNorthWestM',
  phoneCallF: 'phoneCallInvF',
  phonePauseF: 'phonePauseInvF',
  phonePauseM: 'phonePauseInvM',
  micLeftF: 'micRightF',
  micPauseLeftF: 'micPauseRightF',
  micPauseLeftM: 'micPauseRightM',
}

const isLocalHold = (session: RTCSessionFacade): boolean => {
  if (session.isConfOnHold?.value) return true

  const holdState = session.session?.isOnHold?.() as { local?: boolean } | undefined
  return Boolean(holdState?.local)
}

const mirrorIconForSide = (
  iconName: IconName,
  deviceSide: ContactCardDeviceSide | null,
): IconName => {
  if (deviceSide !== CONTACT_CARD_DEVICE_SIDES.right) return iconName
  return RIGHT_SIDE_ICON_MIRROR[iconName] ?? iconName
}

const resolveBaseIcon = (
  session: RTCSessionFacade,
  isPinnedSession: boolean,
  isGooseDevice: boolean,
): IconName => {
  const state = session.sessionState.value
  const usePinnedMic = isPinnedSession || isGooseDevice

  if (state === STATE.CONNECTED) {
    return usePinnedMic ? PINNED_MIC_ICON : 'phoneCallF'
  }

  if (state === STATE.ONHOLD) {
    if (usePinnedMic) {
      return isLocalHold(session) ? PINNED_LOCAL_HOLD_ICON : PINNED_REMOTE_HOLD_ICON
    }

    return isLocalHold(session) ? 'phonePauseF' : 'phonePauseM'
  }

  // Ringing на завешенных — тот же mic, что на ContactCard.
  if (state === STATE.RINGING || session.direction === 'incoming') {
    if (isPinnedSession && state === STATE.RINGING) return PINNED_MIC_ICON
    return 'arrowSouthWestM'
  }

  return 'arrowNorthEastM'
}

const resolveIconClass = (session: RTCSessionFacade): string => {
  const state = session.sessionState.value

  if (state === STATE.CONNECTED) return CONNECTED_TONE.iconClass

  if (state === STATE.ONHOLD) return 'text-card-neutcon-avt-waitcon-def'

  // Как у pinned-calls status icon: incoming → warncon, outgoing → waitcon.
  if (state === STATE.RINGING || session.direction === 'incoming') {
    return 'text-pinnedline-btn-warncon-icon-def'
  }

  return 'text-pinnedline-btn-waitcon-icon-def'
}

export const getActivityMonitorQueueCardTone = (
  session: RTCSessionFacade,
): ActivityMonitorQueueCardTone => {
  const device = session.currentDevice.value
  const deviceSide = resolveContactCardDeviceSide(device)
  const deviceKind = resolveContactCardDeviceKind(device)
  const isPinnedSession = usePinnedCallsPanelStore().isPinnedPanelSessionId(session.sessionId)
  const isGooseDevice = deviceKind === CONTACT_CARD_DEVICE_KINDS.goose

  const iconName = mirrorIconForSide(
    resolveBaseIcon(session, isPinnedSession, isGooseDevice),
    deviceSide,
  )
  const isConnected = session.sessionState.value === STATE.CONNECTED

  if (isConnected) {
    return {
      root: CONNECTED_TONE.root,
      iconName,
      iconClass: CONNECTED_TONE.iconClass,
      name: CONNECTED_TONE.name,
      number: CONNECTED_TONE.number,
      duration: CONNECTED_TONE.duration,
    }
  }

  return {
    root: NEUTCON_ROOT,
    iconName,
    iconClass: resolveIconClass(session),
    name: NEUTCON_NAME,
    number: NEUTCON_NUMBER,
    duration: NEUTCON_DURATION,
  }
}
