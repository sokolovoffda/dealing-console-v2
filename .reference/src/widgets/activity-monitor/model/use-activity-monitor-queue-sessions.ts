import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useSessionStore, type RTCSessionFacade } from '@/entities/call-session'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { buildActivityMonitorQueueSessions } from './build-activity-monitor-queue-sessions'

/**
 * Очередь AM: сессии трубок + завешенных, без конференций.
 *
 * Реактивность: опираемся на `queueSessions` store (как CallQueue) + pinned slots,
 * а не только на `readonly(sessions)` — иначе легко «проспать» triggerRef.
 */
export const useActivityMonitorQueueSessions = () => {
  const {
    queueSessions: handsetQueueSessions,
    getSessionById,
  } = useSessionStore()
  const { slotSessionIds } = storeToRefs(usePinnedCallsPanelStore())

  const queueSessions = computed<RTCSessionFacade[]>(() => {
    return buildActivityMonitorQueueSessions(
      handsetQueueSessions.value,
      slotSessionIds.value.values(),
      getSessionById,
    )
  })

  const isQueueEmpty = computed(() => queueSessions.value.length === 0)

  return {
    queueSessions,
    isQueueEmpty,
  }
}
