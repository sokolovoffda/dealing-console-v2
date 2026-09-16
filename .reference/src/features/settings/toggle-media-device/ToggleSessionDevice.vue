<template>
  <button
    class="bg-black-735 w-20 h-10 rounded-8 relative text-white"
    :class="{'!bg-black-865': session?.currentDevice.value?.id === item.id}"
    data-test="select-device-btn"
    @click="changeSessionDevice()"
  >
    <wui-icon
      :name="item.icon"
      class="text-white"
      large
    />
    <span v-if="item.iconNumber" class="absolute top-0">{{ item.iconNumber }}</span>
  </button>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'

import { RTCSessionFacade } from '@/entities/call-session'

import {
  type LogicalMediaDevice,
  useDevicesSessionsStore,
} from '@/shared/composables'

const props = defineProps<{
  item: LogicalMediaDevice
  session?: RTCSessionFacade
}>()

const changeSessionDevice = (): boolean => {
  if (props.session) {
    useDevicesSessionsStore().bindSessionToDevice(props.session.sessionId, props.item.id)
    return true
  } else {
    console.warn('internal bug: session missing for unknown reason')
    return false
  }
}
</script>
