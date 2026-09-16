import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import {
  STATE,
  type RTCSessionFacade,
  useSessionStore,
} from '@/entities/call-session'
import {
  CallStatusState,
  type Contact,
  type SubscriberStatus,
  useContactStatusState,
} from '@/entities/contact'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  LogicalMediaDeviceTypeEnum,
  type LogicalMediaDevice,
} from '@/shared/composables'

import { useContactCardPresence } from '../use-contact-card-presence'

export const CONTACT_CARD_SELF_STATUSES = {
  incomingSelf: 'incoming-self',
  outgoingSelf: 'outgoing-self',
  connectedSelf: 'connected-self',
  /** Удалённое («входящее») удержание: `session.isOnHold().remote`. */
  incomingHoldSelf: 'incoming-hold-self',
  /** Локальное удержание: мы нажали hold / `session.isOnHold().local`. */
  outgoingHoldSelf: 'outgoing-hold-self',
} as const

export const CONTACT_CARD_SUBSCRIBER_STATUSES = {
  incomingSubscriber: 'incoming-subscriber',
  connectedSubscriber: 'connected-subscriber',
  holdSubscriber: 'hold-subscriber',
} as const

export type ContactCardSelfStatus = typeof CONTACT_CARD_SELF_STATUSES[keyof typeof CONTACT_CARD_SELF_STATUSES]

export type ContactCardSubscriberStatus = typeof CONTACT_CARD_SUBSCRIBER_STATUSES[keyof typeof CONTACT_CARD_SUBSCRIBER_STATUSES]

export const CONTACT_CARD_DEVICE_SIDES = {
  left: 'L',
  right: 'R',
} as const

export type ContactCardDeviceSide = typeof CONTACT_CARD_DEVICE_SIDES[keyof typeof CONTACT_CARD_DEVICE_SIDES]

export const CONTACT_CARD_DEVICE_KINDS = {
  handset: 'handset',
  goose: 'goose',
} as const

export type ContactCardDeviceKind = typeof CONTACT_CARD_DEVICE_KINDS[keyof typeof CONTACT_CARD_DEVICE_KINDS]

const getBlfStatusPriority = (state: CallStatusState): number => {
  switch (state) {
  case CallStatusState.HOLD:
    return 0
  case CallStatusState.CONFIRMED:
    return 1
  case CallStatusState.EARLY:
    return 2
  case CallStatusState.UNKNOWN:
    return 3
  case CallStatusState.TERMINATED:
    return 4
  default:
    return 3
  }
}

/** module/id вида goose_L1 / handset_R2 → сторона L|R */
const DEVICE_SIDE_FROM_MODULE_RE = /(?:^|[_-])([LR])\d*/i

export const resolveContactCardDeviceSide = (
  device: Pick<LogicalMediaDevice, 'id' | 'module'> | null | undefined,
): ContactCardDeviceSide | null => {
  if (!device) return null

  const source = device.module ?? device.id
  const match = source.match(DEVICE_SIDE_FROM_MODULE_RE)

  if (!match?.[1]) return null

  const side = match[1].toUpperCase()

  return side === CONTACT_CARD_DEVICE_SIDES.left || side === CONTACT_CARD_DEVICE_SIDES.right
    ? side
    : null
}

export const resolveContactCardDeviceKind = (
  device: Pick<LogicalMediaDevice, 'type'> | null | undefined,
): ContactCardDeviceKind | null => {
  if (!device) return null

  if (device.type === LogicalMediaDeviceTypeEnum.HANDSET) {
    return CONTACT_CARD_DEVICE_KINDS.handset
  }

  if (device.type === LogicalMediaDeviceTypeEnum.GOOSE) {
    return CONTACT_CARD_DEVICE_KINDS.goose
  }

  return null
}

const getHoldSelfStatusFromSession = (session: RTCSessionFacade): ContactCardSelfStatus => {
  // Конф-hold без JsSIP local — мы инициировали удержание.
  if (session.isConfOnHold?.value) {
    return CONTACT_CARD_SELF_STATUSES.outgoingHoldSelf
  }

  const holdState = session.session?.isOnHold?.() as { local?: boolean, remote?: boolean } | undefined

  if (holdState?.local) {
    return CONTACT_CARD_SELF_STATUSES.outgoingHoldSelf
  }

  return CONTACT_CARD_SELF_STATUSES.incomingHoldSelf
}

