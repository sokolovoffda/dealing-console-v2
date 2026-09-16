import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { useCreateConferenceFromTetATet } from '@/features/create-conference-from-tet-a-tet'
import { useReferCallState } from '@/features/refer-call'

import { STATE, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import {
  useConferenceState,
  useConferenceDraft,
  ConferenceDto,
  resolveConferenceByPServed,
  resolveIncomingConferenceFromRemoteNumber,
} from '@/entities/conference'
import { Contact, useContactCachedStore } from '@/entities/contact'
import { useGroupContactsStore } from '@/entities/group-contacts'

import { useHandsetPickupHangupHandler } from '@/shared/controller'
import { useWebRTC } from '@/shared/jssip'
import { contactPServedToNumber, isConferenceRoomNumber, pServedIsNotGroup } from '@/shared/services/uri-helper'
import { createExternalContact } from '@/shared/utils/contact'

type CheckDtoByPServedOptions = {
  title?: string
  number?: string
}

export const checkDtoByPServed = (pServed: string, options: CheckDtoByPServedOptions = {}) => {
  if (pServedIsNotGroup(pServed)) {
    // Страховка: pServed без ROOMS-, но remote user — GUID комнаты (гонка / stale facade)
    if (options.number && isConferenceRoomNumber(options.number)) {
      const conference = resolveIncomingConferenceFromRemoteNumber(options.number, {
        title: options.title,
      })

      if (conference) {
        return { type: 'conference' as const, dto: conference }
      }
    }

    const contact = useContactCachedStore().getLocalByPServed(pServed) ?? createExternalContact(contactPServedToNumber(pServed), false)
    return { type: 'contact' as const, dto: contact }
  }

  const { getConfByPServed } = useConferenceState()
  const dto = getConfByPServed(pServed) ?? resolveConferenceByPServed(pServed, { title: options.title })

  return { type: 'conference' as const, dto }
}

export const resolveContactByPServed = async (pServed: string) => {
  if (!pServedIsNotGroup(pServed)) {
    return undefined
  }

  const contactCachedStore = useContactCachedStore()
  const localContact = contactCachedStore.getLocalByPServed(pServed)
  if (localContact) {
    return localContact
  }

  const fetchedContact = await contactCachedStore.getByPServed(pServed, true)
  return fetchedContact ?? contactCachedStore.getLocalByPServed(pServed) ?? createExternalContact(contactPServedToNumber(pServed), false)
}

export const selectContact = (contact: Contact): void => {
  const { isActive: isActiveConfCollecting, addDraftConferenceSubscriber, deleteDraftConferenceSubscriber, conferenceDraft } = useConferenceDraft()
  const { creating: isActiveConfFromTetATetCollecting, toggleContact } = useCreateConferenceFromTetATet()
  const { selectedReferType, executeRefer, finishProcess } = useReferCallState()
  const { setCallManagerState, selectedSession } = useCallManagerState()
  const { hangupHandsetHandler: clearNumber } = useHandsetPickupHangupHandler()

  // если мы в режиме сбора конференции
  if (isActiveConfCollecting.value) {
    if (!conferenceDraft.value?.subscribers?.find(({ phoneNumber }) => phoneNumber === contact.internalNumber)) {
      addDraftConferenceSubscriber(contact)
    } else {
      deleteDraftConferenceSubscriber(contact)
    }
    return
  }
  // Если в режиме сбора конференции из тет-а-тет звонка
  if (isActiveConfFromTetATetCollecting.value && selectedSession.value?.pServed !== contact.pServed) {
    toggleContact(contact)
    return
  }
  // Режим перевода вызова слепой
  if (selectedReferType.value === 'blind') {
    executeRefer(contact)
    clearNumber()
    return
  }
  // Режим перевода вызова с консультацией
  if (selectedReferType.value === 'consultation') {
    const { switchToCall } = useWebRTC()
    if (selectedSession.value) {
      const sessionId = selectedSession.value.sessionId
      const device = selectedSession.value.currentDevice.value ?? undefined
      switchToCall(contact.internalNumber, device, [`Refer-Call:${sessionId}`])
      finishProcess()
      clearNumber()
    } else {
      console.warn('There is no selected session to perform the function: ', selectedSession.value)
    }
    return
  }

  // Режим создания групп из завешенных юзеров - при повторном клике для удаления
  if(useGroupContactsStore().isEditMode) {
    const { activePinnedCall } = usePinnedCallsStore()
    useGroupContactsStore().removeFromAllGroups(activePinnedCall?.pServed === contact.pServed ? activePinnedCall : contact.pServed)
    return
  }

  const { getSessionById, getSessionByPServed } = useSessionStore()
  const { activePinnedCall } = usePinnedCallsStore()
  const pinnedSessionId = activePinnedCall?.pServed === contact.pServed ? activePinnedCall.sessionId : null
  const session = pinnedSessionId ? getSessionById(pinnedSessionId) : getSessionByPServed(contact.pServed)
  if (session) {
    if(session.sessionState.value === STATE.RINGING) {
      setCallManagerState(CallManagerState.INCOMING_CALL, contact, {
        sessionId: session.sessionId,
        callId: session.callId.value,
      })
    } else {
      setCallManagerState(CallManagerState.CONTACT_CALL, contact, {
        sessionId: session.sessionId,
        callId: session.callId.value,
      })
    }
  } else {
    setCallManagerState(CallManagerState.CONTACT_VIEW, contact)
  }
}

export const selectConference = (
  conference: ConferenceDto | Readonly<ConferenceDto>,
  fallbackTitle?: string,
) => {
  const { setCallManagerState } = useCallManagerState()
  const { getSessionById, getSessionByPServed } = useSessionStore()
  const { activePinnedCall, isPServedSession } = usePinnedCallsStore()
  const resolvedConference = resolveConferenceByPServed(conference.pServed, {
    title: conference.name || fallbackTitle,
  })
  const pinnedSessionId = activePinnedCall?.pServed === resolvedConference.pServed
    ? activePinnedCall.sessionId
    : null

  if(useGroupContactsStore().isEditMode) {
    useGroupContactsStore().removeFromAllGroups(
      activePinnedCall?.pServed === resolvedConference.pServed ? activePinnedCall : resolvedConference.pServed,
    )
    return
  }

  const session = pinnedSessionId
    ? getSessionById(pinnedSessionId)
    : getSessionByPServed(resolvedConference.pServed)
  if(session) {
    if (session.sessionState.value === STATE.RINGING) {
      if (isPServedSession(resolvedConference.pServed)) {
        setCallManagerState(CallManagerState.CONFERENCE_VIEW, resolvedConference, {
          sessionId: session.sessionId,
          callId: session.callId.value,
        })
      } else {
        setCallManagerState(CallManagerState.INCOMING_CALL, resolvedConference, {
          sessionId: session.sessionId,
          callId: session.callId.value,
        })
      }
    } else {
      setCallManagerState(CallManagerState.CONFERENCE_CALL, resolvedConference, {
        sessionId: session.sessionId,
        callId: session.callId.value,
      })
    }
  } else {
    setCallManagerState(CallManagerState.CONFERENCE_VIEW, resolvedConference)
  }
}

export const unselectContact = (): void => {
  const { setCallManagerState } = useCallManagerState()
  const { setActivePinnedCall } = usePinnedCallsStore()
  setCallManagerState(CallManagerState.INITIAL)
  setActivePinnedCall(null)
}
