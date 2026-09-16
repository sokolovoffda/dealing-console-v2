import { useIM, isCallPastMessage, AnyMessageCallEvent, HistoryMessageItem, MessageStatusType } from '@wui/im'
import { defineStore, storeToRefs } from 'pinia'
import { readonly, ref, shallowRef, triggerRef, watch } from 'vue'

import { CallHistoryItem } from '@/entities/call-history'

import { useAppStore } from '@/shared/composables'

/** Служебный IM-диалог журнала звонков (как в rtu-user-web-app CALL_CONTACT_URI). */
const CALLS_SYSTEM_PSERVED = '<sip:calls@system>'
const HISTORY_PAGE_SIZE = 100

export const useCallHistoryStore = defineStore('call-history', () => {
  const { requestChatHistory, onCallMessage } = useIM()
  const appStore = useAppStore()
  const { onIMReady } = storeToRefs(appStore)
  const history = shallowRef<CallHistoryItem[]>([])
  const loading = ref(false)
  const isFullyLoaded = ref(false)
  /** Cursor для older-страницы: eventId последнего события предыдущего ответа History. */
  const cursorEventId = ref<number | undefined>(undefined)
  let isFetching = false

  watch(onIMReady, (isReady) => {
    if (!isReady) return

    fetchHistory().catch((e: Error) => {
      console.error(e)
    })
  })

  const sortByTimestampDesc = (events: CallHistoryItem[]) =>
    [...events].sort((a, b) => b.item.timestamp - a.item.timestamp)

  const requestPage = async (lastEventId?: number) => {
    return requestChatHistory({
      pServed: CALLS_SYSTEM_PSERVED,
      messagesLimit: HISTORY_PAGE_SIZE,
      ...(lastEventId != null ? { lastEventId } : {}),
    })
  }

  const markCursorFromEvents = (events: HistoryMessageItem[]) => {
    const last = events.at(-1)
    cursorEventId.value = last?.eventId
  }

  const isEmptyOrStalePage = (events: HistoryMessageItem[], previousCursor?: number) => {
    if (events.length === 0) return true
    // Как web: сервер иногда возвращает только курсорное событие без новых.
    if (events.length === 1 && previousCursor != null && events[0]?.eventId === previousCursor) {
      return true
    }
    return false
  }

  const fetchHistory = async (): Promise<boolean> => {
    if (!onIMReady.value || isFetching) return false

    isFetching = true
    loading.value = true
    isFullyLoaded.value = false
    cursorEventId.value = undefined

    try {
      const { events } = await requestPage()

      if (isEmptyOrStalePage(events)) {
        history.value = []
        isFullyLoaded.value = true
        triggerRef(history)
        return true
      }

      history.value = sortByTimestampDesc(events.filter(isCallPastMessage))
      markCursorFromEvents(events)
      if (events.length < HISTORY_PAGE_SIZE) isFullyLoaded.value = true
      triggerRef(history)

      return true
    } catch (e) {
      console.error(e)
      return false
    } finally {
      isFetching = false
      loading.value = false
    }
  }

  /** Догрузка более старых событий (как web fetchNext / lastEventId). */
  const fetchMore = async (): Promise<boolean> => {
    if (!onIMReady.value || isFetching || isFullyLoaded.value) return false
    if (cursorEventId.value == null) return false

    isFetching = true
    loading.value = true
    const previousCursor = cursorEventId.value

    try {
      const { events } = await requestPage(previousCursor)

      if (isEmptyOrStalePage(events, previousCursor)) {
        isFullyLoaded.value = true
        return true
      }

      const existingIds = new Set(history.value.map(item => item.eventId))
      const fresh = events
        .filter(isCallPastMessage)
        .filter(item => !existingIds.has(item.eventId))

      if (fresh.length === 0) {
        isFullyLoaded.value = true
        markCursorFromEvents(events)
        return true
      }

      history.value = sortByTimestampDesc([...history.value, ...fresh])
      markCursorFromEvents(events)
      if (events.length < HISTORY_PAGE_SIZE) isFullyLoaded.value = true
      triggerRef(history)

      return true
    } catch (e) {
      console.error(e)
      return false
    } finally {
      isFetching = false
      loading.value = false
    }
  }

  onCallMessage((event: AnyMessageCallEvent) => {
    // Как web: live-события от самого calls@system не дублируем.
    if ('from' in event && event.from === CALLS_SYSTEM_PSERVED) return

    const { eventId, rank, timestamp } = event
    const wrapped: HistoryMessageItem<AnyMessageCallEvent> = {
      item: event,
      eventId,
      type: 9,
      rank,
      status: MessageStatusType.INITIAL,
      timestamp,
    }

    if (!isCallPastMessage(wrapped)) return
    if (history.value.some(item => item.eventId === wrapped.eventId)) return

    history.value = [wrapped, ...history.value]
    triggerRef(history)
  })

  return {
    calls: history,
    loading: readonly(loading),
    isFullyLoaded: readonly(isFullyLoaded),
    fetchHistory,
    fetchMore,
    $reset: () => {
      history.value = []
      loading.value = false
      isFullyLoaded.value = false
      cursorEventId.value = undefined
      triggerRef(history)
    },
  }
})
