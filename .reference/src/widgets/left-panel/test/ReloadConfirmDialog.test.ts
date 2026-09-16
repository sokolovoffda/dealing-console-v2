import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

import Component from '../ui/ReloadConfirmDialog.vue'

type TestGlobal = typeof globalThis & {
  __mockCloseDialog: ReturnType<typeof vi.fn>
}

vi.mock('@wui/common-library', () => {
  return {
    closeDialogKey: Symbol('closeDialog'),
    ClickOutside: {},
    WuiBtn: {
      name: 'WuiBtn',
      template: '<button @click="$emit(\'click\')"><slot /></button>',
    },
  }
})

vi.mock('@/shared/utils/safeInject', () => {
  return {
    safeInject: () => (globalThis as TestGlobal).__mockCloseDialog,
  }
})

describe('test ReloadConfirmDialog', () => {
  it('returns false when cancel is clicked', async () => {
    (globalThis as TestGlobal).__mockCloseDialog = vi.fn()
    const wrapper = mount(Component)
    const buttons = wrapper.findAll('button')

    await buttons[0].trigger('click')

    expect((globalThis as TestGlobal).__mockCloseDialog).toHaveBeenCalledWith(false)
  })

  it('returns true when confirm is clicked', async () => {
    (globalThis as TestGlobal).__mockCloseDialog = vi.fn()
    const wrapper = mount(Component)
    const buttons = wrapper.findAll('button')

    await buttons[1].trigger('click')

    expect((globalThis as TestGlobal).__mockCloseDialog).toHaveBeenCalledWith(true)
  })
})
