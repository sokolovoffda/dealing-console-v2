<template>
  <div>
    <div class="relative py-3 px-5 flex flex-col justify-center items-center text-center bg-primary-tints-600">
      <wui-btn
        icon prepend-icon="clear"
        class="!absolute top-3 right-3 cursor-pointer !bg-primary-tints-600 hover:!bg-primary-tints-900 !text-black-800 !rounded-8"
        @click="unselectContact"
      />
      <wui-icon
        class="!w-16 !h-16 mb-2 text-black-800"
        :name="loading ? 'animatedLoaderWheel' : 'confCall'"
      />
      <p class="mb-1 truncate w-[330px]">{{ selected?.name || $t('UnknownConference') }}</p>
      <p class="text-1416 text-black-800">
        {{ $t('Participants') }}: {{ selected?.subscribers?.length ?? 0 }}
      </p>
    </div>
    <div class="grid grid-cols-4 p-2 gap-2 border-b border-black-665">
      <template v-if="isPinned">
        <call-on-device-btn
          v-for="device in gooseDevices"
          :key="device.id"
          :device="device"
          title="Вступить в конференцию"
          :disabled="callInProgress"
          @click="call(device)"
        />
      </template>
      <call-on-device-btn
        v-for="device in readyQueueDevices"
        :key="device.id"
        :device="device"
        title="Вступить в конференцию"
        :disabled="callInProgress"
        @click="call(device)"
      />
      <start-conference-with-muted-participants v-if="selectedConferencePServed" :p-served="selectedConferencePServed">
        <template #default="{ callWithMutedParticipants, loading }">
          <icon-button
            :icon="loading ? 'animatedLoaderWheel' : 'moderatedConference'"
            class="!w-[80px] !h-[80px]"
            title="Начать конференцию с выключенными микрофонами"
            large-icon
            @click="callWithMutedParticipants"
          />
        </template>
      </start-conference-with-muted-participants>
      <icon-button
        title="Управление участниками"
        icon="groups" large-icon class="!w-[80px] !h-[80px]"
        @click="manageSubscribers"
      />
      <leave-conference v-if="selectedConferencePServed" :p-served="selectedConferencePServed">
        <template #default="{ leave, loading }">
          <icon-button
            :icon="loading ? 'animatedLoaderWheel' : 'exitToApp'"
            class="!w-[80px] !h-[80px]"
            title="Выйти из конференции"
            large-icon
            @click="leave"
          />
        </template>
      </leave-conference>
      <remove-conference v-if="selectedConferencePServed" :p-served="selectedConferencePServed">
        <template #default="{ remove, loading }">
          <icon-button
            title="Удалить конференцию для всех"
            :icon="loading ? 'animatedLoaderWheel' : 'speakerNotesOff'" large-icon
            class="!w-[80px] !h-[80px]"
            :disabled="!allowDeleteConference"
            @click="remove"
          />
        </template>
      </remove-conference>
    </div>
    <conference-subscribers-list
      :conference="selected"
      :contacts="subscribers"
      @delete="onDelete"
      @toggle-mute="toggleMute"
      @kick="onKick"
      @call="onCall"
    />
  </div>
</template>

<script lang="ts" setup>
import { WuiBtn, WuiIcon } from '@wui/common-library'
import { ConferenceType } from '@wui/im'
import { MediaConstraints } from '@wui/jssip/lib/RTCSession'
import { storeToRefs } from 'pinia'
import { onUnmounted, watch, ref, computed, Ref } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { LeaveConference } from '@/features/leave-conference'
import { CallOnDeviceBtn } from '@/features/media-devices'
import { RemoveConference } from '@/features/remove-conference'
import { StartConferenceWithMutedParticipants } from '@/features/start-conference-with-muted-participants'

