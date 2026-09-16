import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import Component from '../ui/RemoveFromPinnedCalls.vue'

vi.mock('@/entities/call-session', () => {
  return {
    usePinnedCallsStore: vi.fn().mockReturnValue({
      activePinnedCall: ref(true),
      removeSelected: vi.fn(),
    }),
    useSessionStore: () => ({}),
  }
})
vi.mock('@/shared/services', () => {
  return {
    IDB: {
      getAll: () => Promise.resolve([]),
      isReady: ref(true),
    },
    OBJECT_STORE_NAME_EXTERNAL: 'EXTERNAL',
    OBJECT_STORE_NAME_FAVORITES: 'FAVORITES',
    contactNumberToPServed: () => vi.fn(),
  }
})

const navigatorMock = {
  mediaDevices: {
    enumerateDevices: () => Promise.resolve([]),
    addEventListener: () => vi.fn(),
  },
};

(global.navigator.mediaDevices as any) = navigatorMock.mediaDevices

const removeSelector = '[data-test="remove-btn"]'

describe('RemoveFromPinnedCalls.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  let wrapper: VueWrapper<typeof Component>

  const createComponent = function () {
    wrapper = mount(Component) as VueWrapper<typeof Component>
  }

  it('Call method on click btn ', async () => {
    createComponent()
    const spy = vi.spyOn(wrapper.vm, 'removePinnedCall')
    await wrapper.get(removeSelector).trigger('click')
    expect(spy).toHaveBeenCalled()
  })
})
