import type { IconName } from '@wui/common-library'

import {
  CONTACT_CARD_DEVICE_KINDS,
  CONTACT_CARD_DEVICE_SIDES,
  type ContactCardDeviceKind,
  type ContactCardDeviceSide,
  type ContactCardSelfStatus,
  type ContactCardSubscriberStatus,
} from '../use-contact-card-status'

export const CONTACT_CARD_PRIORITIES = {
  default: 'default',
  high: 'high',
} as const

export const CONTACT_PRESENCES = {
  online: 'online',
  offline: 'offline',
} as const

export type ContactCardPriority = typeof CONTACT_CARD_PRIORITIES[keyof typeof CONTACT_CARD_PRIORITIES]

export type ContactPresence = typeof CONTACT_PRESENCES[keyof typeof CONTACT_PRESENCES]

export type ContactCardIconTone = {
  name: IconName
  class: string
}

export type ContactCardTone = {
  root: string
  primaryIcon: ContactCardIconTone
  number: string
  name: string
  subscriberIcon?: ContactCardIconTone
}

export type ContactCardToneState = {
  presence?: ContactPresence
  selfStatus?: ContactCardSelfStatus | null
  subscriberStatus?: ContactCardSubscriberStatus | null
  deviceSide?: ContactCardDeviceSide | null
  deviceKind?: ContactCardDeviceKind | null
  isPinnedSession?: boolean
  /** Звонок недоступен (нет устройства/номера и т.п.) — тон как у бывшего offline. */
  disabled?: boolean
  /**
   * Карточка в режиме переноса (ожидает целевую ячейку).
   * В DS `state=movable` визуально совпадает с `state=focused`.
   */
  movable?: boolean
}

type FixedContactCardSelfStatus = Exclude<
  ContactCardSelfStatus,
  'incoming-self'
>

const INCOMING_SELF_STATUS: ContactCardSelfStatus = 'incoming-self'
const PRIMARY_ICON_NAME: IconName = 'userRoundF'
const SELF_ICON_CLASS = 'text-card-state-avt-def'
const SELF_NUMBER_CLASS = 'text-card-state-num-def'
const SELF_NAME_CLASS = 'text-card-state-name-def'
const SELF_ICON_CLASS_NEG = 'text-card-state-avt-neg'
const SELF_NUMBER_CLASS_NEG = 'text-card-state-num-neg'
const SELF_NAME_CLASS_NEG = 'text-card-state-name-neg'
const SUBSCRIBER_ICON_CLASS = 'text-card-deal-avatar-call-def'

type ContactCardSelfTextClasses = {
  icon: string
  number: string
  name: string
}

const SELF_TEXT_CLASSES_DEF: ContactCardSelfTextClasses = {
  icon: SELF_ICON_CLASS,
  number: SELF_NUMBER_CLASS,
  name: SELF_NAME_CLASS,
}

const SELF_TEXT_CLASSES_NEG: ContactCardSelfTextClasses = {
  icon: SELF_ICON_CLASS_NEG,
  number: SELF_NUMBER_CLASS_NEG,
  name: SELF_NAME_CLASS_NEG,
}

export const DEFAULT_CONTACT_CARD_PRIORITY = CONTACT_CARD_PRIORITIES.default

export const DEFAULT_CONTACT_CARD_TONE_STATE: ContactCardToneState = {
  presence: CONTACT_PRESENCES.offline,
}

/**
 * Базовые иконки стороны L — как в call-card session view / footer left.
 * Источник: `call-card-session-view.ts` getCallCardSessionIcon.
 * Финальные имена по макету ПБВ пользователь может поправить отдельно.
 */
const SELF_STATUS_BASE_ICONS: Record<ContactCardSelfStatus, IconName> = {
  'incoming-self': 'arrowSouthWestM',
  'outgoing-self': 'arrowNorthEastM',
  'connected-self': 'phoneCallF',
  // remote hold (входящее удержание)
  'incoming-hold-self': 'phonePauseM',
  // local hold (мы нажали)
  'outgoing-hold-self': 'phonePauseF',
}

/**
 * Зеркало для стороны R — как в call-card footer / CallCardSessionState / queue.
 * Источник: `call-card-footer-view.ts` resolveCallCardFooterIconName.
 */
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

/** Pinned (incoming/connected): mic завешенных (L-база; R через mirror). Фон остаётся от selfStatus. */
const PINNED_MIC_ICON: IconName = 'micLeftF'

/** Pinned/goose hold: local → F, remote → M (L-база; R через mirror). */
const PINNED_LOCAL_HOLD_ICON: IconName = 'micPauseLeftF'
const PINNED_REMOTE_HOLD_ICON: IconName = 'micPauseLeftM'

