import { useDialog } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref, type ComponentOptions, type Ref } from 'vue'

import {
  getPinnedCallGroupMemberKey,
  PINNED_CALLS_GROUP_INITIAL_MIC_STATE,
  usePinnedCallsPanelStore,
  type PinnedCallGroupMember,
} from '@/entities/pinned-calls'

import { useNotification } from '@/shared/notifications'
import { useContextMenu } from '@/shared/ui'
import type { ContextMenuItem } from '@/shared/ui'

import AddBroadcastGroupMembersModal from '../ui/AddBroadcastGroupMembersModal.vue'

import type {
  AddBroadcastGroupMembersModalResult,
  AddBroadcastGroupMembersOption,
} from './add-broadcast-group-members-modal'
import type { BroadcastGroupsLayoutCount } from './broadcast-groups-layout'
import type { BroadcastGroupsGridItem } from './use-broadcast-groups-grid'

type MenuContext = 'pick-layout' | 'group-cell'

type UseBroadcastGroupsPanelActionsOptions = {
  hasLayout: Readonly<Ref<boolean>>
  setLayoutCount: (count: BroadcastGroupsLayoutCount) => void
  clearLayout: () => void | Promise<void>
}

const mapSlotToOption = (slot: {
  order: number
  title: string
  pServed: string
  slotIndex: number
}): AddBroadcastGroupMembersOption => ({
  order: slot.order,
  title: slot.title || `Линия ${slot.order + 1}`,
  pServed: slot.pServed,
  slotIndex: slot.slotIndex,
})

