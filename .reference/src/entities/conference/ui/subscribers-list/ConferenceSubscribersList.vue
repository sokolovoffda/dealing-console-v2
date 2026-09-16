<template>
  <div class="relative pt-1 conference-create-list">
    <div :class="{ 'conference-create-list-contacts_shorten': !!selected }" class="pr-1 m-1 overflow-auto min-h-[400px] max-h-[400px] flex flex-col gap-1">
      <conference-subscriber-item
        v-for="contact in contacts" :key="contact.internalNumber"
        :class="{ 'bg-white': contact.id === selected?.id }"
        :icon="'status' in contact && contact.status === 'Dialing' ? 'phone' : undefined"
        :title="contact.name"
        :subtitle="contact.internalNumber"
        :conf-p-served="conference?.pServed"
        :number="contact.internalNumber"
        class="cursor-pointer rounded-4"
        @click="setSelected(contact.internalNumber)"
        @ptt-start="onPttStart(contact)"
        @ptt-end="onPttEnd(contact)"
      >
        <template #append>
          <conference-subscriber-status-icon :status="'status' in contact ? contact.status : MemberStatus.Inactive" />
        </template>
      </conference-subscriber-item>
    </div>
    <div v-if="selected" class="bg-black-800">
      <conference-subscriber-item
        :subtitle="isCurrentUser ? 'Это Вы' : selected.organization" :title="selected.name"
        class="border-0 border-b border-t border-black-600"
        dark
      />
      <div class="flex gap-2 p-2">
        <icon-button title="Подключить / Отключить" :disabled="disabledToggleCall" :icon="isActiveIcon" @click="toggleCall" />
        <icon-button title="Замьютить" :disabled="disabledMute" :icon="isMutedIcon" @click="toggleMute" />
        <icon-button title="Удалить участника" :disabled="isCurrentUser" icon="personNo" @click="onRemove" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { UserInfo } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import { STATE, useSessionStore } from '@/entities/call-session'
import {
  ConferenceContact,
  MemberStatus,
  useConferenceSubscriberStatusState,
  ConferenceDto,
  useConferencePushToTalk,
} from '@/entities/conference'
import { Contact } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'
import { IconButton } from '@/shared/ui'

import ConferenceSubscriberItem from './ConferenceSubscriberItem.vue'
import ConferenceSubscriberStatusIcon from './ConferenceSubscriberStatusIcon.vue'

const { currentUser } = storeToRefs(useAppStore())
const { getSessionByPServed } = useSessionStore()
const { getMemberStatus, getMemberMediaStatus } = useConferenceSubscriberStatusState()
const {
  pressParticipantPtt,
  releaseParticipantPtt,
  pressOperatorPtt,
  releaseOperatorPtt,
  isPushToTalkEnabled,
} = useConferencePushToTalk()

const props = defineProps<{
  conference?: ConferenceDto
  contacts: Array<ConferenceContact | Contact | UserInfo>
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: Array<ConferenceContact>): void
  (event: 'delete' | 'kick' | 'call' | 'toggleMute', value: never): void // TODO: value is interface ContactDTO or ConferenceContact
}> ()

const selectedNumber = ref()
const selected = computed<ConferenceContact | Contact | UserInfo | undefined>(() => selectedNumber.value && props.contacts.find(({ internalNumber }) => internalNumber === selectedNumber.value))
const selectedMediaStatus = computed(() => selected.value && props.conference && getMemberMediaStatus(props.conference.pServed, selected.value?.internalNumber))

const setSelected = (internalNumber?: string) => {
  if (!internalNumber || selected.value?.internalNumber === internalNumber) {
    selectedNumber.value = undefined
  } else {
    selectedNumber.value = internalNumber
  }
}

const disabledToggleCall = computed(() => {
  return !selectedStatus.value || isCurrentUser.value || [MemberStatus.OnHold, MemberStatus.Dialing].includes(selectedStatus.value) // selected.value?.status
})

const disabledMute = computed(() => {
  return !selectedStatus.value || selectedStatus.value !== MemberStatus.Active
})

const isCurrentUser = computed(() => {
  return selectedNumber.value === currentUser.value?.internalNumber
})

// Для себя — SIP isMuted (IM streams после обычного старта часто дают ложный mute)
const conferenceSession = computed(() => {
  return props.conference?.pServed ? getSessionByPServed(props.conference.pServed) : undefined
})

const hasActiveConferenceSession = computed(() => {
  const state = conferenceSession.value?.sessionState.value

  return state === STATE.CONNECTED || state === STATE.ONHOLD
})

