import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { nextTick } from 'vue'

import ContextMenu from './ContextMenu.vue'
import type { ContextMenuItem } from './types'

vi.mock('@wui/common-library', () => ({
  WuiIcon: {
    name: 'WuiIcon',
    props: ['name'],
    template: '<span data-test="wui-icon" />',
  },
}))

vi.mock('./use-context-menu-position', () => ({
  useContextMenuPosition: () => ({
    position: { value: { left: 12, top: 24 } },
  }),
}))

const createItems = (): ContextMenuItem[] => [
  {
    label: 'Переместить влево',
    icon: 'arrowLeft',
    dataTest: 'menu-move-left',
    onClick: vi.fn(),
  },
  {
    label: 'Удалить',
    icon: 'trashM',
    border: 'top',
    dataTest: 'menu-delete',
    onClick: vi.fn(),
  },
]

const mountContextMenu = (props: Partial<InstanceType<typeof ContextMenu>['$props']> = {}) => mount(ContextMenu, {
  props: {
    open: true,
    items: createItems(),
    ...props,
  },
  global: {
    stubs: {
      teleport: true,
    },
  },
})

describe('ContextMenu', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render menu items when open', () => {
    const wrapper = mountContextMenu()

    expect(wrapper.find('[data-test="context-menu-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="menu-move-left"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="menu-delete"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Переместить влево')
    expect(wrapper.text()).toContain('Удалить')
  })

  it('should apply border class for menu item', () => {
    const wrapper = mountContextMenu()

    expect(wrapper.find('[data-test="menu-delete"]').classes()).toContain('context-menu-item--border-top')
  })

  it('should emit close on backdrop pointerdown', async () => {
    const wrapper = mountContextMenu()

    await wrapper.find('[data-test="context-menu-backdrop"]').trigger('pointerdown')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('should call item onClick and close menu', async () => {
    const items = createItems()
    const wrapper = mountContextMenu({ items })

    await wrapper.find('[data-test="menu-move-left"]').trigger('click')
    await nextTick()
    await nextTick()

    expect(items[0].onClick).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('should not call onClick for disabled item', async () => {
    const items: ContextMenuItem[] = [{
      label: 'Disabled',
      icon: 'userM',
      disabled: true,
      dataTest: 'menu-disabled',
      onClick: vi.fn(),
    }]
    const wrapper = mountContextMenu({ items })

    await wrapper.find('[data-test="menu-disabled"]').trigger('click')

    expect(items[0].onClick).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
