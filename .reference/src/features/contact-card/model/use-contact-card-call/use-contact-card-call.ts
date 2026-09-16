import type { MediaConstraints } from '@wui/jssip/lib/RTCSession'
import { storeToRefs } from 'pinia'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { useCallCardStore } from '@/features/call-card'

import { STATE, useSessionStore, type RTCSessionFacade } from '@/entities/call-session'
import type { Contact } from '@/entities/contact'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  notifyMediaDeviceUnavailableForCall,
  useDevicesStore,
  type LogicalMediaDevice,
} from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

import { CONTACT_PRESENCES } from '../contact-card-tone'
import { useContactCardPresence } from '../use-contact-card-presence'

type UseContactCardCallOptions = {
  /** Блокировать новый звонок, если абонент offline по BLF (Activity Monitor). */
  requireOnlineForCall?: MaybeRefOrGetter<boolean>
}

const isIncomingRingingSession = (session: RTCSessionFacade): boolean => {
  const state = session.sessionState.value
  if (state !== STATE.RINGING && state !== STATE.INITIAL) return false
  if (session.direction === 'outgoing') return false

  return true
}

const buildAnswerMediaConstraints = (device: LogicalMediaDevice): MediaConstraints => {
  return {
    audio: {
      deviceId: normalizeAudioDeviceIdConstraint(device.inputId),
      echoCancellation: device.echoCancellation ?? true,
      noiseSuppression: device.noiseSuppression ?? true,
      autoGainControl: device.autoGainControl ?? true,
    },
    video: false,
  } as never as MediaConstraints
}

