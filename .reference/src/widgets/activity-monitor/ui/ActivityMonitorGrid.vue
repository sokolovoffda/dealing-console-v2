<template>
  <ul class="activity-monitor-grid grid gap-2">
    <li
      v-for="cell in cells"
      :key="cell.cellIndex"
      class="activity-monitor-grid__cell min-h-29"
      :data-grid-cell-index="cell.cellIndex"
    >
      <contact-card
        v-if="cell.contact"
        :user="cell.contact"
        :is-edit-mode="isEditMode"
        :is-move-mode="isMoveMode"
        :is-moving-source="isMovingSource(cell)"
        :has-multiple-groups="false"
        :enable-move-inside="true"
        :enable-delete="true"
        :require-online-for-call="true"
        :enable-presence-visual="true"
        data-test="activity-monitor-contact-card"
        @select="emit('select', cell)"
        @move-inside-group="emit('moveInside', cell)"
        @delete="emit('delete', cell)"
      />

      <my-btn
        v-else-if="isEditMode"
        icon
        tone="alpha"
        prepend-icon="plusAddM"
        :size="72"
        class="h-full w-full border border-card-add-brd-base-def! rounded-12!"
        data-test="activity-monitor-empty-cell-add"
        @click="emit('emptyCellClick', cell.cellIndex)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ContactCard } from '@/features/contact-card'

import { MyBtn } from '@/shared/ui'

import type { ActivityMonitorContactGridCell } from '../model'

defineProps<{
  cells: ActivityMonitorContactGridCell[]
  isEditMode: boolean
  isMoveMode: boolean
  isMovingSource: (cell: ActivityMonitorContactGridCell) => boolean
}>()

const emit = defineEmits<{
  select: [cell: ActivityMonitorContactGridCell]
  moveInside: [cell: ActivityMonitorContactGridCell]
  delete: [cell: ActivityMonitorContactGridCell]
  emptyCellClick: [cellIndex: number]
}>()
</script>

<style scoped>
.activity-monitor-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr));
}
</style>
