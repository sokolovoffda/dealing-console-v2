<template>
  <div v-chain-tooltip="tooltips.contactViewCardDeviceCheck">
    <div class="relative py-3 px-5 flex flex-col justify-center items-center text-center bg-primary-tints-600">
      <span
        v-if="callIndexLabel"
        class="absolute top-3 left-3 text-1214 leading-none px-1 py-0.5 rounded-4 bg-black-300 text-black-800"
      >
        {{ callIndexLabel }}
      </span>
      <wui-btn
        icon prepend-icon="clear"
        class="!absolute top-3 right-3 cursor-pointer !bg-primary-tints-600 hover:!bg-primary-tints-800 !text-black-800 !rounded-8"
        @click="unselectContact"
      />
      <wui-icon class="!w-16 !h-16 mb-2 text-black-800" name="user" />
      <p class="mb-1 truncate w-[330px] text-1624">{{ selected?.name || 'Неизвестный контакт' }}</p>
      <p v-if="selected?.organizationalUnit" class="mb-1 text-1416 text-black-800">{{ selected?.organizationalUnit }}</p>
      <p v-if="selected?.position" class="mb-1 text-1416 text-black-800">{{ selected?.position }}</p>
      <p class="truncate w-[330px] text-1416 text-black-800">{{ selected?.internalNumber || 'Внешний контакт: ' + selected.mobilePhone || 'Номер не определен' }}</p>
    </div>
    <div
      class="grid grid-cols-4 p-2 gap-2"
    >
      <template v-if="isPinned">
        <call-on-device-btn v-for="device in gooseDevices" :key="device.id" :device="device" title="Позвонить" @click="() => call(device)" />
      </template>
      <call-on-device-btn v-for="device in readyQueueDevices" :key="device.id" :device="device" title="Позвонить" @click="() => call(device)" />
      <icon-button v-if="!selected?.isExternal" disabled icon="confCall" large-icon class="!w-[80px] !h-[80px]" title="Добавить в конференцию" />
      <icon-button v-if="selected?.isExternal" icon="deleteForever" large-icon class="!w-[80px] !h-[80px]" title="Удалить внешний контакт" @click="deleteExternalContact" />
    </div>
    <div
      v-if="currentLines.length > 0"
      class="mt-2"
    >
      <div class="pl-2 text-white font-bold pb-2">Линии абонента</div>
      <contact-view-card-line-item
        v-for="(line, i) in currentLines"
        :key="line.callId"
        :line="line"
        :class="[i > 0 ? 'border-t border-black-600' : '']"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { WuiBtn, WuiIcon, vChainTooltip } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onMounted, Ref } from 'vue'

import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { CallOnDeviceBtn } from '@/features/media-devices'

import { unselectContact, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { Contact, useContactStatusState, useContactStore } from '@/entities/contact'
import { tooltips, TooltipsScenarios, useTooltip } from '@/entities/tooltips'

import {
  LogicalMediaDeviceTypeEnum,
  type LogicalMediaDevice,
  useDevicesStore,
} from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'
import { IconButton } from '@/shared/ui'

import ContactViewCardLineItem from './contact-view-card-line-item.vue'

const pinnedCallsStore = usePinnedCallsStore()
const { getQueueSessionIndex } = useSessionStore()
const devicesStore = useDevicesStore()
const { readyPreferredGoose, readyQueueDevices } = storeToRefs(devicesStore)
const { switchToCall } = useWebRTC()
const { deleteExternalContactFromIndexedDb } = useContactStore()
const { startScenario } = useTooltip()
const { findLinesByInternalNumber } = useContactStatusState()

const selected = <Ref<Contact>>useCallManagerState().selected

const currentLines = computed(() => {
  if (selected.value.internalNumber) {
    return findLinesByInternalNumber(selected.value.internalNumber)
  }
  return []
})

const isPinned = computed(() => selected.value && pinnedCallsStore.isPServedSession(selected.value.pServed))
const pinnedSlotOrder = computed(() => pinnedCallsStore.activePinnedCall?.order)
const callIndexLabel = computed<number | null>(() => {
  const pServed = selected.value?.pServed

  if (!pServed) {
    return null
  }

  const pinnedCall = pinnedCallsStore.activePinnedCall?.pServed === pServed
    ? pinnedCallsStore.activePinnedCall
    : null

  if (pinnedCall && pinnedCallsStore.getPinnedCallsByPServed(pServed).length > 1) {
    return pinnedCall.slotIndex ?? null
  }

  return pinnedCall?.sessionId ? getQueueSessionIndex(pinnedCall.sessionId) : null
})
const gooseDevices = computed(() => {
  const device = readyPreferredGoose.value

  return device?.type === LogicalMediaDeviceTypeEnum.GOOSE ? [device] : []
})

const call = (device: LogicalMediaDevice): void => {
  const contact = selected.value
  if (contact.internalNumber) {
    switchToCall(contact.internalNumber, device, undefined, undefined, pinnedSlotOrder.value)
  } else if (contact.mobilePhone) {
    switchToCall(contact.mobilePhone, device, undefined, undefined, pinnedSlotOrder.value)
  }
}

const deleteExternalContact = () => {
  deleteExternalContactFromIndexedDb(selected.value.pServed)
  useCallManagerState().setCallManagerState(CallManagerState.INITIAL)
}

onMounted(() => {
  const gooseIsEmpty = isPinned.value && !gooseDevices.value.length
  const queueIsEmpty = !isPinned.value && !readyQueueDevices.value.length
  if (gooseIsEmpty || queueIsEmpty) {
    startScenario(TooltipsScenarios.CONTACT_VIEW_CARD)
  }
})
</script>