import { STATE, unselectContact, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import {
  useConferenceDraft,
  useRoomControl,
  useConferenceHandler,
  ConferenceSubscribersList,
  ConferenceDto,
  RoomMemberRole,
  useResolvedConference,
} from '@/entities/conference'

import {
  useStatusSubscribe,
  useAutoAnswer,
  type LogicalMediaDevice,
  useDevicesStore,
  useAppStore } from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'
import { IconButton } from '@/shared/ui'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

const { isActive: isActiveConfCollecting } = useConferenceDraft()

const { selected: selectedState, selectedSession, setCallManagerState } = useCallManagerState()
const selectedSource = selectedState as Ref<ConferenceDto>
const selected = useResolvedConference(selectedSource)
const { roomCall } = useRoomControl()
const { registerAutoAnswer } = useAutoAnswer()
const { subscribe, unsubscribe } = useStatusSubscribe()
const { sessions } = useSessionStore()
const { switchToCall } = useWebRTC()
const pinnedCallsStore = usePinnedCallsStore()
const devicesStore = useDevicesStore()
const readyQueueDevices = computed(() => devicesStore.readyQueueDevices)

const {
  subscribers,
  pServedUser,
  onDelete,
  toggleMute,
  onKick,
  onCall,
  manageSubscribers,
  loading,
} = useConferenceHandler(selected as Ref<ConferenceDto>, computed(() => undefined))

const selectedConferencePServed = computed(() => selected.value?.pServed ?? '')
const isPinned = computed(() => {
  return !!selectedConferencePServed.value && pinnedCallsStore.isPServedSession(selectedConferencePServed.value)
})
const gooseDevices = computed(() => {
  const device = devicesStore.readyPreferredGoose

  return isPinned.value && device?.type === 'goose' ? [device] : []
})

const callInProgress = ref(false)
const { currentUser } = storeToRefs(useAppStore())

const hasActiveConferenceSession = computed(() => {
  if (!selectedConferencePServed.value) {
    return false
  }

  return Array.from(sessions.value?.values() ?? []).some(({ conference, pServed, sessionState }) => {
    const isSameConference = conference?.pServed === selectedConferencePServed.value || pServed === selectedConferencePServed.value

    if (!isSameConference) {
      return false
    }

    const state = sessionState.value
    return state === STATE.CONNECTED || state === STATE.ONHOLD || state === STATE.PROGRESS || state === STATE.RINGING
  })
})

const allowDeleteConference = computed(() => {
  if (!selected.value || !hasActiveConferenceSession.value) return false
  if(selected.value.selectorMode === ConferenceType.FREE_FOR_ALL) return true
  const selfUser = selected.value.subscribers.find(item => item.phoneNumber === currentUser.value?.internalNumber)
  if(!selfUser) {
    console.debug('Не удалось найти себя в списке участников конференции')
    return false
  }
  return selfUser.role === RoomMemberRole.Moderator
})

const call = (device: LogicalMediaDevice): void => {
  if (callInProgress.value || isActiveConfCollecting.value || !selected.value) return
  const conferencePServed = selected.value.pServed

  const targetSession = selectedSession.value?.pServed === conferencePServed
    ? selectedSession.value
    : Array.from(sessions.value.values()).find(({ conference, pServed }) => {
      if (conference?.pServed === conferencePServed) {
        return true
      }

      return pServed === conferencePServed
    })
  // если конфа уже запущена и на холде
  if (targetSession) {
    if (targetSession.direction === 'incoming' && targetSession.sessionState.value === STATE.RINGING) {
      const mediaConstraints = {
        audio: {
          deviceId: normalizeAudioDeviceIdConstraint(device.inputId),
          echoCancellation: device.echoCancellation ?? true,
          noiseSuppression: device.noiseSuppression ?? true,
          autoGainControl: device.autoGainControl ?? true,
        },
        video: false,
      } as never as MediaConstraints

      targetSession.answer({ mediaConstraints }, device)
    } else {
      // присоединяемся к уже существующей сессии
      switchToCall(targetSession.number, device, undefined, targetSession.sessionId)
    }

    setCallManagerState(CallManagerState.CONFERENCE_CALL, selected.value, {
      sessionId: targetSession.sessionId,
      callId: targetSession.callId.value,
    })
  } else {
    // или запускаем новую конфу
    callInProgress.value = true
    registerAutoAnswer(selectedConferencePServed.value, device)
    roomCall(selectedConferencePServed.value).finally(() => {
      callInProgress.value = false
    })
  }
}

onUnmounted(() => {
  if (selectedConferencePServed.value) {
    unsubscribe(selectedConferencePServed.value)
  }
})

watch(selected, (next, prev) => {
  const conferencePServed = next?.pServed
  if (!conferencePServed || conferencePServed === prev?.pServed) return
  if (pServedUser.value) {
    subscribe(pServedUser.value)
  }
})
</script>
