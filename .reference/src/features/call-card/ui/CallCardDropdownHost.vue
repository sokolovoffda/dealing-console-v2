<template>
  <wui-dropdown
    v-model="isDropdownOpen"
    direction="top"
    plain
  >
    <template #activator>
      <slot name="activator" />
    </template>

    <call-card-window
      v-if="isOpen"
      class="mb-2 shadow-dropdown"
    />
  </wui-dropdown>
</template>

<script setup lang="ts">
import { WuiDropdown } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useCallCardStore } from '../model/use-call-card-store'

import CallCardWindow from './CallCardWindow.vue'

const callCardStore = useCallCardStore()
const { isOpen } = storeToRefs(callCardStore)

const isDropdownOpen = computed({
  get: () => isOpen.value,
  set: (value: boolean) => {
    if (value) {
      // Уже открыто (в т.ч. pinned-presentation) — не вызывать open():
      // иначе clearPinnedPresentation сбросит сессию в empty/initial.
      if (!isOpen.value) callCardStore.open()
      return
    }

    callCardStore.hide()
  },
})
</script>
