<template>
  <slot
    v-if="canModerate"
    :callWithMutedParticipants="call"
    :loading="loading"
  />
</template>

<script setup lang="ts">
import { useRenderNotifier } from '@wui/common-library'
import { ConferenceType, useIM } from '@wui/im'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import { useConferenceState, useRoomControl } from '@/entities/conference'

import { useAppStore, useAutoAnswer, useDevicesStore } from '@/shared/composables'
import { wait } from '@/shared/utils/useWait'

const props = defineProps<{
  pServed: string
}>()

const { notifyWarning } = useRenderNotifier()
const { roomCall } = useRoomControl()
const { currentUser } = useAppStore()
const { getConfByPServed } = useConferenceState()
const { registerAutoAnswer } = useAutoAnswer()
const deviceStore = useDevicesStore()
const { readyQueueDevices } = storeToRefs(deviceStore)
const { muteAllAudioExceptExecuter } = useIM()

const loading = ref(false)
const call = async () => {
  if (!canModerate.value) return
  
  try {
    loading.value = true
    registerAutoAnswer(props.pServed, readyQueueDevices.value[0])
    await roomCall(props.pServed)
    await wait(1000)
    await muteAllAudioExceptExecuter({
      pServed: props.pServed,
    })
  } catch (e: unknown) {
    notifyWarning((e as Error).message)
  } finally {
    loading.value = false
  }
  
  
}
const conference = computed(() => {
  return getConfByPServed(props.pServed)
})

const contact = computed(() => {
  return conference.value?.subscribers?.find((c) => c.pServed === currentUser?.imLogin)
})

const isModerator = computed(() => {
  return conference.value?.selectorMode === ConferenceType.FREE_FOR_ALL || (conference.value?.selectorMode === ConferenceType.MODERATED && (contact.value?.role === 'Moderator' || contact.value?.role === 'Owner'))
})

const canModerate = computed(() => {
  return !!(conference.value && contact.value && isModerator.value)
  
})
</script>
