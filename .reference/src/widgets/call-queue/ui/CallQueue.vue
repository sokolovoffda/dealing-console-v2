<template>
  <div
    v-chain-tooltip="tooltips.callQueue" 
    class="call-queue border border-black-600 overflow-auto rounded-8 p-2 w-[362px]"
  >
    <empty-queue v-if="!queueSessions.length" />
    <ul v-else class="flex flex-col gap-y-1">
      <li
        v-for="session in queueSessions" :key="session.sessionId"
        class="mb-1"
      >
        <call-queue-item
          :session="session"
          :active="session.sessionId === selectedSession?.sessionId"
          :session-index="getQueueSessionIndex(session.sessionId)"
          @select="onQueueItemClick(session)"
        />
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { vChainTooltip } from '@wui/common-library'

import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { useSessionStore, RTCSessionFacade, STATE, checkDtoByPServed } from '@/entities/call-session'
import { tooltips } from '@/entities/tooltips'

import CallQueueItem from './CallQueueItem.vue'
import EmptyQueue from './EmptyQueue.vue'

const { queueSessions, getQueueSessionIndex } = useSessionStore()
const { setCallManagerState, selectedSession } = useCallManagerState()

const onQueueItemClick = (session: RTCSessionFacade) => {
  const conferenceTitle = session.conference?.name

  if (session.conference) {
    const conference = session.conference

    if (session.sessionState.value === STATE.RINGING) {
      setCallManagerState(CallManagerState.INCOMING_CALL, conference, {
        sessionId: session.sessionId,
        callId: session.callId.value,
      })
      return
    }

    setCallManagerState(CallManagerState.CONFERENCE_CALL, conference, {
      sessionId: session.sessionId,
      callId: session.callId.value,
    })
    return
  }

  const { type, dto } = checkDtoByPServed(session.pServed, {
    number: session.number,
    title: conferenceTitle,
  })

  if (session.sessionState.value === STATE.RINGING) {
    setCallManagerState(CallManagerState.INCOMING_CALL, dto, {
      sessionId: session.sessionId,
      callId: session.callId.value,
    })
    return
  }

  if (type === 'contact') {
    setCallManagerState(CallManagerState.CONTACT_CALL, dto, {
      sessionId: session.sessionId,
      callId: session.callId.value,
    })
  } else if (type === 'conference') {
    setCallManagerState(CallManagerState.CONFERENCE_CALL, dto, {
      sessionId: session.sessionId,
      callId: session.callId.value,
    })
  }

}
</script>