const selectedStatus = computed(() => {
  if (!selected.value || !props.conference) {
    return undefined
  }

  const status = getMemberStatus(props.conference.pServed, selected.value.internalNumber)

  // После входящего восстановления SIP уже активен, а IM GroupStatus может приехать позже.
  if (isCurrentUser.value && status !== MemberStatus.Active && hasActiveConferenceSession.value) {
    return MemberStatus.Active
  }

  return status
})

const isMuted = computed(() => {
  if (isCurrentUser.value) {
    const imMuted = selectedMediaStatus.value?.mutedMyAudio
    // IM (MCU) — источник истины для UI; SIP только fallback, иначе OR залипает
    if (typeof imMuted === 'boolean') {
      return imMuted
    }
    return !!conferenceSession.value?.isMuted.value
  }
  return !!selectedMediaStatus.value?.mutedMyAudio
})

const isMutedIcon = computed(() => {
  return isMuted.value ? 'micOff' : 'mic'
})

const isActiveIcon = computed(() => {
  return isActive.value ? 'callCanceled' : 'phone'
})

const isActive = computed(() => {
  return selectedStatus.value === MemberStatus.Active
})

const isPttAvailable = (contact: ConferenceContact | Contact | UserInfo) => {
  if (!props.conference?.pServed) {
    return false
  }

  const scope = isSelfContact(contact) ? 'operator' : 'participant'
  if (!isPushToTalkEnabled(scope)) {
    return false
  }

  if (isSelfContact(contact) && hasActiveConferenceSession.value) {
    return true
  }

  return getMemberStatus(props.conference.pServed, contact.internalNumber) === MemberStatus.Active
}

const isSelfContact = (contact: ConferenceContact | Contact | UserInfo) => {
  return contact.internalNumber === currentUser.value?.internalNumber
}

const getParticipantMuted = (contact: ConferenceContact | Contact | UserInfo) => {
  if (!props.conference?.pServed) return false
  if (isSelfContact(contact)) {
    const imMuted = getMemberMediaStatus(props.conference.pServed, contact.internalNumber)?.mutedMyAudio
    if (typeof imMuted === 'boolean') {
      return imMuted
    }
    return !!conferenceSession.value?.isMuted.value
  }
  return !!getMemberMediaStatus(props.conference.pServed, contact.internalNumber)?.mutedMyAudio
}

const getImMuted = (contact: ConferenceContact | Contact | UserInfo) => {
  if (!props.conference?.pServed) return false
  return !!getMemberMediaStatus(props.conference.pServed, contact.internalNumber)?.mutedMyAudio
}

const onPttStart = async (contact: ConferenceContact | Contact | UserInfo) => {
  if (!props.conference?.pServed || !isPttAvailable(contact)) return

  try {
    if (isSelfContact(contact)) {
      await pressOperatorPtt({
        session: conferenceSession.value,
        confPServed: props.conference.pServed,
        phoneNumber: contact.internalNumber,
        isImMuted: getImMuted(contact),
      })
      return
    }
    await pressParticipantPtt({
      confPServed: props.conference.pServed,
      phoneNumber: contact.internalNumber,
      isAudioMuted: getParticipantMuted(contact),
    })
  } catch (e) {
    console.error(e)
  }
}

const onPttEnd = async (contact: ConferenceContact | Contact | UserInfo) => {
  if (!props.conference?.pServed) return

  try {
    if (isSelfContact(contact)) {
      await releaseOperatorPtt({
        session: conferenceSession.value,
        confPServed: props.conference.pServed,
        phoneNumber: contact.internalNumber,
      })
      return
    }
    await releaseParticipantPtt({
      confPServed: props.conference.pServed,
      phoneNumber: contact.internalNumber,
      isAudioMuted: getParticipantMuted(contact),
    })
  } catch (e) {
    console.error(e)
  }
}

const toggleMute = () => {
  if (selected.value) emit('toggleMute', [selected.value, !isMuted.value] as never)
}

const toggleCall = () => {
  if (disabledToggleCall.value || !selected.value) {
    return
  }
  if (isActive.value) {
    emit('kick', selected.value as never)
  } else {
    emit('call', selected.value as never)
  }
}

const onRemove = () => {
  if (selected.value) emit('delete', selected.value as never)
  setSelected(undefined)
}
</script>

<style scoped>
.conference-create-list {
  max-height: 608px;
}

.conference-create-list-contacts_shorten {
  min-height: calc(400px - 182px);
  max-height: calc(400px - 182px);
}
</style>
