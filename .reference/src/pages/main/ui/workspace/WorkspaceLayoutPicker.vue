<template>
  <div
    class="flex min-h-0 flex-1"
    data-test="workspace-layout-picker"
  >
    <ul class="grid h-full w-full grid-cols-4 overflow-hidden rounded-14 border border-desk-def-brd-def">
      <li
        v-for="(option, index) in WORKSPACE_LAYOUT_OPTIONS"
        :key="option.value"
        class="min-h-0"
        :class="index > 0 ? 'border-l border-desk-def-brd-def' : undefined"
      >
        <wui-btn
          text
          class="h-full! w-full! rounded-none! bg-transparent! transition-colors hover:bg-desk-add-bg-hov!"
          :data-test="`workspace-layout-${option.value}`"
          @click="emit('select', option.value)"
        >
          <div class="flex h-24 w-36 overflow-hidden rounded-14 border-2 border-white bg-transparent">
            <div
              v-for="(flexGrow, columnIndex) in option.previewFlex"
              :key="columnIndex"
              class="h-full bg-transparent"
              :class="columnIndex < option.previewFlex.length - 1 ? 'border-r border-white' : undefined"
              :style="{ flex: `${flexGrow} 1 0%` }"
            />
          </div>
        </wui-btn>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { WuiBtn } from '@wui/common-library'

import type { WorkspaceLayout } from '@/entities/workspace'
import { WORKSPACE_LAYOUT_OPTIONS } from '@/entities/workspace'

const emit = defineEmits<{
  select: [layout: WorkspaceLayout]
}>()
</script>
