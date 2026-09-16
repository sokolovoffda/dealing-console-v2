<template>
  <icon-button
    :active="active"
    :icon="getIcon"
    :badge="iconNumber"
    :disabled="isPinned"
    @click="emits('toggle')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { RTCSessionFacade, usePinnedCallsStore } from '@/entities/call-session'

import { IconButton } from '@/shared/ui'
const pinnedCallsStore = usePinnedCallsStore()

const props = defineProps<{
  session: RTCSessionFacade
  active?: boolean
}>()

const emits = defineEmits<{
  (event: 'toggle'): void
}>()

const isPinned = computed(() => pinnedCallsStore.isPServedSession(props.session.pServed))

const getIcon = computed(() => {
  return props.session.currentDevice.value?.icon || 'unknown'
})
const iconNumber = computed(() => {
  return props.session.currentDevice.value?.iconNumber || ''
})
</script>

