<template>
  <div class="flex items-center overflow-hidden rounded-20 border border-handset-layout-brd-def bg-handset-layout-bg-def p-1">
    <footer-handset-button
      v-for="handset in footerHandsets"
      :id="handset.id"
      :key="handset.id"
      :icon="handset.icon"
      :title="handset.title"
      :tone="handset.tone"
      :status-text="handset.statusText"
      :selected="selectedHandsetId === handset.id"
      :disabled="handset.disabled"
      @click="onHandsetClick(handset)"
    />
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import {
  CALL_CARD_HANDSET_IDS,
  useCallCardStore,
  type CallCardFooterHandsetView,
} from '@/features/call-card'

import FooterHandsetButton from './FooterHandsetButton.vue'

type FooterHandset = CallCardFooterHandsetView

const callCardStore = useCallCardStore()
const {
  footerHandsetViewByHandsetId,
  handsetSlots,
  isOpen,
  selectedHandsetId,
} = storeToRefs(callCardStore)

const footerHandsets = computed<FooterHandset[]>(() =>
  handsetSlots.value.map(slot => footerHandsetViewByHandsetId.value[slot.id]),
)

function onHandsetClick (handset: FooterHandset) {
  if (handset.disabled) return
  if (selectedHandsetId.value === handset.id && isOpen.value) return

  if (handset.id === CALL_CARD_HANDSET_IDS.left) {
    callCardStore.openHandset(CALL_CARD_HANDSET_IDS.left)
    return
  }
  callCardStore.openHandset(CALL_CARD_HANDSET_IDS.right)
}
</script>
