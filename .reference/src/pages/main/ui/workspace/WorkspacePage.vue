<template>
  <panel-status
    :loading="loading"
    :message="statusMessage"
    @retry="retryLoadWorkspace"
  >
    <section
      v-if="workspace"
      class="flex h-full flex-col"
    >
      <empty-setup-prompt
        v-if="shouldShowEmptyWorkspaceState"
        icon="setSquareM"
        label="Нажмите, чтобы настроить рабочий стол"
        data-test="workspace-empty-state"
        @click="enableEditMode"
      />

      <workspace-layout-picker
        v-else-if="shouldShowLayoutPicker"
        @select="selectLayout"
      />

      <div
        v-else-if="workspace.columns.length"
        class="workspace-grid grid min-h-0 flex-1 gap-2"
        :class="{ 'pointer-events-none': isContextMenuOpen }"
        :style="{ '--workspace-columns': gridTemplateColumns }"
      >
        <article
          v-for="item in workspaceItems"
          :key="item.column.id"
          :ref="(element) => setCellRef(item.position, element)"
          :data-test="`workspace-grid-cell-${item.position}`"
          class="relative flex min-h-0 min-w-0 flex-col"
        >
          <div
            v-if="item.component"
            class="relative flex min-h-0 flex-1"
            :class="shouldShowEditGrid ? 'cursor-pointer' : undefined"
            @click.stop="shouldShowEditGrid && !isContextMenuOpen && openOccupiedWidgetMenu(item.position, $event)"
          >
            <widget-viewport-provider :viewport="item.viewport">
              <component
                :is="item.component"
                class="min-h-0 flex-1"
                :class="{ 'pointer-events-none': shouldShowEditGrid }"
              />
            </widget-viewport-provider>
          </div>

          <my-btn
            v-else-if="shouldShowEditGrid"
            icon
            prepend-icon="plusAddM"
            :size="72"
            data-test="add-widget-cell"
            class="h-full w-full rounded-12! border border-desk-add-brd-def! bg-desk-add-bg-def! text-desk-add-icon-def! transition-colors! hover:bg-desk-add-bg-hov!"
            @click.stop="openAddWidgetMenu(item.position, $event)"
          />

          <div
            v-else
            class="flex-1"
          />
        </article>
      </div>

      <context-menu
        v-bind="contextMenuProps"
        @close="closeContextMenu"
      />
    </section>
  </panel-status>
</template>

