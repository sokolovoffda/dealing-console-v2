import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type {
  CreateWorkspaceSnapshotDto,
  UpdateWorkspaceSnapshotDto,
  WorkspaceDraft,
  WorkspaceLayout,
  WorkspaceSnapshotDto,
  WorkspaceStateItem,
  WorkspaceViewModel,
  WorkspaceWidgetPosition,
  WorkspaceWidgetType,
} from '@/entities/workspace'
import { getWorkspaceColumns, useWorkspaceApi } from '@/entities/workspace'

const WORKSPACES_COUNT = 5

type AddWorkspaceWidgetPayload = {
  workspaceId: string
  type: WorkspaceWidgetType
  position: WorkspaceWidgetPosition
}

type RemoveWorkspaceWidgetPayload = {
  workspaceId: string
  position: WorkspaceWidgetPosition
}

type RemoveWorkspaceWidgetResult = {
  draftWorkspaceId: string
}

type MoveWorkspaceWidgetPayload = {
  workspaceId: string
  position: WorkspaceWidgetPosition
  direction: 'left' | 'right'
}

type ReplaceWorkspaceWidgetPayload = {
  workspaceId: string
  position: WorkspaceWidgetPosition
  type: WorkspaceWidgetType
}

type DeleteWorkspaceSnapshotResult = {
  draftWorkspaceId: string
}

