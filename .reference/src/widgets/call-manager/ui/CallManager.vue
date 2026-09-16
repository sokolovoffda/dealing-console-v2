<template>
  <div
    class="border border-black-600 bg-black-800 w-[362px] rounded-8 overflow-hidden"
    style="transition: height 1.15s;"
  >
    <transition name="fade" mode="out-in">
      <component
        :is="callManagerComponent"
        v-chain-tooltip="tooltips.callManager"
      />
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { vChainTooltip } from '@wui/common-library'
import { computed, defineAsyncComponent } from 'vue'

import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { tooltips } from '@/entities/tooltips'

import InitialCard from './cards/InitialCard.vue'

const { callManagerState } = useCallManagerState()

const callManagerComponent = computed(() => {
  switch (callManagerState.value) {
  case CallManagerState.CONTACT_CALL: 
    return defineAsyncComponent(() => import('./cards/ContactCallCard.vue'))
  case CallManagerState.CONFERENCE_CREATE: 
    return defineAsyncComponent(() => import('./cards/ConferenceCreateCard.vue'))
  case CallManagerState.CONFERENCE_CALL: 
    return defineAsyncComponent(() => import('./cards/ConferenceCallCard.vue'))
  case CallManagerState.INCOMING_CALL: 
    return defineAsyncComponent(() => import('./cards/IncomingCallCard.vue'))
  case CallManagerState.CONFERENCE_VIEW: 
    return defineAsyncComponent(() => import('./cards/ConferenceViewCard.vue'))
  case CallManagerState.CONTACT_VIEW: 
    return defineAsyncComponent(() => import('./cards/ContactViewCard.vue'))
  case CallManagerState.CONTACT_INTERCEPTION: 
    return defineAsyncComponent(() => import('./cards/ContactInterceptionCard.vue'))
  case CallManagerState.INITIAL:
  default: 
    return InitialCard
  }
})
</script>
<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>