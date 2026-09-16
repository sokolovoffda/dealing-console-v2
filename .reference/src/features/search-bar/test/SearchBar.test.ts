import { mount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import Component from '../ui/SearchBar.vue'

const i18n = createI18n({
  // Опции i18n
})

vi.mock('@/entities/call-session', () => ({
  useSessionStore: () => ({}),
}))
vi.mock('@/shared/services', () => {
  return {
    IDB: {
      getAll: () => Promise.resolve([]),
    },
    OBJECT_STORE_NAME_EXTERNAL: 'EXTERNAL',
    OBJECT_STORE_NAME_FAVORITES: 'FAVORITES',
    contactNumberToPServed: () => vi.fn(),
  }
})

describe('Test SearchBar', () => {
  let wrapper: VueWrapper<typeof Component>

  const createComponent = function () {
    const $t = (key: string) => key
    wrapper = mount(Component, {
      props: {
        modelValue: 'test',
      },
      global: {
        provide: {
          $t,
        },
        plugins: [i18n],
      },
    }) as unknown as VueWrapper<typeof Component>
  }

  it('Should have correct default options', async () => {
    createComponent()
    const VM = wrapper.vm
    expect(VM.modelValue).toBe('test')
    await wrapper.setProps({ modelValue: 'new value' })
    expect(VM.modelValue).toBe('new value')
  })
})
