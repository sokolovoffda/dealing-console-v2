<template>
  <div class="grid grid-cols-3 gap-2">
    <my-btn
      v-for="button in dialpadButtons"
      :key="button"
      class="w-[72px]! h-[72px] text-[28px]!"
      :icon="false"
      :size="72"
      variant="neutcon"
      tone="base"
      @click="emit('press', button)"
    >
      {{ button }}
    </my-btn>
  </div>
</template>

<script setup lang="ts">
import MyBtn from '../my-btn/MyBtn.vue'

import type { MyDialpadButton } from './types'

const emit = defineEmits<{
  press: [value: MyDialpadButton]
}>()

const dialpadButtons: MyDialpadButton[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '*',
  '0',
  '#',
]
</script>
