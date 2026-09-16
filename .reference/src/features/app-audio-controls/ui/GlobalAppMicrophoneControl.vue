<template>
  <my-btn
    icon
    mode="toggle"
    :size="72"
    fixed-size
    :disabled="isMicrophoneButtonDisabled"
    :variant="microphoneButtonVariant"
    :tone="microphoneButtonTone"
    :active="isMicrophoneButtonActive"
    :prepend-icon="microphoneButtonIcon"
    @click.prevent="handleMicrophoneClick"
    @pointerdown.prevent="handleMicrophonePointerDown"
    @pointerup.prevent="handleMicrophonePointerUp"
    @pointerleave.prevent="handleMicrophonePointerUp"
    @pointercancel.prevent="handleMicrophonePointerUp"
  />
</template>

<script setup lang="ts">
import type { IconName } from '@wui/common-library'
import { computed, ref } from 'vue'

import { useDevicesSessionsStore, useDevicesStore } from '@/shared/composables'
import { handleGooseSpeakPress, handleGooseSpeakRelease } from '@/shared/controller'
import { MyBtn, type MyBtnTone, type MyBtnVariant } from '@/shared/ui'

const devicesStore = useDevicesStore()
const devicesSessionsStore = useDevicesSessionsStore()
const isMicrophoneButtonPressed = ref(false)

const gooseDevice = computed(() => devicesStore.readyPreferredGoose)
const isMicrophoneButtonDisabled = computed(() => !gooseDevice.value?.module)
const isPushToTalkMode = computed(() => gooseDevice.value?.mode === 'pushToTalk')
const isMicrophoneEnabled = computed(() => {
  if (!gooseDevice.value) return false

  return devicesSessionsStore.isGooseMicGloballyEnabled(gooseDevice.value)
})
const microphoneButtonIcon = computed<IconName>(() => (isMicrophoneEnabled.value ? 'micControlM' : 'micOffM'))
const microphoneButtonVariant = computed<MyBtnVariant>(() => {
  if (!isMicrophoneEnabled.value) return 'negcon'

  return 'neutcon'
})
const microphoneButtonTone = computed<MyBtnTone>(() => {
  if (!isMicrophoneEnabled.value) return 'base'

  return 'dark'
})
const isMicrophoneButtonActive = computed(() =>
  isPushToTalkMode.value && isMicrophoneButtonPressed.value,
)

const handleMicrophonePointerDown = () => {
  const device = gooseDevice.value

  if (!device?.module || !isPushToTalkMode.value) return

  isMicrophoneButtonPressed.value = true
  handleGooseSpeakPress(device, device.module)
}

const handleMicrophonePointerUp = () => {
  const device = gooseDevice.value

  if (!isPushToTalkMode.value) return

  isMicrophoneButtonPressed.value = false

  if (!device?.module) return

  handleGooseSpeakRelease(device, device.module)
}

const handleMicrophoneClick = () => {
  const device = gooseDevice.value

  if (!device?.module || isPushToTalkMode.value) return

  handleGooseSpeakRelease(device, device.module)
}
</script>
