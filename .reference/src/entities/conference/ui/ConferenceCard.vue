<template>
  <section
    v-touch.long="tilePttHandlers"
    class="flex gap-2 px-2 py-3 cursor-pointer select-none relative rounded-8"
    :class="[
      cardClasses,
      { 'bg-black-865': isActiveConfCollecting },
      { 'is-selected': isCardSelected }
    ]"
    @click="onClick"
  >
    <div>
      <wui-icon :name="iconStyles.name" :class="iconStyles.class" />
    </div>
    <div class="max-w-[140px]">
      <div class="flex items-center gap-2">
        <p class="card-title">{{ conference.name || 'Без названия' }}</p>
        <span
          v-if="showPinnedSlotIndex && pinnedCall"
          class="text-1214 leading-none px-1 py-0.5 rounded-4 bg-black-600 text-white shrink-0"
        >
          {{ pinnedCall.slotIndex }}
        </span>
      </div>
      <p class="card-info">Участников: {{ subscribersCount }}</p>
    </div>
    <div v-if="groupContactsStore.isEditMode && readyToRemoveFromGroup" class="ready-to-remove-from-group">
      <wui-icon name="remove" large />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { IconName, WuiIcon } from '@wui/common-library'
import { computed, ref, Ref } from 'vue'

import { useCallManagerState } from '@/widgets/call-manager'

import { type PinnedCall, STATE, selectConference, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { useConferenceDraft, ConferenceDto, MemberStatusNumber, useConferenceState, useConferencePushToTalk, useConferenceTileOperatorPtt } from '@/entities/conference'
import { useGroupContactsStore } from '@/entities/group-contacts'

import { vTouch } from '@/shared/directives'

const { conferenceContactStatuses } = useConferenceState()
const groupContactsStore = useGroupContactsStore()

const props = defineProps<{
  conference: ConferenceDto,
  groupIdx?: number
  pinnedCall?: PinnedCall | null
  showPinnedSlotIndex?: boolean
}>()

const { isActive: isActiveConfCollecting } = useConferenceDraft()

const selected = <Ref<ConferenceDto>>useCallManagerState().selected
const pinnedCallsStore = usePinnedCallsStore()
const isCardSelected = computed(() => {
  if (props.pinnedCall) {
    return pinnedCallsStore.activePinnedCall?.order === props.pinnedCall.order
  }

  return selected.value?.pServed === props.conference?.pServed
})
const readyToRemoveFromGroup = ref<boolean>(false)

const { getSessionById, getSessionByPServed } = useSessionStore()
const pinnedSession = computed(() => {
  return props.pinnedCall?.sessionId ? getSessionById(props.pinnedCall.sessionId) : undefined
})
const conferenceSession = computed(() => pinnedSession.value ?? getSessionByPServed(props.conference.pServed))
const isConfCalledSelf = computed(() => conferenceSession.value)

type ContactStatus = 'default' | 'in-call' | 'in-call-self'

const contactStatus = computed<ContactStatus>( () => {
  if (props.pinnedCall) {
    if (pinnedSession.value) {
      switch (pinnedSession.value.sessionState.value) {
      case STATE.CONNECTED:
        return 'in-call-self'
      case STATE.ONHOLD:
      case STATE.PROGRESS:
      case STATE.RINGING:
        return 'in-call'
      }
    }

    return 'default'
  }

  if (isConfCalledSelf.value) return 'in-call-self'
  if(activeContacts.value > 0) return 'in-call'
  return 'default'
})

const { isPushToTalkEnabled } = useConferencePushToTalk()

const isTilePttAvailable = computed(() => {
  if (!isPushToTalkEnabled('operator') || contactStatus.value !== 'in-call-self') {
    return false
  }

  const session = conferenceSession.value
  if (!session) {
    return false
  }

  const state = session.sessionState.value
  return state === STATE.CONNECTED || state === STATE.ONHOLD
})

const { touchHandlers: tilePttHandlers, shouldSuppressClick } = useConferenceTileOperatorPtt({
  confPServed: () => props.conference?.pServed,
  session: () => conferenceSession.value,
  isAvailable: () => isTilePttAvailable.value,
})

const cardClasses: Ref<string> = computed(() => {
  switch (contactStatus.value) {
  case 'default': return 'conference-card-state-default'
  case 'in-call': return 'conference-card-state-in-call'
  case 'in-call-self': return 'conference-card-state-in-call-self'
  default: return 'default'
  }
})

interface IconStyle {
  name: IconName
  class: string
}
const iconStyles: Ref<IconStyle> = computed(() => {
  switch (contactStatus.value) {
  case 'default': return { name: 'groups', class: 'text-black-400' }
  case 'in-call': return { name: 'confCall', class: 'text-positive' }
  case 'in-call-self': return { name: 'confCall', class: 'text-black' }
  default: return { name: 'user', class: 'text-black-400' }
  }
})

const activeContacts = computed(() => {
  const currentConfMembers = conferenceContactStatuses.value.get(props.conference?.pServed)
  if(!currentConfMembers) return 0
  return Array.from(currentConfMembers?.values()).reduce((acc, current) => {
    return (current.state as number === MemberStatusNumber.Active) ? acc + 1 : acc
  }, 0)
})

const onClick = () => {
  if (shouldSuppressClick()) {
    return
  }

  if(isActiveConfCollecting.value) return // не менять стейт коллМенеджера при клике на конфу в режиме создания конфы

  // Режим создания групп из завешенных юзеров
  if(groupContactsStore.isEditMode && !readyToRemoveFromGroup.value) {
    readyToRemoveFromGroup.value = true
    return
  }

  if(groupContactsStore.isEditMode && props.groupIdx !== undefined && props.pinnedCall) {
    groupContactsStore.removeContact(props.groupIdx, props.pinnedCall)
    readyToRemoveFromGroup.value = false
    return
  }

  if (props.pinnedCall) {
    pinnedCallsStore.setActivePinnedCall(props.pinnedCall)
    return
  }

  selectConference(props.conference)
}

const subscribersCount = computed(() => props.conference?.subscribers?.length ?? 0)
</script>

<style scoped>
.card-title {
  overflow: hidden;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  color: #fff;
  font-family: var(--font-roboto);
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-info {
  overflow: hidden;
  color: var(--color-black-300);
  font-size: 13px;
  font-weight: 300;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conference-card-state-default {
  border: 1px solid var(--color-black-600);
  background-color: var(--color-black-800);
}
.conference-card-state-in-call {
  border: 1px solid var(--color-positive);
  background-color: var(--color-black-800);
}
.conference-card-state-in-call-self {
  border: 1px solid var(--color-positive-tints-800);
  background-color: var(--color-positive);
  & * { color: #000; }
}

.ready-to-remove-from-group {
  position: absolute;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-8);
  background-color: rgb(51 51 51 / 80%);
  color: #fff;
}
</style>
