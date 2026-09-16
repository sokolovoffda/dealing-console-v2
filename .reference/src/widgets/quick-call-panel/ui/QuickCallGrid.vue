<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="min-h-0 flex-1 overflow-y-auto">
      <ul class="grid gap-2 contacts-page__cards-list">
        <li
          v-for="cell in cells"
          :key="cell.key"
          class="min-h-29"
          :data-grid-cell-index="cell.index"
          :data-grid-cell-type="cell.type"
        >
          <contact-card
            v-if="cell.contact"
            :user="cell.contact"
            :is-edit-mode="isEditMode"
            :has-multiple-groups="hasMultipleGroups"
            :is-move-mode="isMoveMode"
            :is-moving-source="isMovingSource(cell)"
            @select="emit('select', cell)"
            @move-inside-group="emit('moveInsideGroup', cell)"
            @move-to-group="emit('moveToGroup', cell)"
            @duplicate-to-group="emit('duplicateToGroup', cell)"
            @delete="emit('delete', cell)"
          />
          <my-btn
            v-else-if="isEditMode"
            icon
            tone="alpha"
            prepend-icon="plusAddM"
            :size="72"
            :disabled="isAddDisabled"
            class="h-full w-full border border-card-add-brd-base-def! rounded-12!"
            @click="emit('emptyCellClick', cell.index)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ContactCard } from '@/features/contact-card'

import { MyBtn } from '@/shared/ui'

import type { QuickCallGridCell } from '../model/use-quick-call-fast-dial-grid'

defineProps<{
  cells: QuickCallGridCell[]
  isEditMode: boolean
  hasMultipleGroups: boolean
  isMoveMode: boolean
  isAddDisabled: boolean
  isMovingSource: (cell: QuickCallGridCell) => boolean
}>()

const emit = defineEmits<{
  select: [cell: QuickCallGridCell]
  moveInsideGroup: [cell: QuickCallGridCell]
  moveToGroup: [cell: QuickCallGridCell]
  duplicateToGroup: [cell: QuickCallGridCell]
  delete: [cell: QuickCallGridCell]
  emptyCellClick: [cellIndex: number]
}>()
</script>

<style scoped>
.contacts-page__cards-list {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr));
}
</style>
