<template>
  <div>
    <div class="relative py-3 px-5 flex flex-col justify-center items-center text-center bg-positive">
      <wui-btn
        icon prepend-icon="clear"
        class="!absolute top-3 right-3 cursor-pointer !bg-positive hover:!bg-positive-tints-600 !text-black-800 !rounded-8"
        @click="unselectContact"
      />
      <wui-icon
        class="!w-16 !h-16 mb-2 text-black-800"
        :name="loading ? 'animatedLoaderWheel' : 'confCall'"
      />
      <p class="mb-1 truncate w-[330px]">{{ conference?.name || "Неизвестная конференция" }}</p>
      <p class="text-1416 text-black-800">Участников: {{ conference?.subscribers?.length ?? 0 }}</p>
      <p class="text-1416 text-black-800">{{ selectedSession?.timer?.duration.value }}</p>
    </div>
    <div class="grid grid-cols-4 p-2 gap-2 border-b border-black-665">
      <icon-button
        title="Отсоединиться"
        icon="callEndDown" large-icon
        class="!w-[80px] !h-[80px]"
        @click="onCallEndClick"
      />
      <icon-button
        title="Управление участниками"
        icon="groups" large-icon class="!w-[80px] !h-[80px]"
        @click="manageSubscribers"
      />
      <icon-button
        title="Поставить на удержание"
        :icon="holdState === 'processed' ? 'animatedLoaderWheel' : 'personHold'"
        large-icon
        class="!w-[80px] !h-[80px]"
        :class="{ 'active': isHold }"
        :disabled="isHoldDisabled"
        @click="toggleHold"
      />
      <icon-button
        :title="conference?.isRecording ? 'Выключить запись конференции' : 'Включить запись конференции'"
        :icon="conference?.isRecording ? 'fiberManualRecord' : 'fiberManualRecordOutlined'"
        :loading="loadingRecord"
        large-icon
        class="!w-[80px] !h-[80px]"
        @click="toggleRecord"
      />
      <mute-all v-if="conferencePServed" :p-served="conferencePServed">
        <template #default="{ mute, loading }">
          <icon-button
            title="Выключить микрофон для всех"
            icon="micOff"
            :loading="loading"
            large-icon
            class="!w-[80px] !h-[80px]"
            @click="mute"
          />
        </template>
      </mute-all>
      <icon-button
        title="Поставить на удержание конференцию"
        :icon="conferenceHoldLoading ? 'animatedLoaderWheel' : 'pauseConference'"
        large-icon
        class="!w-[80px] !h-[80px]"
        :class="{ 'active': isPauseConference }"
        :disabled="conferenceHoldLoading"
        @click="toggleConferenceHold"
      />
      <icon-button
        title="Переход к конференции"
        :icon="route.name === 'Contacts' ? 'arrowDouble' : 'closeFullscreen'" large-icon
        class="!w-[80px] !h-[80px]"
        @click="toggleExpandConference"
      />
      <remove-conference v-if="conferencePServed" :p-served="conferencePServed">
        <template #default="{ remove, loading: removeLoading }">
          <icon-button
            title="Удалить конференцию для всех"
            :icon="removeLoading ? 'animatedLoaderWheel' : 'speakerNotesOff'"
            large-icon
            class="!w-[80px] !h-[80px]"
            :disabled="!allowDeleteConference"
            @click="remove"
          />
        </template>
      </remove-conference>
    </div>
    <div v-if="selectedSession" class="flex justify-between items-center border-b border-black-665  p-2 pl-4 text-black-135">
      Подключено участников: {{ activeContacts }}
      <current-session-device v-if="selectedSession" :session="selectedSession" :active="toggleDevicesOpen" @toggle="toggleDevicesOpen = !toggleDevicesOpen" />
    </div>

    <toggle-devices-block v-if="toggleDevicesOpen" :session="selectedSession" />

    <conference-subscribers-list
      :conference="conference"
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
import { storeToRefs } from 'pinia'
import { computed, onUnmounted, watch, ref, Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { useCallManagerState } from '@/widgets/call-manager'

import { ToggleDevicesBlock } from '@/features/media-devices'
import { MuteAll } from '@/features/mute-all'
import { RemoveConference } from '@/features/remove-conference'
import { CurrentSessionDevice } from '@/features/settings'

import { STATE, unselectContact } from '@/entities/call-session'
import {
  useConferenceState,
  useConferenceHandler,
  ConferenceSubscribersList,
  ConferenceDto,
  MemberStatusNumber, useRoomControl,
  useResolvedConference,
  RoomMemberRole,
} from '@/entities/conference'

import { useAppStore, useStatusSubscribe } from '@/shared/composables'
import { useNotification } from '@/shared/notifications'
import { IconButton } from '@/shared/ui'

const { selected, selectedSession } = useCallManagerState()
const { subscribe, unsubscribe } = useStatusSubscribe()
const { conferenceContactStatuses } = useConferenceState()
const route = useRoute()
const router = useRouter()
const { roomBeginRecord, roomEndRecord } = useRoomControl()
const { showNotification } = useNotification()

const conference = useResolvedConference(computed(() => selected.value as ConferenceDto | undefined))

const {
  subscribers,
  pServedUser,
  holdState,
  isHoldDisabled,
  conferenceHoldLoading,
  onDelete,
  goToConference,
  toggleHold,
  toggleConferenceHold,
  toggleMute,
  onKick,
  onCall,
  manageSubscribers,
  loading,
} = useConferenceHandler(conference as Ref<ConferenceDto>, selectedSession)

const conferencePServed = computed(() => conference.value?.pServed ?? '')
const { currentUser } = storeToRefs(useAppStore())

const allowDeleteConference = computed(() => {
  if (!conference.value || !selectedSession.value) {
    return false
  }

  const state = selectedSession.value.sessionState.value
  const isActiveSession = state === STATE.CONNECTED || state === STATE.ONHOLD || state === STATE.PROGRESS

  if (!isActiveSession) {
    return false
  }

  if (conference.value.selectorMode === ConferenceType.FREE_FOR_ALL) {
    return true
  }

  const selfUser = conference.value.subscribers.find(item => item.phoneNumber === currentUser.value?.internalNumber)
  if (!selfUser) {
    console.debug('Не удалось найти себя в списке участников конференции')
    return false
  }

  return selfUser.role === RoomMemberRole.Moderator
})

const toggleDevicesOpen = ref(false)

const activeContacts = computed(() => {
  if (!conferencePServed.value) return 0
  const currentConfMembers = conferenceContactStatuses.value.get(conferencePServed.value)
  if(!currentConfMembers) return 0
  return Array.from(currentConfMembers?.values()).reduce((acc, current) => {
    return (current.state as number === MemberStatusNumber.Active) ? acc + 1 : acc
  }, 0)
})

const isHold = computed(() => {
  console.debug('holdState, isConfOnHold, sessionState', holdState.value, selectedSession.value?.isConfOnHold.value, selectedSession.value?.sessionState.value === STATE.ONHOLD)
  return selectedSession.value?.sessionState.value === STATE.ONHOLD
})

const isPauseConference = computed(() => !!conference.value?.isPause)

const onCallEndClick = () => {
  selectedSession.value?.terminate()
  if(route.name !== 'Contacts') {
    // если открыта страница с просмотром участников конфы - возврат на карточки
    router.push({ name: 'Contacts' })
  }
}

const toggleExpandConference = () => {
  if(route.name === 'Contacts') {
    goToConference()
  } else {
    router.push({ name: 'Contacts' })
  }
}

const loadingRecord = ref(false)
const toggleRecord = async () => {
  if (loadingRecord.value) return

  try {
    loadingRecord.value = true
    if (!conferencePServed.value || !conference.value) {
      return
    }
    if (conference.value.isRecording) {
      await roomEndRecord(conferencePServed.value)
    } else {
      await roomBeginRecord(conferencePServed.value)
    }
  } catch (e) {
    console.error(e)
  } finally {
    loadingRecord.value = false
  }
}

watch(conference, (next, prev) => {
  const conferencePServed = next?.pServed
  if (!conferencePServed || conferencePServed === prev?.pServed) return

  subscribe(pServedUser.value)
})

watch(() => conference.value?.isRecording, (value) => {
  if (!conference.value || value === undefined) {
    return
  }
  if (value) {
    showNotification({
      type: 'success',
      message: `Идет запись конференции: ${conference.value.name}`,
    })
  } else {
    showNotification({
      type: 'success',
      message: `Отключена запись конференции: ${conference.value.name}`,
    })
  }
})

onUnmounted(() => {
  const conferencePServed = conference.value?.pServed
  if (!conferencePServed) return

  unsubscribe(pServedUser.value)
})
</script>
