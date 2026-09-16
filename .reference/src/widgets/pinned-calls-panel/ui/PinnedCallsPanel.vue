<template>
  <section class="flex h-full flex-col overflow-hidden text-title-txt-def">
    <widget-header
      icon="pinnedM"
      title="Завешенные линии"
      class="shrink-0"
    >
      <wui-btn
        icon
        text
        :size="48"
        rounded
        prepend-icon="editM"
        class="text-btn-neut-alpha-icon-def!"
        :class="isEditMode
          ? ' bg-btn-warn-base-bg-def!'
          : ' bg-transparent! hover:bg-btn-neut-soft-bg-hov!'"
        @click="toggleEditMode"
      />
    </widget-header>

    <div class="flex min-h-0 flex-1 flex-col">
      <panel-status
        :loading="loading"
        :message="panelStatusMessage"
        :icon="panelStatusIcon"
        class="min-h-0 flex-1"
        @retry="retryLoadPanel"
      >
        <empty-setup-prompt
          v-if="showEmptyPinnedPrompt"
          icon="pinnedM"
          label="Нажмите, чтобы добавить завешенные линии"
          data-test="pinned-empty-setup-state"
          @click="enterEditMode"
        />

        <div
          v-else
          class="min-h-0 flex-1 overflow-y-auto"
        >
          <context-menu
            v-if="isEditMode"
            v-bind="menuProps"
            @close="closeMenu"
          />

          <ul
            class="pinned-calls-panel__grid grid h-full gap-2"
            :style="gridStyle"
          >
            <li
              v-for="item in gridItems"
              :key="item.key"
              class="min-h-0"
              :data-grid-cell-index="item.index"
              :data-grid-cell-type="item.type"
            >
              <pinned-calls-panel-slot-card
                :cell="item.cell"
                :is-edit-mode="isEditMode"
                :is-move-mode="isMoveMode"
                :is-moving-source="isMovingSourceOrder(item.cell.order)"
                @select="handleSlotClick(item.cell, $event)"
                @center-click="(order, event) => handleSlotCenterClick(order, event)"
                @mic-click="handleSlotMicClick"
                @status-click="handleSlotStatusClick"
                @volume-change="handleSlotVolumeChange"
              />
            </li>
          </ul>
        </div>
      </panel-status>
    </div>
  </section>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'
import type { IconName } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onMounted, type CSSProperties } from 'vue'

import {
  PINNED_CALLS_GRID_GAP_PX,
  PINNED_CALLS_SLOT_MIN_HEIGHT_PX,
  PINNED_CALLS_UI_SLOT_COUNT,
  usePinnedCallsPanelStore,
} from '@/entities/pinned-calls'

import { ContextMenu, EmptySetupPrompt, PanelStatus, WidgetHeader } from '@/shared/ui'

import { usePinnedCallsPanelGrid, usePinnedCallsPanelSlotActions, usePinnedCallsGridColumns } from '../model'

import PinnedCallsPanelSlotCard from './PinnedCallsPanelSlotCard.vue'

const store = usePinnedCallsPanelStore()
const {
  error,
  gridCells,
  isEditMode,
  loading,
} = storeToRefs(store)

const { gridItems } = usePinnedCallsPanelGrid(gridCells)
const gridColumnCount = usePinnedCallsGridColumns()

const gridRowCount = computed(() => {
  return Math.ceil(PINNED_CALLS_UI_SLOT_COUNT / gridColumnCount.value)
})

/**
 * Хватает высоты → ряды `1fr` растягивают ячейки на весь viewport.
 * Не хватает → min 106px на ряд + min-height сетки > viewport → скролл.
 */
const gridStyle = computed((): CSSProperties => {
  const rows = gridRowCount.value
  const minGridHeightPx = rows * PINNED_CALLS_SLOT_MIN_HEIGHT_PX
    + Math.max(0, rows - 1) * PINNED_CALLS_GRID_GAP_PX

  return {
    gridTemplateColumns: `repeat(${gridColumnCount.value}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(${PINNED_CALLS_SLOT_MIN_HEIGHT_PX}px, 1fr))`,
    minHeight: `max(100%, ${minGridHeightPx}px)`,
  }
})

const {
  closeMenu,
  handleSlotClick,
  handleSlotCenterClick,
  handleSlotMicClick,
  handleSlotStatusClick,
  handleSlotVolumeChange,
  isMoveMode,
  isMovingSourceOrder,
  menuProps,
} = usePinnedCallsPanelSlotActions()

const hasPinnedSlots = computed(() => {
  return gridCells.value.some(cell => Boolean(cell.slot))
})

const showEmptyPinnedPrompt = computed(() => {
  return !loading.value && !error.value && !isEditMode.value && !hasPinnedSlots.value
})

const panelStatusMessage = computed(() => {
  if (loading.value) {
    return null
  }

  if (!error.value) {
    return null
  }

  return error.value || 'Не удалось загрузить завешенные линии'
})

const panelStatusIcon = computed((): IconName | null => {
  return panelStatusMessage.value ? 'messageBalloonOutlined' : null
})

onMounted(() => {
  void store.fetchPanel()
})

const retryLoadPanel = () => {
  void store.fetchPanel(true)
}

const toggleEditMode = () => {
  store.setEditMode(!isEditMode.value)
}

const enterEditMode = () => {
  if (isEditMode.value) {
    return
  }

  store.setEditMode(true)
}
</script>
