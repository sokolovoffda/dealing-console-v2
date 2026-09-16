import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { nextTick } from 'vue'

import { useWorkspaceStore } from '@/entities/workspace'

import WorkspaceSwitchers from './WorkspaceSwitchers.vue'

const mocks = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
  routeMock: {
    name: 'Workspace' as string,
    params: {
      workspaceId: 'workspace-1',
    },
  },
  deleteWorkspaceSnapshotMock: vi.fn(),
  showDialogMock: vi.fn(),
}))

vi.mock('@/shared/ui', async () => {
  const { useContextMenu } = await vi.importActual<typeof import('@/shared/ui/context-menu')>('@/shared/ui/context-menu')

  return {
    MyBtn: {
      name: 'MyBtn',
      inheritAttrs: true,
      props: {
        active: {
          type: Boolean,
          default: false,
        },
        disabled: {
          type: Boolean,
          default: false,
        },
      },
      template: '<button :disabled="disabled"><slot /></button>',
    },
    ContextMenu: {
      name: 'ContextMenu',
      props: {
        open: {
          type: Boolean,
          default: false,
        },
        items: {
          type: Array,
          default: () => [],
        },
      },
      emits: ['close'],
      template: `
        <div v-if="open" data-test="workspace-edit-menu">
          <button
            v-for="(item, index) in items"
            :key="item.dataTest ?? index"
            :data-test="item.dataTest"
            @click="item.onClick()"
          >
            {{ item.label }}
          </button>
        </div>
      `,
    },
    useContextMenu,
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => mocks.routeMock,
    useRouter: () => ({
      replace: mocks.routerReplaceMock,
    }),
  }
})

vi.mock('@wui/common-library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wui/common-library')>()

  return {
    ...actual,
    useDialog: () => ({
      showDialog: mocks.showDialogMock,
    }),
    WuiIcon: {
      name: 'WuiIcon',
      template: '<span />',
    },
  }
})

const RouterLinkStub = {
  name: 'RouterLink',
  template: '<div><slot :navigate="() => {}" /></div>',
}

const mountWorkspaceSwitchers = (pinia: ReturnType<typeof createPinia>) => mount(WorkspaceSwitchers, {
  global: {
    plugins: [pinia],
    stubs: {
      RouterLink: RouterLinkStub,
      'router-link': RouterLinkStub,
    },
  },
})

describe('WorkspaceSwitchers', () => {
  beforeEach(() => {
    mocks.routerReplaceMock.mockClear()
    mocks.deleteWorkspaceSnapshotMock.mockClear()
    mocks.showDialogMock.mockReset()
    mocks.showDialogMock.mockResolvedValue(true)
    mocks.routeMock.name = 'Workspace'
    mocks.routeMock.params.workspaceId = 'workspace-1'
  })

  const initStore = () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useWorkspaceStore()

    vi.spyOn(store, 'deleteWorkspaceSnapshot').mockImplementation(mocks.deleteWorkspaceSnapshotMock)
    mocks.deleteWorkspaceSnapshotMock.mockResolvedValue({ draftWorkspaceId: 'draft-workspace-1' })

    return { pinia, store }
  }

  it('opens edit menu for configured workspace in view mode', async () => {
    const { pinia, store } = initStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspaceSwitchers(pinia)

    await wrapper.find('[data-test="workspace-edit-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="workspace-edit-menu"]').exists()).toBe(true)
    expect(store.isWorkspaceEditMode).toBe(false)
  })

  it('starts edit mode from menu item for configured workspace', async () => {
    const { pinia, store } = initStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspaceSwitchers(pinia)

    await wrapper.find('[data-test="workspace-edit-toggle"]').trigger('click')
    await nextTick()
    await wrapper.find('[data-test="workspace-edit-menu-edit"]').trigger('click')
    await nextTick()

    expect(store.isWorkspaceEditMode).toBe(true)
    expect(wrapper.find('[data-test="workspace-edit-menu"]').exists()).toBe(false)
  })

  it('enters edit mode directly for draft workspace', async () => {
    const { pinia, store } = initStore()
    mocks.routeMock.params.workspaceId = 'draft-workspace-1'

    expect(store.getWorkspaceById('draft-workspace-1')).not.toBeNull()

    const wrapper = mountWorkspaceSwitchers(pinia)

    expect(wrapper.find('[data-test="workspace-edit-toggle"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('[data-test="workspace-edit-toggle"]').trigger('click')
    await nextTick()

    expect(store.isWorkspaceEditMode).toBe(true)
    expect(wrapper.find('[data-test="workspace-edit-menu"]').exists()).toBe(false)
  })

  it('exits edit mode on repeated click without opening menu', async () => {
    const { pinia, store } = initStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspaceSwitchers(pinia)
    store.setWorkspaceEditMode(true)
    await nextTick()

    await wrapper.find('[data-test="workspace-edit-toggle"]').trigger('click')
    await nextTick()

    expect(store.isWorkspaceEditMode).toBe(false)
    expect(wrapper.find('[data-test="workspace-edit-menu"]').exists()).toBe(false)
  })

  it('deletes configured workspace and navigates to draft slot', async () => {
    // Arrange
    const { pinia, store } = initStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspaceSwitchers(pinia)

    // Act
    await wrapper.find('[data-test="workspace-edit-toggle"]').trigger('click')
    await nextTick()
    await wrapper.find('[data-test="workspace-edit-menu-delete"]').trigger('click')
    await nextTick()

    // Assert
    expect(mocks.showDialogMock).toHaveBeenCalled()
    expect(mocks.deleteWorkspaceSnapshotMock).toHaveBeenCalledWith('workspace-1')
    expect(mocks.routerReplaceMock).toHaveBeenCalledWith({
      name: 'Workspace',
      params: { workspaceId: 'draft-workspace-1' },
    })
    expect(store.isWorkspaceEditMode).toBe(false)
  })

  it('does not delete workspace when confirm modal is cancelled', async () => {
    // Arrange
    const { pinia, store } = initStore()
    mocks.showDialogMock.mockResolvedValue(undefined)
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspaceSwitchers(pinia)

    // Act
    await wrapper.find('[data-test="workspace-edit-toggle"]').trigger('click')
    await nextTick()
    await wrapper.find('[data-test="workspace-edit-menu-delete"]').trigger('click')
    await nextTick()

    // Assert
    expect(mocks.showDialogMock).toHaveBeenCalled()
    expect(mocks.deleteWorkspaceSnapshotMock).not.toHaveBeenCalled()
    expect(mocks.routerReplaceMock).not.toHaveBeenCalled()
    expect(store.isWorkspaceEditMode).toBe(false)
  })
})
