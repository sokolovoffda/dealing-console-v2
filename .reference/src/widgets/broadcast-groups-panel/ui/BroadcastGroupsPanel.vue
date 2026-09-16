<template>
  <section class="flex h-full flex-col overflow-hidden text-title-txt-def">
    <widget-header
      icon="micM"
      title="Бродкаст группы"
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
        data-test="broadcast-edit-toggle"
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
          v-if="!hasLayout"
          icon="micM"
          label="Нажмите, чтобы настроить раскладку групп"
          data-test="broadcast-empty-layout-state"
          @click="openPickLayoutMenu"
        />

        <empty-setup-prompt
          v-else-if="showEmptyGroupsPrompt"
          icon="micM"
          label="Нажмите, чтобы создать группы"
          data-test="broadcast-empty-groups-state"
          @click="enterEditMode"
        />

        <div
          v-else
          ref="gridViewportEl"
          class="min-h-0 flex-1"
          :class="isScrollLayout ? 'overflow-y-auto' : 'overflow-hidden'"
          :style="gridViewportStyle"
        >
          <ul
            class="broadcast-groups-panel__grid grid min-h-0 gap-2"
            :class="isScrollLayout ? undefined : 'h-full'"
            :style="gridStyle"
          >
            <li
              v-for="item in gridItems"
              :key="item.key"
              class="min-h-0"
            >
              <broadcast-groups-panel-cell
                :cell="item.cell"
                :display-number="item.displayNumber"
                :is-edit-mode="isEditMode"
                :is-empty="item.isEmpty"
                :disabled="item.disabled"
                @cell-click="(event) => handleGroupCellClick(item, event)"
                @remove-member="(member) => handleRemoveMember(item, member)"
                @mic-click="handleMicClick(item)"
                @speaker-click="handleSpeakerClick(item)"
                @volume-change="(volumePercent) => handleVolumeChange(item, volumePercent)"
              />
            </li>
          </ul>
        </div>

        <context-menu
          v-bind="menuProps"
          @close="closeMenu"
        />
      </panel-status>
    </div>
  </section>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'
import type { IconName } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { ContextMenu, EmptySetupPrompt, PanelStatus, WidgetHeader } from '@/shared/ui'

import {
  useBroadcastGroupsGrid,
  useBroadcastGroupsLayout,
  useBroadcastGroupsPanelActions,
  useBroadcastGroupsScrollRows,
} from '../model'

import BroadcastGroupsPanelCell from './BroadcastGroupsPanelCell.vue'

const store = usePinnedCallsPanelStore()
const {
  error,
  groupCells,
  hasAnyGroupMembers,
  loading,
} = storeToRefs(store)

const {
  layoutCount,
  hasLayout,
  isScrollLayout,
  setLayoutCount,
  clearLayout,
  gridStyle,
} = useBroadcastGroupsLayout()

const {
  isEditMode,
  menuProps,
  closeMenu,
  toggleEditMode,
  enterEditMode,
  openPickLayoutMenu,
  handleGroupCellClick,
  handleRemoveMember,
  handleMicClick,
  handleSpeakerClick,
  handleVolumeChange,
} = useBroadcastGroupsPanelActions({
  hasLayout,
  setLayoutCount,
  clearLayout,
})

const { gridItems } = useBroadcastGroupsGrid(groupCells, layoutCount)

const showEmptyGroupsPrompt = computed(() => {
  return hasLayout.value && !isEditMode.value && !hasAnyGroupMembers.value
})

const {
  gridViewportEl,
  gridViewportStyle,
} = useBroadcastGroupsScrollRows(isScrollLayout)

const panelStatusMessage = computed(() => {
  if (loading.value) {
    return null
  }

  if (!error.value) {
    return null
  }

  return error.value || 'Не удалось загрузить бродкаст группы'
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
</script>