export const useBroadcastGroupsPanelActions = ({
  hasLayout,
  setLayoutCount,
  clearLayout,
}: UseBroadcastGroupsPanelActionsOptions) => {
  const store = usePinnedCallsPanelStore()
  const { groupCells, groupsLayout, slots } = storeToRefs(store)
  const { showDialog } = useDialog<AddBroadcastGroupMembersModalResult | undefined>()
  const { showNotification } = useNotification()

  const isEditMode = ref(false)
  const menuContext = ref<MenuContext>('pick-layout')
  const menuTargetIndex = ref<number | null>(null)

  const hasAnyGroupMembers = computed(() => {
    return groupCells.value.some(cell => (cell.group?.members.length ?? 0) > 0)
  })

  /** Сменить раскладку только пока ни в одной группе нет участников. */
  const canChangeLayout = computed(() => hasLayout.value && !hasAnyGroupMembers.value)

  const selectLayout = (count: BroadcastGroupsLayoutCount) => {
    setLayoutCount(count)
    isEditMode.value = true
    closeMenu()
  }

  const handleChangeLayout = async () => {
    closeMenu()

    try {
      await clearLayout()
    } catch (e) {
      showNotification({
        type: 'error',
        message: e instanceof Error ? e.message : 'Не удалось сбросить раскладку групп',
      })
    }
  }

  const resolveGroupAudioState = (groupIndex: number) => {
    const group = store.getGroupByIndex(groupIndex)

    return {
      micState: group?.micState ?? PINNED_CALLS_GROUP_INITIAL_MIC_STATE,
      volumeState: group?.volumeState ?? true,
      members: group?.members ?? [],
    }
  }

  const openAddMembersModal = async (groupIndex: number) => {
    closeMenu()

    const { micState, volumeState, members } = resolveGroupAudioState(groupIndex)
    const existingKeys = new Set(members.map(member => getPinnedCallGroupMemberKey(member)))

    const options = slots.value
      .filter(slot => !existingKeys.has(getPinnedCallGroupMemberKey(slot)))
      .map(mapSlotToOption)

    if (!options.length) {
      showNotification({
        type: 'error',
        message: existingKeys.size
          ? 'Нет доступных завешенных линий для добавления'
          : 'Сначала добавьте линии на странице завешенных',
      })
      return
    }

    const result = await showDialog(AddBroadcastGroupMembersModal as ComponentOptions, {
      hasOverlay: false,
      options,
      title: 'Добавить бродкаст группу',
      confirmText: 'Добавить',
    })

    if (!result?.members.length) return

    try {
      await store.updateGroup(groupIndex, {
        micState,
        volumeState,
        members: [...members, ...result.members],
      })
    } catch (e) {
      showNotification({
        type: 'error',
        message: e instanceof Error ? e.message : 'Не удалось добавить участников в группу',
      })
    }
  }

  const openEditMembersModal = async (groupIndex: number) => {
    closeMenu()

    const { micState, volumeState, members } = resolveGroupAudioState(groupIndex)

    if (!slots.value.length) {
      showNotification({
        type: 'error',
        message: 'Сначала добавьте линии на странице завешенных',
      })
      return
    }

    const options = slots.value.map(mapSlotToOption)
    const memberKeys = new Set(members.map(member => getPinnedCallGroupMemberKey(member)))
    const initialSelectedOrders = slots.value
      .filter(slot => memberKeys.has(getPinnedCallGroupMemberKey(slot)))
      .map(slot => slot.order)

    const result = await showDialog(AddBroadcastGroupMembersModal as ComponentOptions, {
      hasOverlay: false,
      options,
      initialSelectedOrders,
      title: 'Изменить состав группы',
      confirmText: 'Сохранить',
      allowEmptySelection: true,
    })

    if (!result) return

    try {
      await store.updateGroup(groupIndex, {
        micState,
        volumeState,
        members: result.members,
      })
    } catch (e) {
      showNotification({
        type: 'error',
        message: e instanceof Error ? e.message : 'Не удалось изменить состав группы',
      })
    }
  }

  const clearGroupMembers = async (groupIndex: number) => {
    closeMenu()

    const members = [...resolveGroupAudioState(groupIndex).members]
    if (!members.length) return

    try {
      for (const member of members) {
        await store.removeGroupMember(groupIndex, member)
      }
    } catch (e) {
      showNotification({
        type: 'error',
        message: e instanceof Error ? e.message : 'Не удалось очистить группу',
      })
    }
  }

  const removeMemberFromGroup = async (
    groupIndex: number,
    member: PinnedCallGroupMember,
  ) => {
    try {
      await store.removeGroupMember(groupIndex, member)
    } catch (e) {
      showNotification({
        type: 'error',
        message: e instanceof Error ? e.message : 'Не удалось удалить участника из группы',
      })
    }
  }

  const moveGroup = async (fromIndex: number, toIndex: number) => {
    closeMenu()

    try {
      await store.swapGroups(fromIndex, toIndex)
    } catch (e) {
      showNotification({
        type: 'error',
        message: e instanceof Error ? e.message : 'Не удалось переместить группу',
      })
    }
  }

  const menuItems = computed<ContextMenuItem[]>(() => {
    if (menuContext.value === 'pick-layout') {
      return [
        {
          label: '4 группы',
          icon: 'layoutTilesM',
          dataTest: 'broadcast-layout-menu-4',
          onClick: () => {
            selectLayout(4)
          },
        },
        {
          label: '8 групп',
          icon: 'layoutTilesM',
          dataTest: 'broadcast-layout-menu-8',
          onClick: () => {
            selectLayout(8)
          },
        },
      ]
    }

    const groupIndex = menuTargetIndex.value
    if (groupIndex === null) {
      return []
    }

    const group = store.getGroupByIndex(groupIndex)
    const members = group?.members ?? []
    const items: ContextMenuItem[] = [
      {
        label: 'Добавить участников',
        icon: 'userAddM',
        dataTest: 'broadcast-add-members-menu',
        onClick: () => {
          void openAddMembersModal(groupIndex)
        },
      },
    ]

    if (members.length) {
      items.push({
        label: 'Изменить состав',
        icon: 'editM',
        dataTest: 'broadcast-edit-members-menu',
        onClick: () => {
          void openEditMembersModal(groupIndex)
        },
      })

      const layoutCount = groupsLayout.value
      if (layoutCount != null) {
        const canMoveLeft = groupIndex > 0
        const canMoveRight = groupIndex < layoutCount - 1

        items.push({
          label: 'Переместить влево',
          icon: 'arrowLeft',
          border: 'top',
          disabled: !canMoveLeft,
          dataTest: 'broadcast-move-group-left-menu',
          onClick: () => {
            void moveGroup(groupIndex, groupIndex - 1)
          },
        })

        items.push({
          label: 'Переместить вправо',
          icon: 'arrowRight',
          disabled: !canMoveRight,
          dataTest: 'broadcast-move-group-right-menu',
          onClick: () => {
            void moveGroup(groupIndex, groupIndex + 1)
          },
        })
      }

      items.push({
        label: 'Очистить группу',
        icon: 'trashM',
        iconClass: 'text-comp-menu-item-icon-base-neg',
        border: 'top',
        dataTest: 'broadcast-clear-members-menu',
        onClick: () => {
          void clearGroupMembers(groupIndex)
        },
      })
    }

    if (canChangeLayout.value) {
      items.push({
        label: 'Сменить раскладку',
        icon: 'setSquareM',
        border: 'top',
        dataTest: 'broadcast-change-layout-menu',
        onClick: () => {
          void handleChangeLayout()
        },
      })
    }

    return items
  })

  const {
    menuProps,
    open: openMenu,
    close: closeMenu,
  } = useContextMenu({
    items: menuItems,
    anchorMode: 'cursor',
  })

  const toggleEditMode = () => {
    isEditMode.value = !isEditMode.value
    if (!isEditMode.value) {
      closeMenu()
      menuTargetIndex.value = null
    }
  }

  const enterEditMode = () => {
    if (isEditMode.value) {
      return
    }

    isEditMode.value = true
  }

  const openPickLayoutMenu = (event: MouseEvent) => {
    menuContext.value = 'pick-layout'
    menuTargetIndex.value = null
    openMenu(event)
  }

  const handleGroupCellClick = (item: BroadcastGroupsGridItem, event: MouseEvent) => {
    if (!isEditMode.value || item.disabled) {
      return
    }

    // Пустая ячейка без возможности смены раскладки — сразу модалка добавления.
    if (item.isEmpty && !canChangeLayout.value) {
      void openAddMembersModal(item.index)
      return
    }

    menuContext.value = 'group-cell'
    menuTargetIndex.value = item.index
    openMenu(event)
  }

  const handleRemoveMember = (
    item: BroadcastGroupsGridItem,
    member: PinnedCallGroupMember,
  ) => {
    if (!isEditMode.value || item.disabled) {
      return
    }

    void removeMemberFromGroup(item.index, member)
  }

  const handleMicClick = (item: BroadcastGroupsGridItem) => {
    if (isEditMode.value || item.disabled) return

    const group = store.getGroupByIndex(item.index)
    const nextMicState = !(group?.micState ?? PINNED_CALLS_GROUP_INITIAL_MIC_STATE)

    store.applyGroupAudioToMembers(item.index, { micState: nextMicState })
  }

  const handleSpeakerClick = (item: BroadcastGroupsGridItem) => {
    if (isEditMode.value || item.disabled) return

    const group = store.getGroupByIndex(item.index)
    if (!group) return

    store.applyGroupAudioToMembers(item.index, {
      volumeState: !group.volumeState,
    })
  }

  const handleVolumeChange = (
    item: BroadcastGroupsGridItem,
    volumePercent: number,
  ) => {
    if (isEditMode.value || item.disabled) return

    store.applyGroupAudioToMembers(item.index, {
      volume: Math.min(1, Math.max(0, volumePercent / 100)),
    })
  }

  return {
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
  }
}