export const useContactCardCall = (
  contact: MaybeRefOrGetter<Contact>,
  options: UseContactCardCallOptions = {},
) => {
  const callCardStore = useCallCardStore()
  const sessionStore = useSessionStore()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const devicesStore = useDevicesStore()
  const { hasAvailableHandset } = storeToRefs(callCardStore)
  const { readyPreferredGoose } = storeToRefs(devicesStore)
  const { switchToCall } = useWebRTC()
  const { presence } = useContactCardPresence(contact)

  const callTarget = computed(() => {
    const contactValue = toValue(contact)

    return contactValue.internalNumber || contactValue.mobilePhone
  })

  const isPinnedPanelContact = computed(() => {
    const contactValue = toValue(contact)

    if (pinnedCallsPanelStore.getSlotsByPServed(contactValue.pServed).length > 0) {
      return true
    }

    const number = callTarget.value
    if (!number) return false

    // Fallback: слот мог сохраниться с другим доменом/форматом, чем pServed карточки ПБВ.
    return pinnedCallsPanelStore.getSlotsByPServed(number).length > 0
  })

  const canStartNewCallByPresence = computed(() => {
    if (!toValue(options.requireOnlineForCall)) return true

    const contactValue = toValue(contact)
    if (contactValue.isExternal) return true

    return presence.value === CONTACT_PRESENCES.online
  })

  const notifyDeviceUnavailable = () => {
    notifyMediaDeviceUnavailableForCall()
  }

  const hasCallAction = computed(() => {
    const contactValue = toValue(contact)
    const hasExistingSession = Boolean(sessionStore.getPreferredSessionByPServed(contactValue.pServed))
    if (!callTarget.value && !hasExistingSession) return false

    if (!hasExistingSession && !canStartNewCallByPresence.value) return false

    const canUseTarget = hasExistingSession || Boolean(callTarget.value)

    // Сессия и новый звонок кликабельны даже без usable device —
    // toggleCall покажет toast (lockdown / soft-disable). Presence/BLF не гасим.
    return canUseTarget
  })

  const resolveFreePinnedSlotOrder = (): number | undefined => {
    const contactValue = toValue(contact)
    const slots = pinnedCallsPanelStore.getSlotsByPServed(contactValue.pServed)
    const slotsByNumber = callTarget.value
      ? pinnedCallsPanelStore.getSlotsByPServed(callTarget.value)
      : []
    const merged = slots.length > 0 ? slots : slotsByNumber

    return merged
      .filter(slot => !pinnedCallsPanelStore.slotSessionIds.has(slot.order))
      .sort((left, right) => left.slotIndex - right.slotIndex)
      .at(0)
      ?.order
  }

  const resolveSlotOrderForSession = (sessionId: string): number | undefined => {
    for (const [order, boundSessionId] of pinnedCallsPanelStore.slotSessionIds) {
      if (boundSessionId === sessionId) return order
    }

    return undefined
  }

  const activatePinnedSlotForSession = (session: RTCSessionFacade) => {
    const contactValue = toValue(contact)
    let order = resolveSlotOrderForSession(session.sessionId)

    if (order == null) {
      order = pinnedCallsPanelStore.assignSessionToFreeSlot(
        session.sessionId,
        contactValue.pServed,
      )?.order
    }

    if (order == null) {
      order = resolveFreePinnedSlotOrder()
        ?? pinnedCallsPanelStore.getSlotsByPServed(contactValue.pServed).at(0)?.order
        ?? (callTarget.value
          ? pinnedCallsPanelStore.getSlotsByPServed(callTarget.value).at(0)?.order
          : undefined)
    }

    if (order != null) {
      pinnedCallsPanelStore.setActiveSlot(order)
    }

    return order
  }

  const answerIncomingPinnedSession = (session: RTCSessionFacade) => {
    const gooseDevice = readyPreferredGoose.value
    if (!gooseDevice) {
      notifyDeviceUnavailable()
      return
    }

    activatePinnedSlotForSession(session)
    session.answer({ mediaConstraints: buildAnswerMediaConstraints(gooseDevice) }, gooseDevice)
    callCardStore.openPinnedPanelSession(session.sessionId)
  }

  const callPinnedPanelContact = (session?: RTCSessionFacade | null) => {
    const gooseDevice = readyPreferredGoose.value
    const number = callTarget.value ?? session?.number

    if (session) {
      if (isIncomingRingingSession(session)) {
        answerIncomingPinnedSession(session)
        return
      }

      activatePinnedSlotForSession(session)
      callCardStore.openPinnedPanelSession(session.sessionId)

      // Установленная сессия: медиа на goose при наличии устройства.
      if (gooseDevice && number) {
        switchToCall(number, gooseDevice, undefined, session.sessionId)
      }

      return
    }

    if (!gooseDevice) {
      notifyDeviceUnavailable()
      return
    }

    if (!number) return

    if (!canStartNewCallByPresence.value) return

    const order = resolveFreePinnedSlotOrder()

    if (order != null) {
      pinnedCallsPanelStore.setActiveSlot(order)
    }

    switchToCall(number, gooseDevice, undefined, undefined, order)
  }

  const answerIncomingHandsetSession = (session: RTCSessionFacade) => {
    if (!hasAvailableHandset.value) {
      notifyDeviceUnavailable()
      return
    }

    callCardStore.openSessionInPreferredHandset(session.sessionId)
    callCardStore.answerSelectedSession()
  }

  const toggleCall = () => {
    const contactValue = toValue(contact)
    const session = sessionStore.getPreferredSessionByPServed(contactValue.pServed)

    if (isPinnedPanelContact.value) {
      callPinnedPanelContact(session)
      return
    }

    if (session) {
      if (isIncomingRingingSession(session)) {
        answerIncomingHandsetSession(session)
        return
      }

      callCardStore.openSessionInPreferredHandset(session.sessionId)
      return
    }

    if (!callTarget.value) return

    if (!hasAvailableHandset.value) {
      notifyDeviceUnavailable()
      return
    }

    if (!canStartNewCallByPresence.value) return

    callCardStore.callNumberFromSelectedHandset({
      name: contactValue.name,
      number: callTarget.value,
    })
  }

  return {
    hasCallAction,
    toggleCall,
  }
}
