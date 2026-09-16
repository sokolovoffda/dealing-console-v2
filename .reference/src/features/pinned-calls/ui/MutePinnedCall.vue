<template>
  <button
    :class="[
      micStatusBgClass
    ]"
    data-test="mute-btn"
    @click="onToggleMute()"
  >
    <wui-icon
      :name="iconName"
      class="!w-full px-3 !h-6"
      :class="iconColor"
    />
  </button>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { computed } from 'vue'

import { usePinnedCallsStore, PinnedCall, RTCSessionFacade } from '@/entities/call-session'

const pinnedCallsStore = usePinnedCallsStore()

const props = defineProps<{
  session: RTCSessionFacade | undefined
  pinnedCall: PinnedCall
}>()

const isMuted = computed(() => {
  return !pinnedCallsStore.isPinnedCallMicDisplayedEnabled(props.pinnedCall)
})

const onToggleMute = () => {
  if (props.session && !pinnedCallsStore.isPinnedCallManagedByPinnedDevice(props.pinnedCall)) {
    props.session.toggleMute()
    return
  }

  pinnedCallsStore.togglePinnedCallMicState({
    order: props.pinnedCall.order,
    action: 'toggle',
  })
}

const iconName = computed(() => {
  return isMuted.value ? 'gooseneclMicOff' : 'micSpeaker'
})

const iconColor = computed(() => {
  if (props.session) {
    return 'hover:!text-black-800 text-white'
  }
  return 'hover:!text-black-800 !text-black-600'
})

const micStatusBgClass = computed(() => {
  if (props.session) {
    return isMuted.value ? 'hover:bg-warning-shades-500 bg-warning-shades-800' : 'hover:bg-positive-shades-500 bg-positive-shades-800'
  }
  return isMuted.value ? 'hover:bg-warning-shades-100 bg-warning-shades-200' : 'hover:bg-positive-shades-100 bg-positive-shades-200'
})
</script>
