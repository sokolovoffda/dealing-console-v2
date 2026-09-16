<template>
  <div class="text-1416 max-w-40">
    <input type="range" min="0" max="1" step="0.01" :value="pinnedCall.volume" class="w-full" @change="setVolume($event)">
  </div>
</template>

<script setup lang="ts">
import { usePinnedCallsStore, PinnedCall } from '@/entities/call-session'

const pinnedCallsStore = usePinnedCallsStore()

const props = defineProps<{
  pinnedCall: PinnedCall
}>()

const setVolume = (e: Event) => {
  pinnedCallsStore.changeVolume(props.pinnedCall.pServed, +(e.target as HTMLInputElement).value)
}
</script>
