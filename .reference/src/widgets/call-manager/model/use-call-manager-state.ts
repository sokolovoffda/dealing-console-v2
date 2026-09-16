import { computed, readonly, Ref, ref, WatchStopHandle, watch } from 'vue'

import { usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { ConferenceDto } from '@/entities/conference'
import { Contact, SubscriberStatus } from '@/entities/contact'

export enum CallManagerState {
  INITIAL,
  CONTACT_VIEW,
  INCOMING_CALL,
  CONTACT_CALL,
  CONFERENCE_VIEW,
  CONFERENCE_CREATE,
  CONFERENCE_CALL,
  CONTACT_INTERCEPTION
}

type CallManagerSessionSelection = {
  sessionId?: string
  callId?: string
}

const callManagerState: Ref<CallManagerState> = ref(CallManagerState.INITIAL)
const selected: Ref<ConferenceDto | Contact | undefined> = ref()
const selectedSessionId: Ref<string | null> = ref(null)
const selectedSessionCallId: Ref<string | null> = ref(null)
const selectedSession = computed(() => {
  const { getSessionById, getSessionByCallId, getSessionsByPServed } = useSessionStore()

  if (selectedSessionId.value) return getSessionById(selectedSessionId.value)
  if (selectedSessionCallId.value) return getSessionByCallId(selectedSessionCallId.value)
  if (!selected.value) return undefined

  const sessions = getSessionsByPServed(selected.value.pServed)
  if (sessions.length === 1) return sessions[0]
  return undefined   // явно возвращаем undefined, если length не 1
})
const selectedStatusLine: Ref<SubscriberStatus | undefined> = ref()
let stopPinnedCallSelectionSync: WatchStopHandle | null = null

const ensurePinnedCallSelectionSync = () => {
  if (stopPinnedCallSelectionSync) return

  stopPinnedCallSelectionSync = watch([selected, selectedSession], ([dto, session]) => {
    const pinnedCallsStore = usePinnedCallsStore()
    const pinnedCallBySession = session ? pinnedCallsStore.getPinnedCallBySessionId(session.sessionId) : null

    if (!dto || !pinnedCallsStore.isPServedSession(dto.pServed)) {
      pinnedCallsStore.activePinnedCall = null
      pinnedCallsStore.setActivePinnedCallSessionId(null)
      return
    }

    if (!session && pinnedCallsStore.activePinnedCall?.pServed === dto.pServed) {
      pinnedCallsStore.setActivePinnedCallSessionId(null)
      return
    }

    pinnedCallsStore.activePinnedCall = pinnedCallBySession ?? null
    pinnedCallsStore.setActivePinnedCallSessionId(pinnedCallBySession?.sessionId ?? null)
  })
}

const setCallManagerSessionSelection = ({ sessionId, callId }: CallManagerSessionSelection = {}) => {
  selectedSessionId.value = sessionId ?? null
  selectedSessionCallId.value = callId ?? null
}

const resetCallManagerSessionSelection = () => {
  selectedSessionId.value = null
  selectedSessionCallId.value = null
}

const setCallManagerState = (
  state: CallManagerState,
  dto?: ConferenceDto | Contact | SubscriberStatus,
  sessionSelection?: CallManagerSessionSelection,
) => {
  console.debug(`setCallManagerState: ${CallManagerState[state]}, DTO: `, dto)

  callManagerState.value = state

  //todo возможно тут стоит еще делать setActivePinnedCall если он в завешенных
  if (dto && 'pServed' in dto) { // Если выбрали Пользователя или Конференцию
    selected.value = dto
    selectedStatusLine.value = undefined
    setCallManagerSessionSelection(sessionSelection)
  } else if (dto && 'callId' in dto) { // Если выбрали Линию абонента
    selectedStatusLine.value = dto
    selected.value = undefined
    setCallManagerSessionSelection({
      sessionId: sessionSelection?.sessionId,
      callId: dto.callId ?? sessionSelection?.callId,
    })
  } else if (state === CallManagerState.INITIAL) { // при клике на крестик в карточке
    selected.value = undefined
    selectedStatusLine.value = undefined
    resetCallManagerSessionSelection()
  } else if (sessionSelection) {
    setCallManagerSessionSelection(sessionSelection)
  } else {
    console.warn('На всякий случай проверить что происходит с selected и selectedSession, когда мы попадаем сюда', selected.value, selectedSession.value, selectedStatusLine.value)
  }
}

export const useCallManagerState = () => {
  ensurePinnedCallSelectionSync()

  return {
    callManagerState: readonly(callManagerState),
    selected, // могут напрямую обновлять selected, надо убедиться что не будет проблем
    selectedSession,
    selectedStatusLine,
    setCallManagerState,
  }
}
