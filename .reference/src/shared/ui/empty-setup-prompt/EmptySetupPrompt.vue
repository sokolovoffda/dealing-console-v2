<template>
  <wui-btn
    v-if="interactive"
    class="h-full! w-full!"
    state="alpha"
    variant="neut"
    :data-test="dataTest"
    @click="emit('click', $event)"
  >
    <div class="flex flex-col items-center gap-4 text-desk-def-txt-def">
      <wui-icon
        :name="icon"
        class="h-30! w-30! text-desk-def-icon-def"
      />
      <span class="text-xl font-normal">{{ label }}</span>
    </div>
  </wui-btn>

  <div
    v-else
    class="pointer-events-none flex h-full w-full select-none flex-col items-center justify-center gap-4 text-desk-def-txt-def"
    :data-test="dataTest"
  >
    <wui-icon
      :name="icon"
      class="h-30! w-30! text-desk-def-icon-def"
    />
    <span class="text-xl font-normal">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { WuiBtn, WuiIcon } from '@wui/common-library'
import type { IconName } from '@wui/common-library'

withDefaults(defineProps<{
  icon: IconName
  label: string
  dataTest?: string
  /** false — только визуал, без кнопки и клика (очередь AM). */
  interactive?: boolean
}>(), {
  dataTest: undefined,
  interactive: true,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