<script lang="ts" setup>
import type { IconName } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { type ComponentPublicInstance, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { WorkspaceLayout, WorkspaceWidgetPosition, WorkspaceWidgetType } from '@/entities/workspace'
import { MONOPOLY_WIDGET_VIEWPORT, resolveWidgetViewport, useWorkspaceStore, WidgetViewportProvider } from '@/entities/workspace'

import { ContextMenu, EmptySetupPrompt, MyBtn, PanelStatus, useContextMenu } from '@/shared/ui'
import type { ContextMenuItem } from '@/shared/ui'

import { getWorkspaceWidgetComponent } from '../../model'

import WorkspaceLayoutPicker from './WorkspaceLayoutPicker.vue'

const props = defineProps<{
  workspaceId: string
}>()

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const { loading, error, isWorkspaceEditMode } = storeToRefs(workspaceStore)

const workspace = computed(() => workspaceStore.getWorkspaceById(props.workspaceId))
const activeMenuPosition = ref<WorkspaceWidgetPosition | null>(null)
const activeMenuContext = ref<'add' | 'widget' | null>(null)
const cellRefs = ref<Partial<Record<WorkspaceWidgetPosition, HTMLElement>>>({})

const statusMessage = computed(() => {
  if (loading.value) {
    return null
  }

  if (error.value) {
    return error.value
  }

  if (!workspace.value) {
    return 'Рабочий стол не найден'
  }

  return null
})

const retryLoadWorkspace = () => {
  void workspaceStore.refreshWorkspaces()
}

const widgetItems: Array<{ label: string, value: WorkspaceWidgetType, icon: IconName }> = [
  { label: 'Панель быстрого вызова', value: 'contacts', icon: 'layoutTilesM' },
  { label: 'Закрепленные вызовы', value: 'pinnedCalls', icon: 'pinnedM' },
  { label: 'Группы закрепленных', value: 'groups', icon: 'userGroupM' },
  { label: 'История', value: 'history', icon: 'clockM' },
  { label: 'Справочник', value: 'phonebook', icon: 'userM' },
]

const gridTemplateColumns = computed(() => {
  return workspace.value?.columns.map(({ templateWidth }) => templateWidth).join(' ') ?? '1fr'
})

const hasWidgets = computed(() => Boolean(workspace.value?.widgets.length))

const shouldShowEmptyWorkspaceState = computed(() => {
  return Boolean(workspace.value && !isWorkspaceEditMode.value && !hasWidgets.value)
})

const shouldShowLayoutPicker = computed(() => {
  return Boolean(workspace.value && isWorkspaceEditMode.value && !workspace.value.layout && !hasWidgets.value)
})

const shouldShowEditGrid = computed(() => {
  return Boolean(workspace.value?.layout && isWorkspaceEditMode.value)
})

const availableWidgetItems = computed(() => {
  const placedWidgetTypes = new Set(workspace.value?.widgets.map(widget => widget.type) ?? [])

  return widgetItems.filter(widget => !placedWidgetTypes.has(widget.value))
})

const workspaceItems = computed(() => {
  const currentWorkspace = workspace.value

  if (!currentWorkspace) {
    return []
  }

  return currentWorkspace.columns.map((column, index) => {
    const position = index as WorkspaceWidgetPosition
    const widget = currentWorkspace.widgets.find(widget => widget.position === position)
    const layout = currentWorkspace.layout

    return {
      column,
      position,
      widget,
      component: widget ? getWorkspaceWidgetComponent(widget.type) : null,
      viewport: layout ? resolveWidgetViewport(layout, position) : MONOPOLY_WIDGET_VIEWPORT,
    }
  })
})

const setCellRef = (position: WorkspaceWidgetPosition, element: Element | ComponentPublicInstance | null) => {
  if (element instanceof HTMLElement) {
    cellRefs.value[position] = element
    return
  }

  delete cellRefs.value[position]
}

const enableEditMode = () => {
  workspaceStore.setWorkspaceEditMode(true)
}

const selectLayout = (layout: WorkspaceLayout) => {
  workspaceStore.setWorkspaceLayout(props.workspaceId, layout)
}

const openAddWidgetMenu = (position: WorkspaceWidgetPosition, event: MouseEvent) => {
  activeMenuContext.value = 'add'
  activeMenuPosition.value = position
  openContextMenu(event)
}

const openOccupiedWidgetMenu = (position: WorkspaceWidgetPosition, event: MouseEvent) => {
  activeMenuContext.value = 'widget'
  activeMenuPosition.value = position
  openContextMenu(event)
}

const closeContextMenu = () => {
  activeMenuPosition.value = null
  activeMenuContext.value = null
  closeContextMenuState()
}

const handleAddWidget = async (type: WorkspaceWidgetType) => {
  if (activeMenuPosition.value === null) {
    return
  }

  const position = activeMenuPosition.value
  const currentWorkspace = workspace.value
  const isDraftWorkspace = Boolean(currentWorkspace && 'isDraft' in currentWorkspace)

  const snapshot = await workspaceStore.addWorkspaceWidget({
    workspaceId: props.workspaceId,
    type,
    position,
  })

  closeContextMenu()

  if (isDraftWorkspace && snapshot) {
    await router.replace({
      name: 'Workspace',
      params: { workspaceId: snapshot.id },
    })
  }
}

const handleDeleteWidget = async () => {
  if (activeMenuPosition.value === null) {
    return
  }

  const result = await workspaceStore.removeWorkspaceWidget({
    workspaceId: props.workspaceId,
    position: activeMenuPosition.value,
  })

  closeContextMenu()

  if (result) {
    await router.replace({
      name: 'Workspace',
      params: { workspaceId: result.draftWorkspaceId },
    })
  }
}

const handleMoveWidget = async (direction: 'left' | 'right') => {
  if (activeMenuPosition.value === null) {
    return
  }

  await workspaceStore.moveWorkspaceWidget({
    workspaceId: props.workspaceId,
    position: activeMenuPosition.value,
    direction,
  })

  closeContextMenu()
}

const handleReplaceWidget = async (type: WorkspaceWidgetType) => {
  if (activeMenuPosition.value === null) {
    return
  }

  await workspaceStore.replaceWorkspaceWidget({
    workspaceId: props.workspaceId,
    position: activeMenuPosition.value,
    type,
  })

  closeContextMenu()
}

const handleChangeLayout = () => {
  workspaceStore.clearWorkspaceLayout(props.workspaceId)
  closeContextMenu()
}

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const position = activeMenuPosition.value
  const currentWorkspace = workspace.value

  if (position === null || !currentWorkspace || activeMenuContext.value === null) {
    return []
  }

  if (activeMenuContext.value === 'add') {
    const items: ContextMenuItem[] = availableWidgetItems.value.map(widget => ({
      label: widget.label,
      icon: widget.icon,
      dataTest: `add-widget-menu-${widget.value}`,
      onClick: () => {
        void handleAddWidget(widget.value)
      },
    }))

    if (!hasWidgets.value && currentWorkspace.layout) {
      items.push({
        label: 'Сменить раскладку',
        icon: 'setSquareM',
        border: 'top' as const,
        dataTest: 'workspace-change-layout-menu',
        onClick: handleChangeLayout,
      })
    }

    return items
  }

  const columnsCount = currentWorkspace.columns.length
  const moveItems: ContextMenuItem[] = []

  if (position > 0) {
    moveItems.push({
      label: 'Переместить влево',
      icon: 'arrowLeft',
      dataTest: 'workspace-widget-menu-move-left',
      onClick: () => {
        void handleMoveWidget('left')
      },
    })
  }

  if (position < columnsCount - 1) {
    moveItems.push({
      label: 'Переместить вправо',
      icon: 'arrowRight',
      dataTest: 'workspace-widget-menu-move-right',
      onClick: () => {
        void handleMoveWidget('right')
      },
    })
  }

  if (moveItems.length) {
    moveItems[moveItems.length - 1] = {
      ...moveItems[moveItems.length - 1],
      border: 'bottom',
    }
  }

  const replaceItems: ContextMenuItem[] = availableWidgetItems.value.map(widget => ({
    label: widget.label,
    icon: widget.icon,
    dataTest: `replace-widget-menu-${widget.value}`,
    onClick: () => {
      void handleReplaceWidget(widget.value)
    },
  }))

  const deleteItem: ContextMenuItem = {
    label: 'Удалить',
    icon: 'trashM',
    iconClass: 'text-comp-menu-item-icon-base-neg',
    border: 'top',
    dataTest: 'workspace-widget-menu-delete',
    onClick: () => {
      void handleDeleteWidget()
    },
  }

  return [...moveItems, ...replaceItems, deleteItem]
})

const {
  isOpen: isContextMenuOpen,
  menuProps: contextMenuProps,
  open: openContextMenu,
  close: closeContextMenuState,
} = useContextMenu({
  items: contextMenuItems,
})

watch(isWorkspaceEditMode, (value) => {
  if (!value) {
    closeContextMenu()
  }
})

</script>

<style scoped>
.workspace-grid {
  grid-template-columns: var(--workspace-columns);
}

@media (max-width: 1024px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}
</style>
