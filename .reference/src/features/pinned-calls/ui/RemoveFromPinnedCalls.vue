<template>
  <template v-if="pinnedCallsStore.activePinnedCallSession">
    <wui-dropdown direction="right-bottom" close-on-click-outside>
      <template #activator="{ toggle }">
        <icon-button
          icon="remove"
          title="Убрать из завешенных"
          :disabled="!pinnedCallsStore.activePinnedCall"
          data-test="remove-btn"
          @click="toggle"
        />
      </template>
      <template #default="{ close }">
        <ul class="rounded-8 bg-black-735 border border-black-865 w-96">
          <li class="text-white border-b border-black-500 px-3 py-2">Выберите устройство для перевода:</li>
          <li
            v-for="device in devicesStore.readyQueueDevices"
            :key="device.id"
            class="text-white hover:bg-black-465 px-2 my-2 flex gap-x-2 items-center h-12"
            @click="onQueueDeviceClick(device, close)"
          >
            <div class="relative border rounded-4 mr-1 p-2">
              <wui-icon :name="device.icon" />
              <span v-if="device.iconNumber" class="absolute top-0 right-1 text-1321">{{ device.iconNumber }}</span>
            </div>
            <p>{{ device.name }}</p>
          </li>
        </ul>
      </template>
    </wui-dropdown>
  </template>
  <template v-else>
    <icon-button
      icon="remove"
      title="Убрать из завешенных"
      :disabled="!pinnedCallsStore.activePinnedCall"
      data-test="remove-btn"
      @click="removePinnedCall()"
    />
  </template>
</template>

<script setup lang="ts">
import { WuiDropdown, WuiIcon } from '@wui/common-library'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { usePinnedCallsStore } from '@/entities/call-session'

import { type LogicalMediaDevice, useDevicesStore } from '@/shared/composables'
import { IconButton } from '@/shared/ui'

const pinnedCallsStore = usePinnedCallsStore()
const devicesStore = useDevicesStore()
const { setCallManagerState } = useCallManagerState()

const removePinnedCall = (device?: LogicalMediaDevice | null) => {
  pinnedCallsStore.removeSelected(device)
  setCallManagerState(CallManagerState.INITIAL)
}

const onQueueDeviceClick = (device: LogicalMediaDevice, close: () => void) => {
  pinnedCallsStore.removeSelected(device)
  close()
}
</script>
