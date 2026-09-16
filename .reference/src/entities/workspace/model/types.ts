export type WorkspaceSchemaVersion = 1

export type WorkspaceLayout =
  | 'two-equal'
  | 'two-left-narrow'
  | 'two-right-narrow'
  | 'three-equal'

export type WorkspaceWidgetType =
  | 'contacts'
  | 'pinnedCalls'
  | 'groups'
  | 'activityMonitor'
  | 'history'
  | 'phonebook'

export type WorkspaceWidgetPosition = 0 | 1 | 2

export type WorkspaceWidget = {
  id: string
  type: WorkspaceWidgetType
  position: WorkspaceWidgetPosition
}

export type CreateWorkspaceWidgetDto = Omit<WorkspaceWidget, 'id'>

export type UpdateWorkspaceWidgetDto = CreateWorkspaceWidgetDto & {
  id?: string
}

export type Workspace = {
  id: string
  order: number
  layout: WorkspaceLayout
  widgets: Array<WorkspaceWidget>
}

export type CreateWorkspaceSnapshotDto = {
  order: number
  layout: WorkspaceLayout
  widgets: Array<CreateWorkspaceWidgetDto>
}

export type UpdateWorkspaceSnapshotDto = Omit<Workspace, 'widgets'> & {
  widgets: Array<UpdateWorkspaceWidgetDto>
}

export type WorkspaceSnapshotDto = Workspace

export type WorkspaceDraft = {
  id: string
  order: number
  layout: WorkspaceLayout | null
  widgets: []
  isDraft: true
}

export type WorkspaceStateItem = Workspace | WorkspaceDraft

export type WorkspaceLayoutColumn = {
  id: string
  widthLabel: string
  templateWidth: string
}

export type WorkspaceViewModel = WorkspaceStateItem & {
  columns: Array<WorkspaceLayoutColumn>
}

export type WorkspaceSnapshotsDto = {
  schemaVersion: WorkspaceSchemaVersion
  snapshots: Array<WorkspaceSnapshotDto>
}
