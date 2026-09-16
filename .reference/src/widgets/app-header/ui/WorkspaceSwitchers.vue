<template>
  <div class="flex min-w-0 items-center gap-2 overflow-x-auto">
    <router-link
      v-slot="{ navigate }"
      custom
      :to="{ name: 'ActivityMonitor' }"
    >
      <my-btn
        icon
        variant="brandcon"
        prepend-icon="mSquareM"
        :size="72"
        :selected="isActivityMonitorSelected"
        @click="navigate"
      />
    </router-link>

    <router-link
      v-for="workspace in workspaceViewModels"
      :key="workspace.id"
      v-slot="{ navigate }"
      custom
      :to="{ name: 'Workspace', params: { workspaceId: workspace.id } }"
    >
      <my-btn
        icon
        variant="brandcon"
        :size="72"
        :selected="selectedWorkspaceId === workspace.id"
        :prepend-icon="workspaceIconNames[workspace.order]"
        @click="navigate"
      />
    </router-link>

    <div ref="editMenuActivatorRef" class="shrink-0">
      <my-btn
        icon
        mode="button"
        variant="brandcon"
        prepend-icon="setSquareM"
        :size="72"
        :active="isWorkspaceEditMode"
        :disabled="isWorkspaceEditDisabled"
        data-test="workspace-edit-toggle"
        @click.stop="handleEditButtonClick"
      />
    </div>

    <context-menu
      v-bind="editMenuProps"
      @close="closeEditMenu"
    />
  </div>
</template>

<script lang="ts" setup>
import { useDialog } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref, watch, type ComponentOptions } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useWorkspaceStore } from '@/entities/workspace'

import { ContextMenu, MyBtn, useContextMenu } from '@/shared/ui'
import type { ContextMenuItem } from '@/shared/ui'

import DeleteWorkspaceConfirmModal from './DeleteWorkspaceConfirmModal.vue'

const workspaceStore = useWorkspaceStore()
const route = useRoute()
const router = useRouter()
const { showDialog } = useDialog<boolean | undefined>()

const { isWorkspaceEditMode, workspaceViewModels } = storeToRefs(workspaceStore)
const workspaceIconNames = ['oneSquareM', 'twoSquareM', 'threeSquareM', 'fourSquareM', 'fiveSquareM'] as const
const editMenuActivatorRef = ref<HTMLElement | null>(null)

const selectedWorkspaceId = computed(() => {
  return route.name === 'Workspace' && typeof route.params.workspaceId === 'string'
    ? route.params.workspaceId
    : null
})

const selectedWorkspace = computed(() => {
  return selectedWorkspaceId.value ? workspaceStore.getWorkspaceById(selectedWorkspaceId.value) : null
})

const isActivityMonitorSelected = computed(() => route.name === 'ActivityMonitor')
const isWorkspaceEditDisabled = computed(() => !selectedWorkspace.value)
const isConfiguredWorkspace = computed(() => {
  return Boolean(selectedWorkspace.value && !('isDraft' in selectedWorkspace.value))
})

const getDraftWorkspaceOrder = (workspaceId: string): number | null => {
  const match = workspaceId.match(/^draft-workspace-(\d+)$/)

  if (!match) {
    return null
  }

  return Number(match[1]) - 1
}

const shouldPreserveEditModeOnWorkspaceIdChange = (oldId: string, newId: string) => {
  const draftOrder = getDraftWorkspaceOrder(oldId)

  if (draftOrder === null) {
    return false
  }

  const newWorkspace = workspaceStore.getWorkspaceById(newId)

  if (!newWorkspace || 'isDraft' in newWorkspace || newWorkspace.order !== draftOrder) {
    return false
  }

  return newWorkspace.widgets.length < newWorkspace.columns.length
}

const handleStartWorkspaceEdit = () => {
  workspaceStore.setWorkspaceEditMode(true)
  closeEditMenu()
}

const handleDeleteWorkspace = async () => {
  if (!selectedWorkspaceId.value) {
    return
  }

  closeEditMenu()

  const isConfirmed = await showDialog(DeleteWorkspaceConfirmModal as ComponentOptions)

  if (!isConfirmed) {
    return
  }

  const result = await workspaceStore.deleteWorkspaceSnapshot(selectedWorkspaceId.value)

  workspaceStore.setWorkspaceEditMode(false)

  if (result) {
    await router.replace({
      name: 'Workspace',
      params: { workspaceId: result.draftWorkspaceId },
    })
  }
}

const workspaceEditMenuItems = computed<ContextMenuItem[]>(() => [
  {
    label: 'Редактировать',
    icon: 'setSquareM',
    dataTest: 'workspace-edit-menu-edit',
    onClick: handleStartWorkspaceEdit,
  },
  {
    label: 'Удалить',
    icon: 'trashM',
    iconClass: 'text-comp-menu-item-icon-base-neg',
    dataTest: 'workspace-edit-menu-delete',
    onClick: handleDeleteWorkspace,
  },
])

const {
  menuProps: editMenuProps,
  open: openEditMenu,
  close: closeEditMenu,
} = useContextMenu({
  items: workspaceEditMenuItems,
  activator: editMenuActivatorRef,
})

const handleEditButtonClick = () => {
  if (isWorkspaceEditDisabled.value || !selectedWorkspaceId.value) {
    return
  }

  if (workspaceStore.isWorkspaceEditMode) {
    workspaceStore.setWorkspaceEditMode(false, selectedWorkspaceId.value)
    closeEditMenu()
    return
  }

  if (isConfiguredWorkspace.value) {
    openEditMenu()
    return
  }

  workspaceStore.setWorkspaceEditMode(true)
}

watch(selectedWorkspaceId, (newId, oldId) => {
  closeEditMenu()

  if (!oldId) {
    return
  }

  if (newId && shouldPreserveEditModeOnWorkspaceIdChange(oldId, newId)) {
    return
  }

  workspaceStore.setWorkspaceEditMode(false, oldId)
})
</script>
