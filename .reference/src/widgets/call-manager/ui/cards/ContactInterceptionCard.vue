<template>
  <section>
    <div class="relative py-3 px-5 flex flex-col justify-center items-center gap-y-1" :class="background">
      <wui-btn
        icon prepend-icon="clear"
        class="!absolute top-3 right-3 cursor-pointer hover:opacity-50 !text-black-800 !rounded-8"
        :class="`!${background}`"
        @click="unselectContact"
      />
      <wui-icon class="!w-16 !h-16 mb-2 text-black-800" name="phoneCall" />
      <p class="flex items-center gap-x-2 text-black-800">
        <wui-icon :name="targetContact ? 'callMade' : 'callReceived'" />
        {{ initialContact?.name ?? "Неизвестный контакт" }}
      </p>
      <p class="text-1416 text-black-800">
        <wui-icon :name="targetContact ? 'callReceived' : 'callMade'" />
        {{ targetContact?.name ?? fromContact?.name ?? "Неизвестный контакт" }}
      </p>
      <p class="text-1416">
        {{ duration }}
      </p>
    </div>
    <div class="flex p-2 gap-x-2">
      <template v-if="fromContact && alerting">
        <icon-button
          icon="callInterception"
          large-icon
          class="!w-[80px] !h-[80px] shrink-0"
          title="Перехватить вызов"
          :disabled="!pickupIsEnabled"
          @click="pickupCall"
        />
        <p v-if="!pickupIsEnabled" class="flex items-center text-white text-center">
          Невозможно перехватить вызов, обратитесь к администратору
        </p>
      </template>
      <template v-else-if="confirmed">
        <icon-button
          large-icon
          icon="recordVoiceOver"
          class="!w-[80px] !h-[80px] shrink-0"
          title="Подключиться к разговору"
          @click="createConferenceFromTetATet"
        />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { WuiBtn, WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, Ref, watch } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { useCreateConferenceFromTetATet } from '@/features/create-conference-from-tet-a-tet'

import { unselectContact, useSessionTimer } from '@/entities/call-session'
import { CallStatusState, Contact, SubscriberStatus, useContactStatusState, useContactStore } from '@/entities/contact'
import { usePickupStore } from '@/entities/pickup'

import { useWebRTC } from '@/shared/jssip'
import { IconButton } from '@/shared/ui'

const status: Ref<SubscriberStatus | undefined> = useCallManagerState().selectedStatusLine

const { pickup } = useWebRTC()
const { getByInternalNumber } = useContactStore()
const { duration, start: startCallTimer, stop: stopCallTimer } = useSessionTimer()
const { startCreating, create, setContact } = useCreateConferenceFromTetATet()
const { hasNumberInGroups } = usePickupStore()

const initialContact = computed(() => status.value && getByInternalNumber(status.value.internalNumber))
const targetContact = computed(() => status.value && getByInternalNumber(status.value.targetNumber ?? ''))
const fromContact = computed(() => status.value && getByInternalNumber(status.value.fromNumber ?? ''))

const pickupIsEnabled = computed(() => initialContact.value && hasNumberInGroups(initialContact.value.internalNumber))

const alerting = computed(() => status.value?.remote === CallStatusState.EARLY)
const confirmed = computed(() => status.value?.remote === CallStatusState.CONFIRMED)

const createConferenceFromTetATet = () => {
  if (!status.value?.callId) {
    console.debug('It is not possible to join a call because the status for this operation is incorrect: ', status.value?.callId)
    return
  }
  startCreating()
  if (initialContact.value) {
    setContact(initialContact.value as Contact)
  }
  if (targetContact.value) {
    setContact(targetContact.value as Contact)
  }
  if (fromContact.value) {
    setContact(fromContact.value as Contact)
  }
  create(status.value.callId, null)
}

const pickupCall = () => {
  if (!pickupIsEnabled.value) return

  const number = status.value?.fromNumber
  const replaceableCallId = status.value?.callId

  if (!number || !replaceableCallId) {
    console.warn('incorrect number or callId: ', number, replaceableCallId)
    return
  }

  pickup({
    number,
    replaceableCallId,
  })
}

const { lines } = storeToRefs(useContactStatusState())
const currentLineStatus = computed(() => { // const status не реактивен, дергаем апдейты с мапы линий
  return status.value?.internalNumber && lines?.value.get(status.value?.internalNumber)?.find(line => line.callId === status.value?.callId)
})

watch(currentLineStatus, () => {
  if(!currentLineStatus.value) {
    useCallManagerState().setCallManagerState(CallManagerState.INITIAL)
  }
})

const background = computed(() => {
  if(!currentLineStatus.value) return ''
  switch (currentLineStatus.value?.remote) {
  case CallStatusState.EARLY: return 'bg-threshold'
  case CallStatusState.CONFIRMED: return 'bg-positive'
  case CallStatusState.HOLD: return 'bg-threshold'
  default: return ''
  }
})

onMounted(() => {
  startCallTimer()
})

onBeforeUnmount(() => {
  stopCallTimer()
})
</script>
