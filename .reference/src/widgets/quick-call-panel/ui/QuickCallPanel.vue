<template>
  <section class="flex h-full flex-col overflow-hidden text-title-txt-def">
    <quick-call-header
      :is-edit-mode="isEditMode"
      @toggle-edit-mode="toggleEditMode"
    />

    <div class="flex min-h-0 flex-1 flex-col">
      <tabs-block
        class="mb-2 shrink-0"
        @create="handleCreateGroup"
        @tab-click="handleTabClick"
      />
      <panel-status
        :loading="loading"
        :message="panelStatusMessage"
        :icon="panelStatusIcon"
        @retry="retryLoadPanel"
      >
        <empty-setup-prompt
          v-if="showEmptySetupPrompt"
          icon="layoutTilesM"
          :label="emptySetupLabel"
          data-test="quick-call-empty-setup-state"
          @click="handleEmptySetupClick"
        />

        <quick-call-grid
          v-else
          :cells="cells"
          :is-edit-mode="isEditMode"
          :has-multiple-groups="hasMultipleGroups"
          :is-move-mode="isMoveMode"
          :is-add-disabled="isGroupTransferInSourceGroup || transferring"
          :is-moving-source="isMovingSourceCell"
          @select="handleContactCellSelect"
          @move-inside-group="startMoveInsideGroup"
          @move-to-group="startMoveToGroup"
          @duplicate-to-group="startDuplicateToGroup"
          @delete="handleDeleteContact"
          @empty-cell-click="handleEmptyCellClick"
        />
      </panel-status>
    </div>

    <context-menu
      v-bind="tabMenuProps"
      @close="closeTabMenu"
    />
  </section>
</template>

<script lang="ts" setup>
import { useDialog, type IconName } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, type ComponentOptions, ref, watch } from 'vue'

import { useFastDialStore } from '@/entities/fast-dial'
import { useGroupStore } from '@/entities/group'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'
import { TabsBlock, useContactTabs } from '@/entities/settings'

import { ContextMenu, EmptySetupPrompt, PanelStatus, useContextMenu } from '@/shared/ui'
import type { ContextMenuItem } from '@/shared/ui'

import { useQuickCallFastDialGrid } from '../model/use-quick-call-fast-dial-grid'
import { useQuickCallGridActions } from '../model/use-quick-call-grid-actions'
import { useWorkspaceGroupContacts } from '../model/use-workspace-group-contacts'

import CreateGroupModal, { type CreateGroupModalResult } from './CreateGroupModal.vue'
import QuickCallGrid from './QuickCallGrid.vue'
import QuickCallHeader from './QuickCallHeader.vue'

const { showDialog } = useDialog<CreateGroupModalResult | undefined>()
const contactTabsStore = useContactTabs()
const groupStore = useGroupStore()
const { activeTab, enabledTabs } = storeToRefs(contactTabsStore)
const { addTabAndActivate, removeTabAndActivate } = contactTabsStore
const fastDialStore = useFastDialStore()
const pinnedCallsPanelStore = usePinnedCallsPanelStore()
const { groupsByGroupGuid, loading: fastDialLoading } = storeToRefs(fastDialStore)
const {
  contacts,
  loadGroupContacts,
  addCachedGroupContact,
  contactsByGroupGuid,
  removeCachedGroupContact,
  clearCachedGroupContacts,
  refreshGroupContacts,
  hydrateMissingContacts,
  loading: contactsLoading,
  error,
} = useWorkspaceGroupContacts()
const isEditMode = ref(false)
const tabMenuGroupGuid = ref<string | null>(null)

const activeGroupGuid = computed(() => {
  return activeTab.value?.groupGuid
})

const activeFastDialGroup = computed(() => {
  const groupGuid = activeGroupGuid.value

  if (!groupGuid) return undefined

  return groupsByGroupGuid.value.get(groupGuid)
})

const loading = computed(() => {
  return contactsLoading.value || fastDialLoading.value
})

const {
  cells,
  clearGroupLocalLayout,
  getGroupLayout,
  layout,
  setLocalGroupLayout,
  setLocalLayout,
} = useQuickCallFastDialGrid({
  groupGuid: activeGroupGuid,
  contacts,
  fastDialGroup: activeFastDialGroup,
})

const {
  cancelMove,
  handleContactCellSelect,
  handleDeleteContact,
  handleEmptyCellClick,
  isGroupTransferInSourceGroup,
  isMoveMode,
  isMovingSourceCell,
  movingContact,
  startDuplicateToGroup,
  startMoveInsideGroup,
  startMoveToGroup,
  transferring,
} = useQuickCallGridActions({
  activeGroupGuid,
  contacts,
  contactsByGroupGuid,
  layout,
  groupsByGroupGuid,
  getGroupLayout,
  setLocalLayout,
  setLocalGroupLayout,
  addCachedGroupContact,
  removeCachedGroupContact,
})

const isGroupTransferMove = computed(() => {
  const mode = movingContact.value?.mode
  return mode === 'between-groups' || mode === 'duplicate-to-group'
})

const hasMultipleGroups = computed(() => {
  return enabledTabs.value.length > 1
})

const hasTabs = computed(() => {
  return enabledTabs.value.length > 0
})

const shouldShowGrid = computed(() => {
  return hasTabs.value && (contacts.value.length > 0 || isEditMode.value)
})

const showEmptySetupPrompt = computed(() => {
  return !loading.value && !error.value && !shouldShowGrid.value
})

const emptySetupLabel = computed(() => {
  if (!hasTabs.value) {
    return 'Нажмите, чтобы создать группу'
  }

  return 'Нажмите, чтобы добавить контакты'
})