export const useWorkspaceStore = defineStore('workspace-store', () => {
  const workspaces = ref<Array<WorkspaceSnapshotDto>>([])
  const workspaceLayouts = ref<Record<string, WorkspaceLayout>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)
  const isWorkspaceEditMode = ref(false)
  const isHeaderHidden = ref(false)

  const workspaceSlots = computed<Array<WorkspaceStateItem>>(() => {
    return Array.from({ length: WORKSPACES_COUNT }, (_, order) => {
      const workspace = workspaces.value.find(item => item.order === order)

      if (workspace) {
        const layout = workspaceLayouts.value[workspace.id]

        if (layout) {
          return {
            ...workspace,
            layout,
            widgets: [],
          }
        }

        return workspace
      }

      const draftId = `draft-workspace-${order + 1}`

      return {
        id: draftId,
        order,
        layout: workspaceLayouts.value[draftId] ?? null,
        widgets: [],
        isDraft: true,
      } satisfies WorkspaceDraft
    })
  })

  const workspaceViewModels = computed<Array<WorkspaceViewModel>>(() => {
    return workspaceSlots.value.map(workspace => ({
      ...workspace,
      columns: getWorkspaceColumns(workspace.id, workspace.layout),
    }))
  })

  const hasWorkspaces = computed(() => {
    return workspaces.value.length > 0
  })

  const getWorkspaceById = (workspaceId: string): WorkspaceViewModel | null => {
    return workspaceViewModels.value.find(workspace => workspace.id === workspaceId) ?? null
  }

  const initWorkspaces = async (force = false) => {
    if (isInitialized.value && !force) return

    const api = useWorkspaceApi()

    try {
      loading.value = true
      error.value = null

      const { data } = await api.fetchSnapshots()
      workspaces.value = [...data.snapshots].sort((a, b) => a.order - b.order)
      workspaceLayouts.value = {}

      isInitialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load workspaces'
      workspaces.value = []
      isInitialized.value = false
    } finally {
      loading.value = false
    }
  }

  const refreshWorkspaces = async () => {
    await initWorkspaces(true)
  }

  const createSnapshot = async (snapshot: CreateWorkspaceSnapshotDto): Promise<WorkspaceSnapshotDto> => {
    const api = useWorkspaceApi()
    const { data } = await api.createSnapshot(snapshot)

    workspaces.value = [
      ...workspaces.value.filter(workspace => workspace.id !== data.id),
      data,
    ].sort((a, b) => a.order - b.order)
    delete workspaceLayouts.value[data.id]

    return data
  }

  const updateSnapshot = async (snapshot: UpdateWorkspaceSnapshotDto): Promise<WorkspaceSnapshotDto> => {
    const api = useWorkspaceApi()
    const { data } = await api.updateSnapshot(snapshot)

    workspaces.value = workspaces.value
      .map(workspace => workspace.id === data.id ? data : workspace)
      .sort((a, b) => a.order - b.order)
    delete workspaceLayouts.value[data.id]

    return data
  }

  const deleteSnapshot = async (snapshotId: string) => {
    const api = useWorkspaceApi()
    await api.deleteSnapshot(snapshotId)

    workspaces.value = workspaces.value.filter(workspace => workspace.id !== snapshotId)
    delete workspaceLayouts.value[snapshotId]
  }

  const deleteWorkspaceSnapshot = async (workspaceId: string): Promise<DeleteWorkspaceSnapshotResult | null> => {
    const workspace = getWorkspaceById(workspaceId)

    if (!workspace || 'isDraft' in workspace) {
      return null
    }

    const draftWorkspaceId = `draft-workspace-${workspace.order + 1}`

    await deleteSnapshot(workspace.id)
    delete workspaceLayouts.value[draftWorkspaceId]

    return { draftWorkspaceId }
  }

  const setWorkspaceLayout = (workspaceId: string, layout: WorkspaceLayout) => {
    workspaceLayouts.value[workspaceId] = layout
  }

  const clearWorkspaceLayout = (workspaceId: string) => {
    delete workspaceLayouts.value[workspaceId]
  }

  const resetWorkspaceLayoutIfNoWidgets = (workspaceId: string) => {
    const workspace = getWorkspaceById(workspaceId)

    if (!workspace?.widgets.length) {
      delete workspaceLayouts.value[workspaceId]
    }
  }

  const setWorkspaceEditMode = (value: boolean, workspaceId?: string) => {
    if (!value && workspaceId) {
      resetWorkspaceLayoutIfNoWidgets(workspaceId)
    }

    isWorkspaceEditMode.value = value
  }

  const toggleWorkspaceEditMode = (workspaceId?: string) => {
    setWorkspaceEditMode(!isWorkspaceEditMode.value, workspaceId)
  }

  const toggleHeaderVisibility = () => {
    isHeaderHidden.value = !isHeaderHidden.value
  }

  const addWorkspaceWidget = async ({
    workspaceId,
    type,
    position,
  }: AddWorkspaceWidgetPayload): Promise<WorkspaceSnapshotDto | null> => {
    const workspace = getWorkspaceById(workspaceId)

    if (!workspace?.layout || workspace.widgets.some(widget => widget.type === type)) {
      return null
    }

    const widgets = [
      ...workspace.widgets.filter(widget => widget.position !== position),
      { type, position },
    ].sort((a, b) => a.position - b.position)

    if ('isDraft' in workspace) {
      const snapshot = await createSnapshot({
        order: workspace.order,
        layout: workspace.layout,
        widgets,
      })

      delete workspaceLayouts.value[workspace.id]

      return snapshot
    }

    return updateSnapshot({
      id: workspace.id,
      order: workspace.order,
      layout: workspace.layout,
      widgets,
    })
  }

  const removeWorkspaceWidget = async ({
    workspaceId,
    position,
  }: RemoveWorkspaceWidgetPayload): Promise<RemoveWorkspaceWidgetResult | null> => {
    const workspace = getWorkspaceById(workspaceId)

    if (!workspace || 'isDraft' in workspace) return null

    const widgets = workspace.widgets.filter(widget => widget.position !== position)

    if (widgets.length) {
      await updateSnapshot({
        id: workspace.id,
        order: workspace.order,
        layout: workspace.layout,
        widgets,
      })
      return null
    }

    const draftId = `draft-workspace-${workspace.order + 1}`
    const layout = workspace.layout

    await deleteSnapshot(workspace.id)

    workspaceLayouts.value[draftId] = layout

    return { draftWorkspaceId: draftId }
  }

  const moveWorkspaceWidget = async ({
    workspaceId,
    position,
    direction,
  }: MoveWorkspaceWidgetPayload): Promise<WorkspaceSnapshotDto | null> => {
    const workspace = getWorkspaceById(workspaceId)

    if (!workspace?.layout || 'isDraft' in workspace) {
      return null
    }

    const targetPosition = (direction === 'left' ? position - 1 : position + 1) as WorkspaceWidgetPosition

    if (targetPosition < 0 || targetPosition >= workspace.columns.length) {
      return null
    }

    const widget = workspace.widgets.find(item => item.position === position)

    if (!widget) {
      return null
    }

    const neighbor = workspace.widgets.find(item => item.position === targetPosition)

    const widgets = workspace.widgets
      .filter(item => item.position !== position && item.position !== targetPosition)
      .map(item => ({ type: item.type, position: item.position }))

    if (neighbor) {
      widgets.push({ type: neighbor.type, position })
      widgets.push({ type: widget.type, position: targetPosition })
    } else {
      widgets.push({ type: widget.type, position: targetPosition })
    }

    widgets.sort((a, b) => a.position - b.position)

    return updateSnapshot({
      id: workspace.id,
      order: workspace.order,
      layout: workspace.layout,
      widgets,
    })
  }

  const replaceWorkspaceWidget = async ({
    workspaceId,
    position,
    type,
  }: ReplaceWorkspaceWidgetPayload): Promise<WorkspaceSnapshotDto | null> => {
    const workspace = getWorkspaceById(workspaceId)

    if (!workspace?.layout || 'isDraft' in workspace) {
      return null
    }

    const widget = workspace.widgets.find(item => item.position === position)

    if (!widget || widget.type === type) {
      return null
    }

    if (workspace.widgets.some(item => item.type === type)) {
      return null
    }

    const widgets = workspace.widgets
      .map(item => item.position === position
        ? { type, position: item.position }
        : { type: item.type, position: item.position })
      .sort((a, b) => a.position - b.position)

    return updateSnapshot({
      id: workspace.id,
      order: workspace.order,
      layout: workspace.layout,
      widgets,
    })
  }

  return {
    workspaces,
    loading,
    error,
    isInitialized,
    isWorkspaceEditMode,
    isHeaderHidden,
    workspaceSlots,
    workspaceViewModels,
    hasWorkspaces,
    getWorkspaceById,
    initWorkspaces,
    refreshWorkspaces,
    createSnapshot,
    updateSnapshot,
    deleteSnapshot,
    deleteWorkspaceSnapshot,
    setWorkspaceLayout,
    clearWorkspaceLayout,
    setWorkspaceEditMode,
    toggleWorkspaceEditMode,
    toggleHeaderVisibility,
    addWorkspaceWidget,
    removeWorkspaceWidget,
    moveWorkspaceWidget,
    replaceWorkspaceWidget,
    $reset: () => {
      workspaces.value = []
      workspaceLayouts.value = {}
      loading.value = false
      error.value = null
      isInitialized.value = false
      isWorkspaceEditMode.value = false
      isHeaderHidden.value = false
    },
  }
})
