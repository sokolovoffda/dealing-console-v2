import type {
  Workspace,
  WorkspaceLayout,
  WorkspaceLayoutColumn,
  WorkspaceSchemaVersion,
} from '@/entities/workspace'

type WorkspaceViewModel = Workspace & {
  columns: Array<WorkspaceLayoutColumn>
}

type WorkspacesDto = {
  schemaVersion: WorkspaceSchemaVersion
  workspaces: Array<Workspace>
}

export const mockWorkspacesDto: WorkspacesDto = {
  schemaVersion: 1,
  workspaces: [
    {
      id: 'workspace-1',
      order: 0,
      layout: 'three-equal',
      widgets: [
        {
          id: 'workspace-1-widget-1',
          type: 'contacts',
          position: 0,
        },
        {
          id: 'workspace-1-widget-2',
          type: 'history',
          position: 1,
        },
        {
          id: 'workspace-1-widget-3',
          type: 'activityMonitor',
          position: 2,
        },
      ],
    },
    {
      id: 'workspace-2',
      order: 1,
      layout: 'two-left-narrow',
      widgets: [
        {
          id: 'workspace-2-widget-1',
          type: 'activityMonitor',
          position: 0,
        },
        {
          id: 'workspace-2-widget-2',
          type: 'phonebook',
          position: 1,
        },
      ],
    },
    {
      id: 'workspace-3',
      order: 2,
      layout: 'two-equal',
      widgets: [
        {
          id: 'workspace-3-widget-1',
          type: 'groups',
          position: 0,
        },
        {
          id: 'workspace-3-widget-2',
          type: 'contacts',
          position: 1,
        },
      ],
    },
  ],
}

const workspaceColumnsByLayout: Record<WorkspaceLayout, Array<Omit<WorkspaceLayoutColumn, 'id'>>> = {
  'two-equal': [
    { widthLabel: '50%', templateWidth: '1fr' },
    { widthLabel: '50%', templateWidth: '1fr' },
  ],
  'two-left-narrow': [
    { widthLabel: '33%', templateWidth: '1fr' },
    { widthLabel: '67%', templateWidth: '2fr' },
  ],
  'two-right-narrow': [
    { widthLabel: '67%', templateWidth: '2fr' },
    { widthLabel: '33%', templateWidth: '1fr' },
  ],
  'three-equal': [
    { widthLabel: '33%', templateWidth: '1fr' },
    { widthLabel: '33%', templateWidth: '1fr' },
    { widthLabel: '33%', templateWidth: '1fr' },
  ],
}

export const mockWorkspaces: Array<WorkspaceViewModel> = mockWorkspacesDto.workspaces.map((workspace) => ({
  ...workspace,
  columns: workspaceColumnsByLayout[workspace.layout].map((column, index) => ({
    id: `${workspace.id}-column-${index + 1}`,
    ...column,
  })),
}))

export const getWorkspaceById = (workspaceId: string) => {
  return mockWorkspaces.find(({ id }) => id === workspaceId)
}
