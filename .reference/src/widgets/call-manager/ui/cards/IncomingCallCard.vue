<template>
  <section>
    <div class="relative py-3 px-5 flex flex-col justify-center items-center text-center bg-positive">
      <span
        v-if="callIndexLabel"
        class="absolute top-3 left-3 text-1214 leading-none px-1 py-0.5 rounded-4 bg-black-300 text-black-800"
      >
        {{ callIndexLabel }}
      </span>
      <wui-icon class="!w-16 !h-16 mb-2 text-black-800" :name="subscribers ? 'confCall' : 'user'" />
      <p class="mb-1 text-1624 truncate w-[330px]">{{ name }}</p>
      <p v-if="organization" class="mb-1 text-1416 text-black-800">{{ organization }}</p>
      <p v-if="number" class="text-1416 truncate w-[330px] text-black-800">{{ number }}</p>
      <p v-if="subscribers" class="text-1416 text-black-800">{{ subscribers }}</p>
    </div>
    <div class="grid grid-cols-4 p-2 gap-2">
      <template v-if="isPinned">
        <call-on-device-btn v-for="device in gooseDevices" :key="device.id" :title="'Ответить на звонок'" :device="device" @click="answer(device)" />
      </template>
      <template v-else>
        <call-on-device-btn v-for="device in readyQueueDevices" :key="device.id" :title="'Ответить на звонок'" :device="device" @click="answer(device)" />
      </template>
      <icon-button icon="callEndDown" large-icon class="!w-[80px] !h-[80px]" title="Отменить звонок" @click="cancel" />
      <global-ringtone-control />
    </div>
  </section>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { MediaConstraints } from '@wui/jssip/lib/RTCSession'
import { storeToRefs } from 'pinia'
import { computed, Ref, watch } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { GlobalRingtoneControl } from '@/features/global-ringtone'
import { CallOnDeviceBtn } from '@/features/media-devices'

import { usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { ConferenceDto, useResolvedConference } from '@/entities/conference'
import { Contact } from '@/entities/contact'

import {
  LogicalMediaDeviceTypeEnum,
  type LogicalMediaDevice,
  useDevicesStore,
} from '@/shared/composables'
import { IconButton } from '@/shared/ui'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

const pinnedCallsStore = usePinnedCallsStore()
const { getQueueSessionIndex } = useSessionStore()
const devicesStore = useDevicesStore()
const { readyPreferredGoose, readyQueueDevices } = storeToRefs(devicesStore)
const { selected: selectedRef, selectedSession } = useCallManagerState()
const selected = selectedRef as Ref<Contact | ConferenceDto | undefined>
const resolvedConference = useResolvedConference(computed(() => {
  if (selected.value && 'subscribers' in selected.value) {
    return selected.value
  }

  return undefined
}))

const session = computed(() => selectedSession.value)
const name = computed(() => {
  if (resolvedConference.value) {
    return resolvedConference.value.name || 'Неизвестная конференция'
  }

  return selected.value?.name || 'Неизвестный контакт'
})
const organization = computed(() => {
  if (resolvedConference.value) {
    return null
  }

  return (selected.value && 'organization' in selected.value) ? selected.value.organization : null
})
const number = computed(() => {
  if (resolvedConference.value) {
    return null
  }

  return (selected.value && 'internalNumber' in selected.value) ? selected.value.internalNumber : null
})
const subscribers = computed(() => {
  if (!resolvedConference.value) {
    return null
  }

  return `Участников: ${resolvedConference.value.subscribers.length}`
})
const isPinned = computed(() => {
  const pServed = resolvedConference.value?.pServed ?? selected.value?.pServed

  return pServed && pinnedCallsStore.isPServedSession(pServed)
})
const callIndexLabel = computed<number | null>(() => {
  const sessionId = selectedSession.value?.sessionId
  const pServed = resolvedConference.value?.pServed ?? selected.value?.pServed

  if (!pServed) {
    return null
  }

  const pinnedCall = sessionId
    ? pinnedCallsStore.getPinnedCallBySessionId(sessionId)
    : pinnedCallsStore.activePinnedCall?.pServed === pServed
      ? pinnedCallsStore.activePinnedCall
      : null

  if (pinnedCall && pinnedCallsStore.getPinnedCallsByPServed(pServed).length > 1) {
    return pinnedCall.slotIndex ?? null
  }

  return sessionId ? getQueueSessionIndex(sessionId) : null
})

const gooseDevices = computed(() => {
  const device = readyPreferredGoose.value

  return device?.type === LogicalMediaDeviceTypeEnum.GOOSE ? [device] : []
})

const answer = (device: LogicalMediaDevice) => {
  const mediaConstraints = {
    audio: {
      deviceId: normalizeAudioDeviceIdConstraint(device.inputId),
      echoCancellation: device.echoCancellation ?? true,
      noiseSuppression: device.noiseSuppression ?? true,
      autoGainControl: device.autoGainControl ?? true,
    },
    video: false,
  } as never as MediaConstraints

  if (!session.value) return

  session.value.answer({ mediaConstraints }, device)
}

const cancel = () => {
  session.value?.terminate()
}

watch(() => session.value, (value, oldValue) => {
  if (oldValue && !value) { // Если во время открытой карточки звонок завершается, сбрасываем состояние
    useCallManagerState().setCallManagerState(CallManagerState.INITIAL)
  }
})
</script>

<style scoped>

</style>
