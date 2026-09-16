<template>
  <div
    v-touch.long="tilePttHandlers"
    class="py-2 px-4 cursor-pointer bg-black-135 h-20 rounded-8 flex gap-x-4 items-center select-none"
    :class="{
      'pulse-green': isRinging,
      'pulse-orange': isOnHold,
      'is-selected': active,
    }"
    :style="customizeStyle"
    @click="onClick"
  >
    <wui-icon :name="callStateIconStyle.icon" class="!w-[40px] !h-[40px]" :class="callStateIconStyle.color" />
    <div class="flex-grow">
      <div class="flex items-center justify-between">
        <p class="text-1624 truncate max-w-[220px] font-[600]">{{ itemTitle }}</p>
        <div class="flex items-center gap-x-2 shrink-0">
          <span
            v-if="sessionIndex"
            class="text-1214 leading-none px-1 py-0.5 rounded-4 bg-black-300 text-black-800"
          >
            {{ sessionIndex }}
          </span>
          <div v-if="!isRinging" class="relative">
            <wui-icon v-if="session.currentDevice.value" :name="session.currentDevice.value.icon" />
            <span class="absolute -top-[4px] -right-[6px] text-1416">{{ session.currentDevice.value?.iconNumber }}</span>
          </div>
        </div>
      </div>
      <p class="text-1416 py-1">{{ itemSubTitle }}</p>
      <div class="flex justify-between font-light">
        <p class="text-1416">{{ session.timer?.duration.value }}</p>
        <p class="text-1416">{{ currentTime }} {{ currentDate }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { RTCSessionFacade, STATE } from '@/entities/call-session'
import { useConferenceState, useConferencePushToTalk, useConferenceTileOperatorPtt } from '@/entities/conference'
import { useContactCachedStore } from '@/entities/contact'
import { useCustomizeStore } from '@/entities/main-settings'

import { vTouch } from '@/shared/directives'
import { pServedIsNotGroup } from '@/shared/services'

const props = defineProps<{
  session: RTCSessionFacade,
  active: boolean
  sessionIndex?: number | null
}>()

const emit = defineEmits<{
  (event: 'select'): void
}>()

const TIME_FORMAT = 'HH:mm'
const DATE_FORMAT = 'DD.MM.YY'

const currentTime = dayjs().format(TIME_FORMAT)
const currentDate = dayjs().format(DATE_FORMAT)
const sessionIndex = computed(() => props.sessionIndex ?? null)

const isRinging = computed(() => props.session.sessionState.value === STATE.RINGING || props.session.sessionState.value === STATE.PROGRESS)
const isIncoming = computed(() => props.session.direction === 'incoming')
const isOnHold = computed(() => props.session.sessionState.value === STATE.ONHOLD)

const { getCustomizeByPServed } = useCustomizeStore()
const { contacts } = storeToRefs(useContactCachedStore())
const { getConfByPServed } =  useConferenceState()
const customize = getCustomizeByPServed(props.session.pServed)

const contact = computed(() => {
  const { pServed } = props.session
  return contacts.value.get(pServed)
})

const conference = computed(() => {
  const { pServed } = props.session
  return getConfByPServed(pServed)
})

const { isPushToTalkEnabled } = useConferencePushToTalk()

const isTilePttAvailable = computed(() => {
  if (!conference.value || !isPushToTalkEnabled('queueTile')) {
    return false
  }

  const state = props.session.sessionState.value
  return state === STATE.CONNECTED || state === STATE.ONHOLD
})

const { touchHandlers: tilePttHandlers, shouldSuppressClick } = useConferenceTileOperatorPtt({
  confPServed: () => props.session.pServed,
  session: () => props.session,
  isAvailable: () => isTilePttAvailable.value,
})

const onClick = () => {
  if (shouldSuppressClick()) {
    return
  }

  emit('select')
}

const itemTitle = computed(() => {
  if (pServedIsNotGroup(props.session.pServed)) {
    if (contact.value) {
      return contact.value.name
    }
  }
  if (conference.value) {
    return conference.value.name
  }
  return props.session.number
})

const itemSubTitle = computed(() => {
  if (pServedIsNotGroup(props.session.pServed)) {
    if (contact.value) {
      return contact.value.internalNumber ?? contact.value.mobilePhone
    }
  }
  if (conference.value) {
    return `Участников: ${conference.value.subscribers.length}`
  }
  return props.session.number ?? 'Номер не определен'
})

const customizeStyle = computed(() => {
  // красим БГ если входящий на этапе дозвона и в персонализации ему задан цвет
  return isRinging.value && isIncoming.value && customize?.color ? `background: ${customize?.color} !important` : ''
})

const callStateIconStyle = computed<{ icon: 'callPaused' | 'callIncoming' | 'callOutgoing', color: string }>(() => {
  if (isOnHold.value) {
    return { icon: 'callPaused', color: 'text-spanish-orange' }
  } else if (isIncoming.value) {
    return { icon: 'callIncoming', color: 'text-positive-shades-800' }
  } else {
    return { icon: 'callOutgoing', color: 'text-accent' }
  }
})
</script>
