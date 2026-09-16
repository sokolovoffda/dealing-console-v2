<template>
  <section>
    <div class="relative py-3 px-5 flex flex-col justify-center items-center text-center bg-positive">
      <span
        v-if="callIndexLabel"
        class="absolute top-3 left-3 text-1214 leading-none px-1 py-0.5 rounded-4 bg-black-300 text-black-800"
      >
        {{ callIndexLabel }}
      </span>
      <wui-btn
        icon prepend-icon="clear"
        class="!absolute top-3 right-3 cursor-pointer !bg-positive hover:!bg-positive-tints-600 !text-black-800 !rounded-8"
        @click="unselectContact"
      />
      <wui-icon name="phoneCall" class="!w-16 !h-16 mb-2 text-black-800" />
      <p class="mb-1 truncate w-[330px]">{{ selectedSession?.contact?.name || 'Неизвестно' }}</p>
      <p class="mb-1 truncate w-[330px]">{{ selectedSession?.contact?.internalNumber || 'Номер не определен' }}</p>
      <p v-if="selectedSession?.contact?.organizationalUnit" class="mb-1 text-1416 text-black-800">{{ selectedSession?.contact?.organizationalUnit }}</p>
      <p v-if="selectedSession?.contact?.position" class="mb-1 text-1416 text-black-800">{{ selectedSession?.contact?.position }}</p>
      <p class="text-1416 text-black-800">{{ selectedSession?.timer?.duration.value }}</p>
    </div>

    <!-- used for refer call to number -->
    <div v-if="isTransferDialPadOn" class="bg-black text-white flex items-center justify-around text-key number-to-call drop-shadow">
      <wui-icon
        name="phone" large class="cursor-pointer ml-2 fixed left-5"
        :class="telephoneNumber.length ? 'text-positive !w-[40px] !h-[40px] p-1 border rounded-8' : ''"
        @click="callFromDialPad()"
      />
      <p class="w-1/2 text-center h-full flex items-center truncate fixed center"> {{ telephoneNumber }} </p>
      <wui-icon v-if="telephoneNumber.length > 1" name="clear" class="fixed right-12" large @click="clearNumberToCall" />
      <wui-icon v-if="telephoneNumber.length" name="backspace" large class="fixed right-3" @click="backspace" />
    </div>
    <div v-else-if="isDtmfDialPadOn" class="bg-black text-white flex items-center justify-center text-key number-to-call drop-shadow">
      <p class="text-center">DTMF</p>
    </div>

    <div class="grid grid-cols-4 p-2 gap-2 border-b border-t border-black-665">
      <icon-button
        title="Завершить вызов"
        icon="callEndDown" large-icon class="!w-[80px] !h-[80px]"
        @click="onCallEndClick"
      />
      <icon-button
        v-if="selectedSession?.sessionState.value !== STATE.PROGRESS && selectedSession?.sessionState.value !== STATE.INITIAL"
        :title="isMuted ? 'Включить микрофон' : 'Выключить микрофон'"
        :icon="isMuted ? 'micOff' : 'mic'"
        large-icon
        class="!w-[80px] !h-[80px]"
        @click="toggleMute"
      />
      <icon-button
        v-if="selectedSession?.sessionState.value !== STATE.PROGRESS && selectedSession?.sessionState.value !== STATE.INITIAL"
        title="Удержание вызова"
        icon="callPaused" large-icon class="!w-[80px] !h-[80px]"
        :class="{'!text-orange-peel': isOnHold}"
        @click="onCallHoldClick"
      />
      <create-conference-from-tet-a-tet
        v-if="selectedSession && selectedSession?.sessionState.value !== STATE.PROGRESS && selectedSession?.sessionState.value !== STATE.INITIAL"
        :call-id="selectedSession.callId.value"
        :device="selectedSession.currentDevice.value"
        :initial-contact="selectedSession.contact as Contact"
      >
        <template #default="{ loading, creating, create, disabled }">
          <icon-button
            title="Добавить контакт к разговору"
            :loading="loading"
            :icon="creating ? 'check' : 'addIcCall'" large-icon class="!w-[80px] !h-[80px]"
            :disabled="isCreatingConference || selectedReferType || loading || (creating && disabled)"
            @click="create"
          />
        </template>
      </create-conference-from-tet-a-tet>
      <icon-button
        v-if="isCreatingConferenceFromTetATet"
        title="Отменить создание конференции из тет-а-тет диалога"
        icon="clear" large-icon class="!w-[80px] !h-[80px]"
        @click="cancelConferenceFromTetATet"
      />
      <template v-if="isSessionStateValid">
        <icon-button
          v-if="isConsultationTransferSession"
          title="Объединить сессии"
          icon="callMerge"
          large-icon
          class="!w-[80px] !h-[80px]"
          @click="executeRefer()"
        />
        <wui-dropdown
          v-else
          close-on-click-outside
          direction="top-left"
        >
          <template #activator="{ toggle }">
            <icon-button
              v-if="isSessionStateValid"
              :title="selectedReferType ? 'Отменить перевод вызова': 'Перевод вызова'"
              :icon="selectedReferType ? 'clear' : 'callForwarded'"
              large-icon
              class="!w-[80px] !h-[80px]"
              :disabled="isCreatingConferenceFromTetATet || isCreatingConference"
              @click="() => {
                if (selectedReferType) {
                  stopRefer()
                } else {
                  toggle()
                }
              }"
            />
          </template>
          <template #default="{ close }">
            <ul class="rounded-8 bg-black-735 border border-black-865 w-[344px] overflow-hidden">
              <li
                class="text-white border-b border-black-500 px-3 py-3 hover:bg-black-600 cursor-pointer"
                @click="() => {
                  initReferCall('blind')
                  close()
                }"
              >
                Слепой перевод
              </li>
              <li
                class="text-white px-3 py-3 hover:bg-black-600 cursor-pointer"
                @click="() => {
                  initReferCall('consultation')
                  close()
                }"
              >
                Перевод с сопровождением
              </li>
            </ul>
          </template>
        </wui-dropdown>
      </template>
      <icon-button
        v-if="isSessionStateValid"
        icon="dialpad" large-icon class="!w-[80px] !h-[80px]"
        :title="selectedReferType ? 'Панель набора номера' : 'DTMF'"
        :active="isTransferDialPadOn || isDtmfDialPadOn"
        @click="showHideCallDialpad"
      />
      <redirect-peer-to-peer-to-conference 
        v-if="selectedSession?.callId" 
        :call-id="selectedSession.callId.value"
        :internal-number="selectedSession.number"
      />
    </div>

    <wui-num-pad
      v-show="isTransferDialPadOn || isDtmfDialPadOn"
      class="text-white bg-black-865 p-2 flex-grow border-x border-b border-black-600 rounded-bl-block z-1"
      @press="onNumpadPress"
    />
    <toggle-devices-block v-if="toggleDevicesOpen" :session="selectedSession" />
  </section>
