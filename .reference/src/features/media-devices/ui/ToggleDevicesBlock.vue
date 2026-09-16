<template>
  <footer class="bg-black-800 flex flex-wrap gap-2 p-2 border-y border-black-665 ">
    <template v-for="item in readyQueueDevices" :key="item.id">
      <toggle-session-device :item="item" :session="session" />
    </template>
  </footer>
</template>

<script setup lang="ts">

import { storeToRefs } from 'pinia'

import { ToggleSessionDevice } from '@/features/settings'

import { RTCSessionFacade } from '@/entities/call-session'

import { useDevicesStore } from '@/shared/composables'

const devicesStore = useDevicesStore()
const { readyQueueDevices } = storeToRefs(devicesStore)

defineProps<{
  session?: RTCSessionFacade
}>()
</script>

