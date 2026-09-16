<template>
  <wui-icon :name="iconName" :class="iconClass" />
</template>

<script lang="ts" setup>
import { WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { CallHistoryItem } from '@/entities/call-history'

import { useAppStore } from '@/shared/composables'

const props = defineProps<{
  call: CallHistoryItem
}>()

const { currentUser } = storeToRefs(useAppStore())

const isOutgoing = computed(() => ('srcPServed' in props.call.item) && props.call.item.srcPServed === currentUser.value?.imLogin)

const isWarning = computed(() => ['dialing_terminated', 'call_missed', 'dialing_busy'].includes(props.call.item.event))

const iconName = computed(() => {
  if ('confId' in props.call.item && props.call.item.confId) return 'confCall'
  return isOutgoing.value ? 'callOutgoing' : 'callIncoming'
})
const iconClass = computed(() => {
  if('confId' in props.call.item && props.call.item.confId) return 'text-black-300'
  return isWarning.value ? 'text-red-shades-800' : 'text-positive-shades-900'
})
</script>
