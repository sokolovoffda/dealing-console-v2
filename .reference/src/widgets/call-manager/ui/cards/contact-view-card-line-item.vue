<template>
  <div class="flex gap-2 w-full justify-between p-4 border-t border-black-500 text-white">
    <div :title="line.callId + ' ' + line.local + ' ' + line.remote">
      <wui-icon
        :name="isIncoming ? 'callIncoming' : 'callOutgoing'"
        :class="[isIncoming ? 'text-positive' : 'text-blue']"
        />
    </div>
    <div class="grow">
      <div>{{ bNumber }}</div>
      <div>{{ bContact?.name }}</div>
    </div>
    <div class="flex gap-2 h-fit">
      <wui-btn
        :disabled="!canPickup"
        icon
        rounded
        prepend-icon="callInterception"
        @click="onPickup()"
      />
      <wui-btn
        :disabled="!canIntrude || intrusionLoading"
        icon
        rounded
        :loading="intrusionLoading"
        prepend-icon="recordVoiceOver"
        @click="onIntrude()"
      />
    </div>
    
  </div>
</template>
<script setup lang="ts">
import { WuiIcon, WuiBtn } from '@wui/common-library'
import { ConferenceType, useIM } from '@wui/im'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { SubscriberStatus, useContactCachedStore } from '@/entities/contact'
import { usePickupStore } from '@/entities/pickup'

import { useAppStore, useAutoAnswer, useDevicesStore } from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'
import { contactNumberToPServed } from '@/shared/services'

const props = defineProps<{
  line: SubscriberStatus
}>()

const { contacts } = storeToRefs(useContactCachedStore())
const { hasNumberInGroups } = usePickupStore()
const { pickup } = useWebRTC()

const intrusionLoading = ref(false)
const aNumber = computed(() => props.line.internalNumber)
const isIncoming = computed(() => !!props.line.fromNumber)
const bNumber = computed(() => isIncoming.value ? props.line.fromNumber : props.line.targetNumber)

const bContact = computed(() => {
  return bNumber.value ? contacts.value.get(contactNumberToPServed(bNumber.value)) : undefined
})

const canPickup = computed(() => {
  if (!bNumber.value || !props.line.callId) {
    return false
  }
  return hasNumberInGroups(bNumber.value)
})

const canIntrude = computed(() => {
  if (!props.line.callId) {
    return false
  }
  return props.line.remote === 'confirmed' || props.line.local === 'confirmed'
})

const onPickup = () => {
  const number = bNumber.value
  const replaceableCallId = props.line.callId

  if (!number || !replaceableCallId) {
    console.warn('incorrect number or callId: ', number, replaceableCallId)
    return
  }

  pickup({
    number,
    replaceableCallId,
  })
}

const onIntrude = async () => {
  const replaceableCallId = props.line.callId
  const cNumber = useAppStore().currentUser?.internalNumber
  if (!replaceableCallId || !cNumber || !aNumber.value || !bNumber.value) {
    console.debug('It is not possible to join a call', replaceableCallId, cNumber, aNumber.value, bNumber.value)
    return
  }
  const numberList = [aNumber.value, bNumber.value, cNumber]
  const name = numberList.join(', ')
  try {
    intrusionLoading.value = true
    const res = await useIM().createConference({
      mode: ConferenceType.FREE_FOR_ALL,
      name,
      subscribers: numberList.map((number) => ({ number, role: cNumber === number ? 'Owner' : 'User' })),
      replaceableCallId,
    })
    const { registerAutoAnswer } = useAutoAnswer()
    registerAutoAnswer(res.item.pServed, useDevicesStore().readyQueueDevices[0])
  } catch (e) {
    console.error(e)
  } finally {
    setTimeout(() => intrusionLoading.value = false, 2000)
  }
  
}

watch(bNumber, (v) => {
  if (v && !bContact.value) {
    useContactCachedStore().fetchContactsBySomeIds(v, 'internalNumber')
  }
}, { immediate: true })
</script>