</template>

<script lang="ts" setup>
import { WuiBtn, WuiDropdown, WuiIcon, WuiNumPad } from '@wui/common-library'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import {
  CreateConferenceFromTetATet,
  useCreateConferenceFromTetATet,
} from '@/features/create-conference-from-tet-a-tet'
import { ToggleDevicesBlock } from '@/features/media-devices'
import { RedirectPeerToPeerToConference } from '@/features/redirect-peer-to-peer-to-conference'
import { useReferCallState } from '@/features/refer-call'

import { STATE, type SessionMediaDevice, unselectContact, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { useConferenceDraft } from '@/entities/conference'
import { Contact } from '@/entities/contact'

import { useDevicesStore } from '@/shared/composables'
import { useHandsetPickupHangupHandler } from '@/shared/controller'
import { useWebRTC } from '@/shared/jssip'
import { IconButton } from '@/shared/ui'

const { finishCreating: cancelConferenceFromTetATet, creating: isCreatingConferenceFromTetATet } = useCreateConferenceFromTetATet()
const { startProcess: startRefer, selectedReferType, finishProcess: stopRefer, executeRefer } = useReferCallState()
const { isActive: isCreatingConference, cancelConferenceDraft } = useConferenceDraft()
const { switchToCall } = useWebRTC()
const { selectedSession, setCallManagerState } = useCallManagerState()
const { telephoneNumber, hangupHandsetHandler: clearNumber, refreshTimer } = useHandsetPickupHangupHandler()
const devicesStore = useDevicesStore()
const pinnedCallsStore = usePinnedCallsStore()
const { getQueueSessionIndex } = useSessionStore()

const panelMode = ref<'transfer' | 'dtmf' | null>(null)
const toggleDevicesOpen = ref(false)

const isSessionStateValid = computed(() => selectedSession.value && selectedSession.value.sessionState.value !== STATE.PROGRESS && selectedSession.value.sessionState.value !== STATE.INITIAL) 
const isConsultationTransferSession = computed(() => !!selectedSession.value?.referCallId.value)
const isOnHold = computed(() => selectedSession.value?.sessionState.value === STATE.ONHOLD)
const isMuted = computed(() => selectedSession.value?.isMuted.value)
const isTransferDialPadOn = computed(() => panelMode.value === 'transfer')
const isDtmfDialPadOn = computed(() => panelMode.value === 'dtmf')
const callIndexLabel = computed<number | null>(() => {
  const sessionId = selectedSession.value?.sessionId
  const pServed = selectedSession.value?.pServed

  if (!sessionId || !pServed) {
    return null
  }

  const pinnedCall = pinnedCallsStore.getPinnedCallBySessionId(sessionId)

  if (pinnedCall && pinnedCallsStore.getPinnedCallsByPServed(pServed).length > 1) {
    return pinnedCall.slotIndex ?? null
  }

  return getQueueSessionIndex(sessionId)
})

const onCallEndClick = () => {
  if (selectedSession.value) {
    selectedSession.value.terminate()
    return
  }
  // Если сессии по какой-то причине нет, выставляем состояние по умолчанию
  setCallManagerState(CallManagerState.INITIAL)
}

const toggleMute = () => {
  selectedSession.value?.toggleMute()
}

const onCallHoldClick = () => {
  selectedSession.value?.toggleHold()
}

const onNumpadPress = (value: string): void => {
  if (isDtmfDialPadOn.value) {
    selectedSession.value?.sendDtmf(value)
    return
  }

  telephoneNumber.value += value
}

const callFromDialPad = (): void => {
  if (selectedReferType.value === 'consultation' && selectedSession.value) {
    const sessionId = selectedSession.value.sessionId
    const device = selectedSession.value.currentDevice.value ?? undefined
    switchToCall(telephoneNumber.value, device, [`Refer-Call:${sessionId}`])
    stopRefer()
  } else if (selectedReferType.value === 'blind') {
    executeRefer(telephoneNumber.value)
  } else {
    // Используем устройство из текущей сессии или первое устройство из очереди
    const device: SessionMediaDevice | undefined =
      selectedSession.value?.currentDevice.value ?? devicesStore.readyQueueDevices[0]
    switchToCall(telephoneNumber.value, device)
  }
  clearNumber()
}

const initReferCall = (state: 'blind' | 'consultation') => {
  cancelConferenceFromTetATet()
  cancelConferenceDraft()
  startRefer(state)
}

const clearNumberToCall = (): void => {
  clearNumber()
}


const showHideDtmfDialpad = (): void => {
  if (selectedReferType.value) {
    stopRefer()
    clearNumber()
  }

  panelMode.value = isDtmfDialPadOn.value ? null : 'dtmf'
}

const showHideCallDialpad = (): void => {
  if (selectedReferType.value) {
    stopRefer()
    clearNumber()
    return
  }

  showHideDtmfDialpad()
}

const backspace = (): void => {
  if (telephoneNumber.value.length > 0) {
    telephoneNumber.value = telephoneNumber.value.slice(0, -1)
    refreshTimer()
  }
}

watch(selectedReferType, (newVal, oldVal) => {
  if (newVal && !oldVal) { // Если открываем режим перевода, открываем dialpad
    panelMode.value = 'transfer'
    return
  }

  if (!newVal && oldVal) { // если выходим с режима перевода, закрываем dialPad
    if (panelMode.value === 'transfer') {
      panelMode.value = null
    }
  }
})

onBeforeUnmount(() => {
  // Сбрасывается состояние по сборке конференции из тет-а-тет
  cancelConferenceFromTetATet()
  // Сбрасывается состояние по переводу вызова
  stopRefer()
  // Очищаем номер
  clearNumber()
})
</script>

<style scoped>
.number-to-call {
  letter-spacing: 0.4px;
  height: 80px;
}
</style>
