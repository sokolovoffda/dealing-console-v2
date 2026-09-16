import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import type { WorkspaceSnapshotDto } from './types'
import { useWorkspaceStore } from './use-workspace-store'

const mocks = vi.hoisted(() => ({
  fetchSnapshots: vi.fn(),
  createSnapshot: vi.fn(),
  updateSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
}))

vi.mock('../api/use-workspace-api', () => ({
  useWorkspaceApi: () => ({
    fetchSnapshots: mocks.fetchSnapshots,
    createSnapshot: mocks.createSnapshot,
    updateSnapshot: mocks.updateSnapshot,
    deleteSnapshot: mocks.deleteSnapshot,
  }),
}))

const workspaceSnapshot: WorkspaceSnapshotDto = {
  id: 'workspace-1',
  order: 0,
  layout: 'two-equal',
  widgets: [
    { id: 'widget-1', type: 'groups', position: 0 },
    { id: 'widget-2', type: 'history', position: 1 },
  ],
}

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.fetchSnapshots.mockReset()
    mocks.createSnapshot.mockReset()
    mocks.updateSnapshot.mockReset()
    mocks.deleteSnapshot.mockReset()

    mocks.updateSnapshot.mockImplementation(async (snapshot) => ({
      data: {
        ...snapshot,
        widgets: snapshot.widgets.map((widget: { id?: string, type: string, position: number }, index: number) => ({
          id: widget.id ?? `widget-${index + 1}`,
          type: widget.type,
          position: widget.position,
        })),
      },
    }))

    mocks.deleteSnapshot.mockResolvedValue({ data: undefined })
  })

  it('should swap widgets when moving left', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [structuredClone(workspaceSnapshot)]

    await store.moveWorkspaceWidget({
      workspaceId: 'workspace-1',
      position: 1,
      direction: 'left',
    })

    expect(mocks.updateSnapshot).toHaveBeenCalledWith({
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [
        { type: 'history', position: 0 },
        { type: 'groups', position: 1 },
      ],
    })
  })

  it('should move widget to empty cell when moving right', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'three-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    await store.moveWorkspaceWidget({
      workspaceId: 'workspace-1',
      position: 0,
      direction: 'right',
    })

    expect(mocks.updateSnapshot).toHaveBeenCalledWith({
      id: 'workspace-1',
      order: 0,
      layout: 'three-equal',
      widgets: [{ type: 'groups', position: 1 }],
    })
  })

  it('should replace widget type on the same position', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    await store.replaceWorkspaceWidget({
      workspaceId: 'workspace-1',
      position: 0,
      type: 'history',
    })

    expect(mocks.updateSnapshot).toHaveBeenCalledWith({
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ type: 'history', position: 0 }],
    })
  })

  it('should delete configured workspace snapshot and return draft id', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [structuredClone(workspaceSnapshot)]

    const result = await store.deleteWorkspaceSnapshot('workspace-1')

    expect(mocks.deleteSnapshot).toHaveBeenCalledWith('workspace-1')
    expect(result).toEqual({ draftWorkspaceId: 'draft-workspace-1' })
    expect(store.getWorkspaceById('workspace-1')).toBeNull()
  })

  it('should convert workspace to draft when removing last widget', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const result = await store.removeWorkspaceWidget({
      workspaceId: 'workspace-1',
      position: 0,
    })

    expect(mocks.deleteSnapshot).toHaveBeenCalledWith('workspace-1')
    expect(result).toEqual({ draftWorkspaceId: 'draft-workspace-1' })
    expect(store.getWorkspaceById('draft-workspace-1')?.layout).toBe('two-equal')
  })
})