const createBaseTone = (
  root: string,
  iconClass: string,
  number: string,
  name: string,
): ContactCardTone => ({
  root,
  primaryIcon: {
    name: PRIMARY_ICON_NAME,
    class: iconClass,
  },
  number,
  name,
})

const createPresenceTone = createBaseTone

const createSelfTone = (
  root: string,
  iconName: IconName,
  textClasses: ContactCardSelfTextClasses = SELF_TEXT_CLASSES_DEF,
): ContactCardTone => ({
  root,
  primaryIcon: {
    name: iconName,
    class: textClasses.icon,
  },
  number: textClasses.number,
  name: textClasses.name,
})

// Базовый online-тон карточки (neutcon). Figma: comp/card/neutcon/*
export const CONTACT_CARD_BASE_TONE = createPresenceTone(
  'bg-card-neutcon-bg-base-def border border-card-neutcon-brd-base-def',
  'text-card-neutcon-avt-base-def',
  'text-card-neutcon-num-def',
  'text-card-neutcon-name-def',
)

/**
 * Focused / movable: светлее bg + светлый бордер foc.
 * DS: state=focused и state=movable совпадают по цветам.
 * Figma: bg = neutcon/bg/base/pres, brd = neutcon/brd/base/foc.
 */
export const CONTACT_CARD_FOCUSED_TONE = createPresenceTone(
  'bg-card-neutcon-bg-base-pres border border-card-neutcon-brd-base-foc',
  'text-card-neutcon-avt-base-def',
  'text-card-neutcon-num-def',
  'text-card-neutcon-name-def',
)

/** Alias: переносимая карточка = focused-вид, без opacity. */
export const CONTACT_CARD_MOVABLE_TONE = CONTACT_CARD_FOCUSED_TONE

/**
 * Hover / pressed для neutcon-карточки без self/disabled/movable.
 * Навешиваются CSS-классами на interactive base, не через getContactCardTone.
 */
export const CONTACT_CARD_NEUTCON_INTERACTION_CLASSES = [
  'hover:bg-card-neutcon-bg-base-hov',
  'hover:border-card-neutcon-brd-base-hov',
  'active:bg-card-neutcon-bg-base-pres',
  'active:border-card-neutcon-brd-base-pres',
  'focus-visible:bg-card-neutcon-bg-base-pres',
  'focus-visible:border-card-neutcon-brd-base-foc',
  'focus-visible:outline-none',
].join(' ')

// Offline / звонок недоступен — отдельные *-dis токены, не opacity.
export const CONTACT_CARD_DISABLED_TONE = createPresenceTone(
  'bg-card-neutcon-bg-base-dis',
  'text-card-neutcon-avt-base-dis',
  'text-card-neutcon-num-dis',
  'text-card-neutcon-name-dis',
)

/** Presence online/offline по priority. default = neutcon; high = card-deal red. */
export const CONTACT_CARD_PRESENCE_TONES: Record<
  ContactCardPriority,
  Record<ContactPresence, ContactCardTone>
> = {
  default: {
    offline: CONTACT_CARD_DISABLED_TONE,
    online: CONTACT_CARD_BASE_TONE,
  },
  high: {
    offline: createPresenceTone(
      'bg-card-deal-bg-dis-red',
      'text-card-deal-avatar-dis-base',
      'text-card-deal-number-dis',
      'text-card-deal-name-dis',
    ),
    online: createPresenceTone(
      'bg-card-deal-bg-def-red border border-card-deal-border-def-red',
      'text-card-deal-avatar-def-base',
      'text-card-deal-number-def',
      'text-card-deal-name-def',
    ),
  },
}

/** Subscriber-иконки поверх online presence (фон не меняют). */
export const CONTACT_CARD_SUBSCRIBER_ICONS: Record<ContactCardSubscriberStatus, ContactCardIconTone> = {
  'incoming-subscriber': {
    name: 'arrowDownM',
    class: SUBSCRIBER_ICON_CLASS,
  },
  'connected-subscriber': {
    name: 'phoneF',
    class: SUBSCRIBER_ICON_CLASS,
  },
  'hold-subscriber': {
    name: 'phonePauseM',
    class: SUBSCRIBER_ICON_CLASS,
  },
}

// цвета карточек для входящего по приоритетам (high заложен; wiring группы — отдельно).
// default → warncon (входящий), high → negcon (приоритетный входящий).
export const CONTACT_CARD_INCOMING_SELF_TONES: Record<
  typeof CONTACT_CARD_PRIORITIES.default | typeof CONTACT_CARD_PRIORITIES.high,
  ContactCardTone
