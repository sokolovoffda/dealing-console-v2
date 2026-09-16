<template>
  <div>
    <div
      v-if="isDialPadOn"
      class="bg-black text-white flex items-center justify-around text-key number-to-call drop-shadow"
    >
      <wui-icon
        name="phone"
        class="shrink text-positive-shades-600 ml-2 fixed left-4 duration-300 ease-in-out"
        :class="[telephoneNumber?.length < 9 ? 'top-6 !h-9 !w-9' : 'top-7 !h-7 !w-7']"
        large
      />
      <p
        class="text-left w-full h-full flex items-center truncate fixed center transition-all duration-300 ease-in-out"
        :class="[telephoneNumber?.length < 9 ? 'pl-20 text-4048' : 'pl-16 text-2440']"
      >
        {{ telephoneNumber }}
      </p>
      <wui-icon v-if="telephoneNumber.length > 1" name="clear" class="fixed right-12 cursor-pointer" large title="Очистить" @click="clearNumberToCall" />
      <wui-icon v-if="telephoneNumber.length" name="backspace" large class="fixed right-3 cursor-pointer" title="Удалить элемент" @click="backspace" />
    </div>

    <div class="text-white grid grid-cols-4 p-2 gap-2 bg-black-800 z-2" :class="{'rounded-8': !isDialPadOn}">
      <template v-if="isDialPadOn">
        <call-on-device-btn
          v-for="device in readyQueueDevices"
          :key="device.id"
          :device="device"
          title="Позвонить"
          :disabled="!telephoneNumber?.length"
          @click="call(device)"
        />
      </template>
      <icon-button
        icon="confCall" large-icon class="!w-[80px] !h-[80px]" title="Собрать конференцию"
        @click="addConference"
      />
      <icon-button
        icon="dialpad" large-icon title="Панель набора номера"
        class="!w-[80px] !h-[80px]"
        :active="isDialPadOn"
        @click="showHideDialpad"
      />
    </div>

    <wui-num-pad
      v-show="isDialPadOn"
      class="text-white bg-black-865 p-2 flex-grow z-1"
      @press="onNumpadPress"
    />
  </div>
</template>

<script lang="ts" setup>
import { WuiIcon, WuiNumPad } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { CallOnDeviceBtn } from '@/features/media-devices'


import { type LogicalMediaDevice, useDevicesStore } from '@/shared/composables'
import { useHandsetPickupHangupHandler } from '@/shared/controller'
import { useWebRTC } from '@/shared/jssip'
import { IconButton } from '@/shared/ui'


const { readyQueueDevices } = storeToRefs(useDevicesStore())
const { setCallManagerState } = useCallManagerState()
const { switchToCall } = useWebRTC()
const router = useRouter()

const { telephoneNumber, refreshTimer, hangupHandsetHandler: clearNumber } = useHandsetPickupHangupHandler()

const isDialPadOn = ref(false)

const onNumpadPress = (value: string): void => {
  telephoneNumber.value += value
}

const call = (device: LogicalMediaDevice): void => {
  if (telephoneNumber.value) {
    switchToCall(telephoneNumber.value, device)
  }
  clearNumber()
}

const addConference = () => {
  setCallManagerState(CallManagerState.CONFERENCE_CREATE)
  // Если в данный момент не открыта страница контактов переходим на эту страницу
  if (router.currentRoute.value.name !== 'Contacts') {
    router.push({ name: 'Contacts' })
  }
  // Открываем tab с контактами

}

const clearNumberToCall = (): void => {
  clearNumber()
}

const showHideDialpad = (): void => {
  isDialPadOn.value = !isDialPadOn.value
}

const backspace = (): void => {
  if (telephoneNumber.value.length > 0) {
    telephoneNumber.value = telephoneNumber.value.slice(0, -1)
    refreshTimer()
  }
}

watch(telephoneNumber, (number) => {
  if (number && !isDialPadOn.value) {
    isDialPadOn.value = true
  }
}, {
  immediate: true,
})

onBeforeUnmount(() => {
  // Очищаем номер
  clearNumber()
})
</script>

<style scoped>
.wui-icon-xlarge {
  width: 3rem;
  height: 3rem;
}

.number-to-call {
  height: 80px;
}
</style>
