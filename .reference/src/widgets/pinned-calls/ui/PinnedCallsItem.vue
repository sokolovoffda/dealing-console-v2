<template>
  <pinned-calls-item-entity
    :class="{
      'is-selected': isSelected,
      'is-voice-active': isVoiceActive,
      'pulse-orange': isRinging,
    }"
    @click="setActive"
  >
    <template #leftSide>
      <mute-pinned-call 
        :session="session" 
        :pinned-call="pinnedCall" 
      />
    </template>

    <template #center>
      <div
        v-touch.long.stop="tilePttHandlers"
        class="min-w-0 flex flex-col flex-1"
      >
        <div class="text-1424 font-bold flex items-center gap-x-2 mb-2 min-w-0">
          <div class="flex items-center gap-x-2 min-w-0 flex-1">
            <wui-icon 
              v-if="isConferencePinned" 
              small 
              name="confCall" 
              large 
            />
            <p class="truncate">{{ title }}</p>
          </div>
          <span
            v-if="showSlotIndex"
            class="text-1214 leading-none px-1 py-0.5 rounded-4 bg-black-400 text-black-800 shrink-0"
          >
            {{ pinnedCall.slotIndex }}
          </span>
        </div>
        <change-volume-pinned-call 
          :model-value="session" 
          :pinned-call="pinnedCall" 
        />
      </div>
    </template>

    <template #rightSide>
      <button class="text-black-700" :class="statusClass">
        <wui-icon 
          name="phoneCall" 
          class="w-full! px-3" 
        />
      </button>
    </template>
  </pinned-calls-item-entity>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { computed, onUnmounted, ref, watch } from 'vue'

import { MutePinnedCall, ChangeVolumePinnedCall } from '@/features/pinned-calls'
import { useRedirectPeerToPeerToConference } from '@/features/redirect-peer-to-peer-to-conference'

import { PinnedCallsItemEntity, PinnedCall, usePinnedCallsStore, STATE } from '@/entities/call-session'
import { useConferenceState, useConferencePushToTalk, useConferenceTileOperatorPtt } from '@/entities/conference'
import { useContactCachedStore } from '@/entities/contact'

import { pServedIsNotGroup } from '@/shared/services'
import { vTouch } from '@/shared/directives'

const { getLocalByPServed } = useContactCachedStore()
const props = defineProps<{
  pinnedCall: PinnedCall
}>()

const pinnedCallsStore = usePinnedCallsStore()
const { getConfByPServed } = useConferenceState()
const { isRedirecting, redirect } = useRedirectPeerToPeerToConference()

const session = computed(() => pinnedCallsStore.getSessionForPinnedCall(props.pinnedCall))
const isRinging = computed(() => session.value?.sessionState.value === STATE.RINGING)
const title = computed(() => {
  const contact = getLocalByPServed(props.pinnedCall.pServed)
  const conference = getConfByPServed(props.pinnedCall.pServed)

  return session.value?.conference?.name ?? conference?.name ?? contact?.name ?? props.pinnedCall.title
})
const showSlotIndex = computed(() => {
  return pinnedCallsStore.getPinnedCallsByPServed(props.pinnedCall.pServed).length > 1
})

const isConferencePinned = computed(() => {
  return !!session.value?.conference || !pServedIsNotGroup(props.pinnedCall.pServed)
})
const { isPushToTalkEnabled } = useConferencePushToTalk()

const isTilePttAvailable = computed(() => {
  if (!isConferencePinned.value || !session.value || !isPushToTalkEnabled('pinnedTile')) {
    return false
  }

  const state = session.value.sessionState.value
  return state === STATE.CONNECTED || state === STATE.ONHOLD
})

const { touchHandlers: tilePttHandlers, shouldSuppressClick } = useConferenceTileOperatorPtt({
  confPServed: () => props.pinnedCall.pServed,
  session: () => session.value,
  isAvailable: () => isTilePttAvailable.value,
})

const statusClass = computed(() => {
  if(!session.value) return
  return {
    'bg-positive': session.value.sessionState.value === STATE.CONNECTED,
    'pulse-green': session.value.sessionState.value === STATE.PROGRESS,
    'pulse-orange': session.value.sessionState.value === STATE.ONHOLD,
  }
})

const isVoiceActive = ref(false)
let voiceTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => session.value?.remoteVoiceDetected.value, (detected) => {
  if (voiceTimeout) clearTimeout(voiceTimeout)
  
  if (detected) {
    isVoiceActive.value = true
  } else {
    voiceTimeout = setTimeout(() => {
      isVoiceActive.value = false
    }, 3000) // 3 секунды задержки
  }
}, { immediate: true })

onUnmounted(() => {
  if (voiceTimeout) clearTimeout(voiceTimeout)
})

const isSelected = computed(() => {
  if (isRedirecting.value) return true
  if(!pinnedCallsStore.activePinnedCall?.order) return
  return pinnedCallsStore.activePinnedCall.order === props.pinnedCall.order
})

const setActive = () => {
  if (shouldSuppressClick()) {
    return
  }

  // Если включен режим "Добавление входящего звонка в завешенную конференцию" и этот pinned item конференция
  if (isRedirecting.value && getConfByPServed(props.pinnedCall.pServed)) {
    redirect(props.pinnedCall.pServed)
    return
  }

  pinnedCallsStore.setActivePinnedCall(props.pinnedCall)
}
</script>

<style scoped>
.is-voice-active {
  box-shadow: 0 0 0 3px #f97316 !important;
}
</style>
