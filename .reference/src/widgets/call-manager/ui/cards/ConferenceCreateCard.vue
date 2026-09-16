<template>
  <div>
    <div class="py-5 px-5 flex flex-col justify-center items-center bg-primary-tints-600 relative">
      <wui-icon name="confCall" large class="mb-2 text-primary" />
      <button
        class="w-[52px] h-[52px] m-[8px] bg-primary-tints-900 absolute top-0 right-0 rounded-8"
        @click="onEditNameClick"
      >
        <wui-icon name="edit" large class="text-primary-tints-300" />
      </button>
      <p class="mb-2">{{ conferenceDraft?.name || $t('ConferenceSetup') }}</p>
      <p class="text-1424">{{ subscribersCountTitle }}</p>
    </div>
    <div class="grid grid-cols-4 p-2 gap-2 border-t border-b border-black-600">
      <icon-button icon="phone" large-icon class="!w-[80px] !h-[80px]" :disabled="!isValid || loading || isConferenceActive" @click="saveAndCall" />
      <icon-button icon="clear" large-icon class="!w-[80px] !h-[80px]" :disabled="loading" @click="cancel" />
      <icon-button icon="check" large-icon class="!w-[80px] !h-[80px]" :disabled="!isValid || loading" @click="save" />
      <wui-icon v-if="loading" class="text-white mt-5 ml-5" name="animatedLoaderWheel" large />
    </div>
    <conference-subscribers-list
      :conference="undefined"
      :contacts="conferenceContacts"
      @delete="deleteDraftConferenceSubscriber"
    />
  </div>
</template>

<script lang="ts" setup>
import { useDialog, UserInfo, WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { ComponentOptions, computed, onBeforeMount, ref } from 'vue'

import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { useConferenceDraft, useRoomControl, ConferenceSubscribersList } from '@/entities/conference'
import { useContactStore, Contact } from '@/entities/contact'

import { useAutoAnswer, useDevicesStore } from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'
import { IconButton, KeyboardWithTextModal } from '@/shared/ui'
import countMemberText from '@/shared/utils/count-member-text'

const { roomCall } = useRoomControl()
const { registerAutoAnswer } = useAutoAnswer()
const { init, conferenceDraft, cancelConferenceDraft, persist, deleteDraftConferenceSubscriber, loading, setConfDraftName } = useConferenceDraft()
const { selectedSession, setCallManagerState } = useCallManagerState()
const { getByInternalNumber } = useContactStore()
const { showDialog } = useDialog()
const { t } = useLocalization()

onBeforeMount(() => {
  if (!conferenceDraft.value) {
    init()
  }
})

const onEditNameClick = () => {
  showDialog(KeyboardWithTextModal as ComponentOptions, {
    value: conferenceDraft?.value?.name,
    hasOverlay: false,
    placeholder: t('EnterTheConferenceName'),
  }).then((value: unknown) => {
    const conferenceName = (typeof value === 'string' && !!value.trim()) ? value.trim() : t('Conference')
    setConfDraftName(conferenceName)
  })
}

const callInProgress = ref(false)
const subscriberCount = computed(() => conferenceDraft.value?.subscribers.length)
const isValid = computed(() => Boolean(subscriberCount.value))
const conferenceContacts = computed<Array<Contact | UserInfo>>(() => conferenceDraft.value?.subscribers.reduce((acc, s) => {
  const contact = getByInternalNumber(s.phoneNumber)
  if (contact) {
    acc.push(contact)
  }
  return acc
}, <(Contact | UserInfo)[]>[]) ?? <(Contact | UserInfo)[]>[])
const isConferenceActive = computed(() => conferenceDraft.value && selectedSession.value?.conference?.pServed === conferenceDraft.value?.pServed)

const subscribersCountTitle = computed(() => {
  if (subscriberCount.value === 0) {
    return t('NoParticipantsSelected')
  }
  return countMemberText(subscriberCount.value || 0, {
    forOne: t('Participant'),
    forTwo: t('Participant2'),
    forFive: t('Participants'),
  })
})

const call = (pServedUser: string): void => {
  if (callInProgress.value) {
    return
  }
  callInProgress.value = true
  const deviceStore = useDevicesStore()
  const { readyQueueDevices } = storeToRefs(deviceStore)
  registerAutoAnswer(pServedUser, readyQueueDevices.value[0])
  roomCall(pServedUser).finally(() => {
    callInProgress.value = false
  })
}

const cancel = () => {
  cancelConferenceDraft()
  if (isConferenceActive.value) {
    setCallManagerState(CallManagerState.CONFERENCE_CALL)
  } else {
    setCallManagerState(CallManagerState.INITIAL)
  }
}

const saveAndCall = async () => {
  const { pServed } = await persist()
  call(pServed)
}

const save = async () => {
  const newConf = await persist()
  if (newConf) {
    setCallManagerState(CallManagerState.CONFERENCE_VIEW, newConf)
  }
}
</script>