> = {
  default: createSelfTone('bg-card-state-bg-warncon-def', SELF_STATUS_BASE_ICONS['incoming-self']),
  high: createSelfTone(
    'bg-card-state-bg-negcon-def',
    SELF_STATUS_BASE_ICONS['incoming-self'],
    SELF_TEXT_CLASSES_NEG,
  ),
}

// остальные self статусы (они без приоритетов); иконка ниже может переопределяться L/R / pinned / goose.
// исходящий/hold → waitcon, активный → callcon.
export const CONTACT_CARD_SELF_TONES: Record<FixedContactCardSelfStatus, ContactCardTone> = {
  'outgoing-self': createSelfTone('bg-card-state-bg-waitcon-def', SELF_STATUS_BASE_ICONS['outgoing-self']),
  'connected-self': createSelfTone('bg-card-state-bg-callcon-def', SELF_STATUS_BASE_ICONS['connected-self']),
  'incoming-hold-self': createSelfTone('bg-card-state-bg-waitcon-def', SELF_STATUS_BASE_ICONS['incoming-hold-self']),
  'outgoing-hold-self': createSelfTone('bg-card-state-bg-waitcon-def', SELF_STATUS_BASE_ICONS['outgoing-hold-self']),
}

const getIncomingSelfTone = (priority: ContactCardPriority) => {
  return priority === CONTACT_CARD_PRIORITIES.high
    ? CONTACT_CARD_INCOMING_SELF_TONES.high
    : CONTACT_CARD_INCOMING_SELF_TONES.default
}

const getSelfTone = (
  priority: ContactCardPriority,
  selfStatus: ContactCardSelfStatus,
): ContactCardTone => {
  if (selfStatus === INCOMING_SELF_STATUS) {
    return getIncomingSelfTone(priority)
  }

  return CONTACT_CARD_SELF_TONES[selfStatus]
}

const isHoldSelfStatus = (selfStatus: ContactCardSelfStatus): boolean =>
  selfStatus === 'incoming-hold-self' || selfStatus === 'outgoing-hold-self'

const resolveSelfPrimaryIconName = (
  selfStatus: ContactCardSelfStatus,
  state: ContactCardToneState,
): IconName => {
  let iconName: IconName = SELF_STATUS_BASE_ICONS[selfStatus]

  if (
    state.isPinnedSession
    && (selfStatus === 'incoming-self' || selfStatus === 'connected-self')
  ) {
    iconName = PINNED_MIC_ICON
  } else if (
    isHoldSelfStatus(selfStatus)
    && (state.isPinnedSession || state.deviceKind === CONTACT_CARD_DEVICE_KINDS.goose)
  ) {
    iconName = selfStatus === 'outgoing-hold-self'
      ? PINNED_LOCAL_HOLD_ICON
      : PINNED_REMOTE_HOLD_ICON
  }

  if (state.deviceSide === CONTACT_CARD_DEVICE_SIDES.right) {
    return RIGHT_SIDE_ICON_MIRROR[iconName] ?? iconName
  }

  return iconName
}

const withPrimaryIconName = (
  tone: ContactCardTone,
  iconName: IconName,
): ContactCardTone => ({
  ...tone,
  primaryIcon: {
    ...tone.primaryIcon,
    name: iconName,
  },
})

export const getContactCardTone = (
  priority: ContactCardPriority = DEFAULT_CONTACT_CARD_PRIORITY,
  state: ContactCardToneState = DEFAULT_CONTACT_CARD_TONE_STATE,
): ContactCardTone => {
  if (state.disabled) {
    return CONTACT_CARD_DISABLED_TONE
  }

  if (state.movable) {
    return CONTACT_CARD_MOVABLE_TONE
  }

  if (state.selfStatus) {
    const selfTone = getSelfTone(priority, state.selfStatus)

    return withPrimaryIconName(
      selfTone,
      resolveSelfPrimaryIconName(state.selfStatus, state),
    )
  }

  const presence = state.presence ?? CONTACT_PRESENCES.offline
  const tone = CONTACT_CARD_PRESENCE_TONES[priority][presence]

  if (!state.subscriberStatus || presence !== CONTACT_PRESENCES.online) {
    return tone
  }

  const subscriberIcon = CONTACT_CARD_SUBSCRIBER_ICONS[state.subscriberStatus]

  return {
    ...tone,
    primaryIcon: {
      ...tone.primaryIcon,
      class: subscriberIcon.class,
    },
    subscriberIcon,
  }
}
