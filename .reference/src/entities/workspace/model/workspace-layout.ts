import type { WorkspaceLayout, WorkspaceLayoutColumn } from '@/entities/workspace'

export type WorkspaceLayoutOption = {
  value: WorkspaceLayout
  previewFlex: Array<number>
}

export const WORKSPACE_LAYOUT_OPTIONS: Array<WorkspaceLayoutOption> = [
  {
    value: 'two-equal',
    previewFlex: [1, 1],
  },
  {
    value: 'two-right-narrow',
    previewFlex: [2, 1],
  },
  {
    value: 'two-left-narrow',
    previewFlex: [1, 2],
  },
  {
    value: 'three-equal',
    previewFlex: [1, 1, 1],
  },
]

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

export const getWorkspaceColumns = (
  workspaceId: string,
  layout: WorkspaceLayout | null,
): Array<WorkspaceLayoutColumn> => {
  if (!layout) return []

  return workspaceColumnsByLayout[layout].map((column, index) => ({
    id: `${workspaceId}-column-${index + 1}`,
    ...column,
  }))
}
