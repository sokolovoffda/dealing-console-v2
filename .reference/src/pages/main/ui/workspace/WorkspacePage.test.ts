import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { nextTick } from 'vue'

import { useWorkspaceStore } from '@/entities/workspace'

import WorkspacePage from './WorkspacePage.vue'

const mocks = vi.hoisted(() => ({
  getWorkspaceWidgetComponentMock: vi.fn((widgetType: string) => ({
    name: `Mock${widgetType}`,
    template: `<div data-test="widget-${widgetType}">${widgetType}</div>`,
  })),
  routerReplaceMock: vi.fn(),
}))

vi.mock('../../model', () => ({
  getWorkspaceWidgetComponent: mocks.getWorkspaceWidgetComponentMock,
}))

vi.mock('@/shared/ui', async () => {
  const { useContextMenu } = await vi.importActual<typeof import('@/shared/ui/context-menu')>('@/shared/ui/context-menu')

  return {
    MyBtn: {
      name: 'MyBtn',
      inheritAttrs: true,
      template: '<button><slot /></button>',
    },
    PanelStatus: {
      name: 'PanelStatus',
      props: {
        loading: {
          type: Boolean,
          default: false,
        },
        message: {
          type: String,
          default: null,
        },
        icon: {
          type: String,
          default: null,
        },
      },
      template: `
        <div v-if="loading || message" data-test="panel-status">
          <span v-if="!loading">{{ message }}</span>
        </div>
        <slot v-else />
      `,
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
        <div v-if="open" data-test="context-menu-panel">
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
    EmptySetupPrompt: {
      name: 'EmptySetupPrompt',
      props: {
        icon: {
          type: String,
          required: true,
        },
        label: {
          type: String,
          required: true,
        },
        dataTest: {
          type: String,
          default: undefined,
        },
      },
      emits: ['click'],
      template: `
        <button
          type="button"
          :data-test="dataTest"
          @click="$emit('click', $event)"
        >
          {{ label }}
        </button>
      `,
    },
    useContextMenu,
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({
      replace: mocks.routerReplaceMock,
    }),
  }
})

const WuiBtnStub = {
  name: 'WuiBtn',
  inheritAttrs: false,
  template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
}

const WuiSelectStub = {
  name: 'WuiSelect',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    items: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  template: `
    <select
      data-test="layout-select"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option
        v-for="item in items"
        :key="item.value"
        :value="item.value"
      >
        {{ item.label }}
      </option>
    </select>
  `,
}

const MyBtnStub = {
  name: 'MyBtn',
  inheritAttrs: true,
  template: '<button><slot /></button>',
}

const ContextMenuStub = {
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
    <div v-if="open" data-test="context-menu-panel">
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
}

const mountWorkspacePage = (workspaceId = 'workspace-1') => mount(WorkspacePage, {
  props: {
    workspaceId,
  },
  global: {
    stubs: {
      WuiBtn: WuiBtnStub,
      MyBtn: MyBtnStub,
      ContextMenu: ContextMenuStub,
      WuiSelect: WuiSelectStub,
      'wui-btn': WuiBtnStub,
      'my-btn': MyBtnStub,
      'context-menu': ContextMenuStub,
      'wui-select': WuiSelectStub,
    },
  },
})

describe('WorkspacePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.getWorkspaceWidgetComponentMock.mockClear()
    mocks.routerReplaceMock.mockClear()
  })

  it('renders workspace widgets according to configured positions', () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'three-equal',
      widgets: [
        { id: 'widget-1', type: 'groups', position: 0 },
        { id: 'widget-2', type: 'history', position: 2 },
      ],
    }]

    const wrapper = mountWorkspacePage()

    expect(mocks.getWorkspaceWidgetComponentMock).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="widget-groups"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="widget-history"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="add-widget-cell"]')).toHaveLength(0)
    expect(wrapper.findAll('.workspace-grid > article')).toHaveLength(3)
    expect(wrapper.find('.workspace-grid').attributes('style')).toContain('--workspace-columns: 1fr 1fr 1fr;')
  })

  it('shows empty grid after selecting layout for draft workspace', async () => {
    const store = useWorkspaceStore()
    const wrapper = mountWorkspacePage('draft-workspace-1')

    store.setWorkspaceEditMode(true)
    await nextTick()

    expect(wrapper.find('[data-test="workspace-layout-picker"]').exists()).toBe(true)
    expect(wrapper.findAll('.workspace-grid > article')).toHaveLength(0)

    await wrapper.find('[data-test="workspace-layout-two-equal"]').trigger('click')
    await nextTick()

    expect(wrapper.findAll('.workspace-grid > article')).toHaveLength(2)
    expect(wrapper.findAll('[data-test="add-widget-cell"]')).toHaveLength(2)
  })

  it('resets layout when leaving edit mode before adding widgets', async () => {
    const store = useWorkspaceStore()
    const wrapper = mountWorkspacePage('draft-workspace-1')

    store.setWorkspaceEditMode(true)
    await nextTick()

    await wrapper.find('[data-test="workspace-layout-two-equal"]').trigger('click')
    await nextTick()

    store.setWorkspaceEditMode(false, 'draft-workspace-1')
    await nextTick()

    expect(store.getWorkspaceById('draft-workspace-1')?.layout).toBeNull()
    expect(wrapper.find('[data-test="workspace-empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="workspace-layout-picker"]').exists()).toBe(false)
  })

  it('keeps layout when leaving edit mode with widgets', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspacePage()
    store.setWorkspaceEditMode(true)
    await nextTick()

    store.setWorkspaceEditMode(false, 'workspace-1')
    await nextTick()

    expect(store.getWorkspaceById('workspace-1')?.layout).toBe('two-equal')
    expect(wrapper.find('[data-test="widget-groups"]').exists()).toBe(true)
  })

  it('opens context menu with available widgets for empty cell', async () => {
    const store = useWorkspaceStore()
    const wrapper = mountWorkspacePage('draft-workspace-1')

    store.setWorkspaceEditMode(true)
    await nextTick()

    await wrapper.find('[data-test="workspace-layout-two-equal"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="context-menu-panel"]').exists()).toBe(false)

    await wrapper.find('[data-test="add-widget-cell"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="context-menu-panel"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test^="add-widget-menu-"]')).toHaveLength(5)
    expect(wrapper.find('[data-test="workspace-change-layout-menu"]').exists()).toBe(true)
  })

  it('disables widget interaction in edit mode', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspacePage()
    store.setWorkspaceEditMode(true)
    await nextTick()

    expect(wrapper.find('[data-test="widget-groups"]').classes()).toContain('pointer-events-none')
  })

  it('opens widget context menu with move and delete actions', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [{ id: 'widget-1', type: 'groups', position: 0 }],
    }]

    const wrapper = mountWorkspacePage()
    store.setWorkspaceEditMode(true)
    await nextTick()

    await wrapper.find('[data-test="workspace-grid-cell-0"] > div').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="workspace-widget-menu-move-right"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="workspace-widget-menu-delete"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="replace-widget-menu-history"]').exists()).toBe(true)
  })

  it('calls moveWorkspaceWidget when move action is selected', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [{
      id: 'workspace-1',
      order: 0,
      layout: 'two-equal',
      widgets: [
        { id: 'widget-1', type: 'groups', position: 0 },
        { id: 'widget-2', type: 'history', position: 1 },
      ],
    }]

    const moveWorkspaceWidgetSpy = vi.spyOn(store, 'moveWorkspaceWidget').mockResolvedValue(null)
    const wrapper = mountWorkspacePage()
    store.setWorkspaceEditMode(true)
    await nextTick()

    await wrapper.find('[data-test="workspace-grid-cell-1"] > div').trigger('click')
    await nextTick()
    await wrapper.find('[data-test="workspace-widget-menu-move-left"]').trigger('click')
    await nextTick()

    expect(moveWorkspaceWidgetSpy).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      position: 1,
      direction: 'left',
    })
    expect(wrapper.find('[data-test="context-menu-panel"]').exists()).toBe(false)
  })

  it('renders not found state when workspace is missing', () => {
    const wrapper = mountWorkspacePage('missing-workspace')

    expect(wrapper.text()).toContain('Рабочий стол не найден')
  })
})
