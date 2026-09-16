<template>
  <icon-button
    v-bind="$attrs"
    :icon="device.icon"
    :badge="device.iconNumber"
    large-icon
    class="!w-[80px] !h-[80px] relative"
    :class="{
      '!bg-positive': devicesSession.has(getDeviceSessionKey(device))
        && device.type !== LogicalMediaDeviceTypeEnum.GOOSE,
    }"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import {
  LogicalMediaDeviceTypeEnum,
  type LogicalMediaDevice,
  useDevicesSessionsStore,
} from '@/shared/composables'
import { IconButton } from '@/shared/ui'

defineProps<{
  device: LogicalMediaDevice
}>()

const devicesSessionsStore = useDevicesSessionsStore()
const { devicesSession } = storeToRefs(devicesSessionsStore)
const { getDeviceSessionKey } = devicesSessionsStore

</script>

<style scoped>

</style>