const panelStatusMessage = computed(() => {
  if (loading.value) {
    return null
  }

  if (error.value) {
    return error.value
  }

  return null
})

const panelStatusIcon = computed((): IconName | null => {
  return panelStatusMessage.value ? 'messageBalloonOutlined' : null
})

const tabMenuItems = computed<ContextMenuItem[]>(() => {
  return [
    {
      label: 'Удалить',
      icon: 'trashM',
      iconClass: 'text-comp-menu-item-icon-base-neg',
      dataTest: 'quick-call-tab-menu-delete',
      onClick: () => {
        const groupGuid = tabMenuGroupGuid.value
        if (!groupGuid) return
        void handleDeleteGroup(groupGuid)
      },
    },
  ]
})

const {
  menuProps: tabMenuProps,
  open: openTabMenu,
  close: closeTabMenu,
} = useContextMenu({
  items: tabMenuItems,
  anchorMode: 'cursor',
})

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value

  if (!isEditMode.value) {
    cancelMove()
    closeTabMenu()
  }
}

const enterEditMode = () => {
  if (isEditMode.value) {
    return
  }

  isEditMode.value = true
}

const handleEmptySetupClick = () => {
  if (!hasTabs.value) {
    void handleCreateGroup()
    return
  }

  enterEditMode()
}

const handleTabClick = ({ groupGuid, event }: { groupGuid: string, event: MouseEvent }) => {
  if (!isEditMode.value || isGroupTransferMove.value) {
    closeTabMenu()
    return
  }

  tabMenuGroupGuid.value = groupGuid
  openTabMenu(event)
}

const handleCreateGroup = async () => {
  const result = await showDialog(CreateGroupModal as ComponentOptions, {
    hasOverlay: false,
  })

  if (!result?.name) return

  try {
    const createdGroup = await groupStore.createGroup({ name: result.name })

    if (!createdGroup) return

    // После успешного POST обновляем UI сразу — GET групп часто отстаёт на один create
    addTabAndActivate({
      guid: createdGroup.guid,
      name: createdGroup.name,
    })
  } catch (e) {
    console.error('Quick call panel create group failed:', e)
  }
}

const getFallbackGroupGuidAfterDelete = (groupGuid: string): string | undefined => {
  const tabs = enabledTabs.value
  const deletedIndex = tabs.findIndex(tab => tab.groupGuid === groupGuid)

  if (deletedIndex < 0) return undefined

  // Предыдущий таб слева; если удалили первый — сосед справа
  return tabs[deletedIndex - 1]?.groupGuid ?? tabs[deletedIndex + 1]?.groupGuid
}

const handleDeleteGroup = async (groupGuid: string) => {
  if (!groupGuid) return

  cancelMove()
  closeTabMenu()

  const fallbackGroupGuid = getFallbackGroupGuidAfterDelete(groupGuid)

  try {
    const fastDialGroup = groupsByGroupGuid.value.get(groupGuid)

    if (fastDialGroup) {
      try {
        await fastDialStore.deleteGroup(fastDialGroup.id)
      } catch (e) {
        console.error('Quick call panel delete fast-dial group failed:', e)
      }
    }

    const isDeleted = await groupStore.deleteGroup(groupGuid)

    if (!isDeleted) return

    clearCachedGroupContacts(groupGuid)
    clearGroupLocalLayout(groupGuid)
    // После успешного DELETE сразу убираем таб и переключаем — без GET (лаг / stale list)
    removeTabAndActivate(groupGuid, fallbackGroupGuid)
  } catch (e) {
    console.error('Quick call panel delete group failed:', e)
  }
}

const loadFastDialPanel = async (force = false) => {
  try {
    await fastDialStore.fetchPanel(force)
  } catch (e) {
    console.error('Quick call panel load fast-dial panel failed:', e)
  }
}

const loadPinnedCallsPanel = async (force = false) => {
  try {
    await pinnedCallsPanelStore.fetchPanel(force)
  } catch (e) {
    console.error('Quick call panel load pinned calls panel failed:', e)
  }
}

/** WUI-5642: после contacts+fast-dial подтягиваем orphan guid'ы из раскладки. */
const hydrateActiveGroupFromFastDial = async (groupGuid: string) => {
  const fastDialGroup = groupsByGroupGuid.value.get(groupGuid)
  const layoutGuids = fastDialGroup?.contacts.map(contact => contact.contactGuid) ?? []

  if (layoutGuids.length === 0) return

  await hydrateMissingContacts(groupGuid, layoutGuids)
}

const loadActiveGroupPanel = async (groupGuid?: string, forceFastDial = false) => {
  if (!groupGuid) {
    await loadGroupContacts(undefined)
    return
  }

  await Promise.all([
    loadGroupContacts(groupGuid),
    loadFastDialPanel(forceFastDial),
  ])
  await hydrateActiveGroupFromFastDial(groupGuid)
}

const retryLoadPanel = () => {
  void (async () => {
    const groupGuid = activeGroupGuid.value
    if (!groupGuid) return

    await refreshGroupContacts(groupGuid)
    await loadFastDialPanel(true)
    await hydrateActiveGroupFromFastDial(groupGuid)
  })()
  void loadPinnedCallsPanel(true)
}

watch(activeGroupGuid, (groupGuid) => {
  if (movingContact.value?.mode === 'inside-group') {
    cancelMove()
  }

  void loadActiveGroupPanel(groupGuid)
  void loadPinnedCallsPanel()
}, { immediate: true })

watch(isGroupTransferMove, (isTransfer) => {
  if (isTransfer) {
    closeTabMenu()
  }
})
</script>
