<template>
  <slot
    :remove="remove"
    :loading="loading"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { useSessionStore } from '@/entities/call-session'
import { useRoomControl } from '@/entities/conference'

import { useNotification } from '@/shared/notifications'

const props = defineProps<{
  pServed: string
}>()

const { roomTerminate } = useRoomControl()
const { sessions } = useSessionStore()
const { callManagerState, setCallManagerState } = useCallManagerState()
const { showNotification } = useNotification()

const loading = ref(false)

const terminateLocalConferenceSessions = () => {
  Array.from(sessions.value.values()).forEach((session) => {
    const isConferenceSession = session.conference?.pServed === props.pServed || session.pServed === props.pServed

    if (isConferenceSession) {
      session.terminate()
    }
  })
}

const remove = async () => {
  if (!props.pServed) {
    return
  }

  try {
    loading.value = true
    await roomTerminate(props.pServed)
    terminateLocalConferenceSessions()

    if (
      callManagerState.value === CallManagerState.CONFERENCE_VIEW
      || callManagerState.value === CallManagerState.CONFERENCE_CALL
    ) {
      setCallManagerState(CallManagerState.INITIAL)
    }
  } catch (e) {
    console.error(e)
    showNotification({
      type: 'error',
      message: (e as Error).message || 'Не удалось завершить конференцию для всех',
    })
  } finally {
    loading.value = false
  }
}
</script>


<style scoped>

</style>
