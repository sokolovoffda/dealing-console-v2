<template>
  <wui-btn
    variant="neut"
    state="text"
    class="flex-1 h-12! min-w-[60px]! max-w-[230px]! rounded-12! text-xl! leading-[22px]! font-normal! truncate"
    :class="buttonClass"
    @click="emit('click', $event)"
  >
    <div class="truncate">{{ tab.name }}</div>
  </wui-btn>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'
import { computed } from 'vue'

import type { ContactTab } from '@/entities/settings'

const props = defineProps<{
  tab: ContactTab
  displayIndex: number
  isActive: boolean
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClass = computed(() => {
  return props.isActive
    ? 'text-tab-neutcon-txt-active-def! bg-tab-neutcon-bg-active-def! border border-tab-neutcon-icon-active-def'
    : 'text-tab-neutcon-txt-inactive-def! bg-tab-neutcon-bg-inactive-def!'
})
</script>