const getSelfStatusFromSession = (session: RTCSessionFacade): ContactCardSelfStatus | null => {
  switch (session.sessionState.value) {
  case STATE.RINGING:
    return session.direction === 'incoming'
      ? CONTACT_CARD_SELF_STATUSES.incomingSelf
      : CONTACT_CARD_SELF_STATUSES.outgoingSelf
  case STATE.PROGRESS:
    return CONTACT_CARD_SELF_STATUSES.outgoingSelf
  case STATE.CONNECTED:
    return CONTACT_CARD_SELF_STATUSES.connectedSelf
  case STATE.ONHOLD:
    return getHoldSelfStatusFromSession(session)
  default:
    return null
  }
}

const getSubscriberStatusFromCallStatusState = (
  state?: CallStatusState,
): ContactCardSubscriberStatus | null => {
  switch (state) {
  case CallStatusState.EARLY:
    return CONTACT_CARD_SUBSCRIBER_STATUSES.incomingSubscriber
  case CallStatusState.CONFIRMED:
    return CONTACT_CARD_SUBSCRIBER_STATUSES.connectedSubscriber
  case CallStatusState.HOLD:
    return CONTACT_CARD_SUBSCRIBER_STATUSES.holdSubscriber
  default:
    return null
  }
}

const getLineCallState = (line: SubscriberStatus): CallStatusState | undefined => {
  return line.local ?? line.remote
}

const getPreferredSubscriberStatus = (
  lines: SubscriberStatus[],
): ContactCardSubscriberStatus | null => {
  const [preferredLine] = lines
    .filter((line) => getSubscriberStatusFromCallStatusState(getLineCallState(line)))
    .sort((left, right) => {
      const leftPriority = getBlfStatusPriority(getLineCallState(left) ?? CallStatusState.UNKNOWN)
      const rightPriority = getBlfStatusPriority(getLineCallState(right) ?? CallStatusState.UNKNOWN)

      return leftPriority - rightPriority
    })

  return preferredLine
    ? getSubscriberStatusFromCallStatusState(getLineCallState(preferredLine))
    : null
}

const isSessionBoundToPinnedPanelSlot = (
  sessionId: string,
  slotSessionIds: ReadonlyMap<number, string>,
): boolean => {
  for (const boundSessionId of slotSessionIds.values()) {
    if (boundSessionId === sessionId) return true
  }

  return false
}

export const useContactCardStatus = (contact: MaybeRefOrGetter<Contact>) => {
  const { presence } = useContactCardPresence(contact)
  const sessionStore = useSessionStore()
  const contactStatusState = useContactStatusState()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()

  const localSession = computed(() => {
    const contactValue = toValue(contact)

    if (!contactValue.internalNumber) {
      return null
    }

    return sessionStore.getPreferredSessionByPServed(contactValue.pServed) ?? null
  })

  const selfStatus = computed<ContactCardSelfStatus | null>(() => {
    const session = localSession.value

    return session ? getSelfStatusFromSession(session) : null
  })

  const subscriberStatus = computed<ContactCardSubscriberStatus | null>(() => {
    const contactValue = toValue(contact)

    if (!contactValue.internalNumber) {
      return null
    }

    return getPreferredSubscriberStatus(
      contactStatusState.findLinesByInternalNumber(contactValue.internalNumber),
    )
  })

  const sessionDevice = computed(() => localSession.value?.currentDevice.value ?? null)

  const deviceSide = computed<ContactCardDeviceSide | null>(() =>
    resolveContactCardDeviceSide(sessionDevice.value),
  )

  const deviceKind = computed<ContactCardDeviceKind | null>(() =>
    resolveContactCardDeviceKind(sessionDevice.value),
  )

  const isPinnedSession = computed(() => {
    const session = localSession.value

    if (!session) return false

    return isSessionBoundToPinnedPanelSlot(
      session.sessionId,
      pinnedCallsPanelStore.slotSessionIds,
    )
  })

  return {
    presence,
    selfStatus,
    subscriberStatus,
    deviceSide,
    deviceKind,
    isPinnedSession,
  }
}
