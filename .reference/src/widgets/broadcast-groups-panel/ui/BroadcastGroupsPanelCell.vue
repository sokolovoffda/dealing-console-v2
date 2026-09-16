<template>
  <my-btn
    v-if="isEditMode && isEmpty && !disabled"
    icon
    tone="alpha"
    prepend-icon="plusAddM"
    :size="72"
    class="h-full min-h-0 w-full border border-card-add-brd-base-def! rounded-12!"
    data-test="broadcast-group-add"
    @click="emit('cellClick', $event)"
  />

  <!-- Вне edit пустая ячейка держит позицию в сетке без карточки. -->
  <div
    v-else-if="isEmpty"
    class="h-full min-h-0 w-full"
    data-test="broadcast-group-empty-slot"
    aria-hidden="true"
  />

  <broadcast-group-card
    v-else
    :cell="cell"
    :display-number="displayNumber"
    :is-edit-mode="isEditMode"
    :disabled="disabled"
    @cell-click="emit('cellClick', $event)"
    @remove-member="emit('removeMember', $event)"
    @mic-click="emit('micClick')"
    @speaker-click="emit('speakerClick')"
    @volume-change="emit('volumeChange', $event)"
  />
</template>

<script setup lang="ts">
import type {
  PinnedCallGroupCell,
  PinnedCallGroupMember,
} from '@/entities/pinned-calls'

import { MyBtn } from '@/shared/ui'

import BroadcastGroupCard from './BroadcastGroupCard.vue'

defineProps<{
  cell: PinnedCallGroupCell
  displayNumber: number
  isEditMode: boolean
  isEmpty: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  cellClick: [event: MouseEvent]
  removeMember: [member: PinnedCallGroupMember]
  micClick: []
  speakerClick: []
  volumeChange: [volumePercent: number]
}>()
</script>
