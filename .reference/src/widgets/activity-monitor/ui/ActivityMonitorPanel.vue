<template>
  <section class="flex h-full flex-col overflow-hidden text-title-txt-def">
    <widget-header
      icon="mSquareM"
      icon-class="text-title-activity-monitor-icon-def"
      title="Монитор активности"
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
          ? 'bg-btn-warn-base-bg-def!'
          : 'bg-transparent! hover:bg-btn-neut-soft-bg-hov!'"
        data-test="activity-monitor-edit-toggle"
        @click="toggleEditMode"
      />
    </widget-header>

    <div class="flex min-h-0 flex-1 flex-col gap-2">
      <panel-status
        :loading="loading"
        :message="panelStatusMessage"
        :icon="panelStatusIcon"
        class="min-h-0 flex-1"
        @retry="retryLoadPanel"
      >
        <div class="min-h-0 flex-1 overflow-y-auto">
          <empty-setup-prompt
            v-if="showEmptySetupPrompt"
            icon="mSquareM"
            label="Нажмите, чтобы добавить абонентов"
            data-test="activity-monitor-empty-setup-state"
            @click="enterEditMode"
          />

          <activity-monitor-grid
            v-else
            :cells="cells"
            :is-edit-mode="isEditMode"
            :is-move-mode="isMoveMode"
            :is-moving-source="isMovingSource"
            @select="handleSelect"
            @move-inside="startMoveInside"
            @delete="handleDelete"
            @empty-cell-click="handleEmptyCellClick"
          />
        </div>
      </panel-status>

      <!-- Вне PanelStatus: иначе при loading слот не монтируется и очередь «мертвая». -->
      <activity-monitor-queue-panel />
    </div>
  </section>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'
import type { IconName } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

import { useActivityMonitorStore } from '@/entities/activity-monitor'

import { EmptySetupPrompt, PanelStatus, WidgetHeader } from '@/shared/ui'

import {
  useActivityMonitorBlfSubscription,
  useActivityMonitorGridActions,
  useActivityMonitorGridContacts,
} from '../model'

import ActivityMonitorGrid from './ActivityMonitorGrid.vue'
import ActivityMonitorQueuePanel from './ActivityMonitorQueuePanel.vue'

const store = useActivityMonitorStore()
const {
  error,
  isEditMode,
  loading,
  subscriptions,
} = storeToRefs(store)

const { cells, putContact } = useActivityMonitorGridContacts()
const {
  handleDelete,
  handleEmptyCellClick,
  handleSelect,
  isMoveMode,
  isMovingSource,
  startMoveInside,
} = useActivityMonitorGridActions({ putContact })

useActivityMonitorBlfSubscription(cells)

const hasSubscriptions = computed(() => {
  return subscriptions.value.length > 0
})

const showEmptySetupPrompt = computed(() => {
  return !loading.value && !error.value && !isEditMode.value && !hasSubscriptions.value
})

const panelStatusMessage = computed(() => {
  if (loading.value || !error.value) return null

  return error.value || 'Не удалось загрузить монитор активности'
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
  store.toggleEditMode()
}

const enterEditMode = () => {
  if (isEditMode.value) return

  store.setEditMode(true)
}
</script>
