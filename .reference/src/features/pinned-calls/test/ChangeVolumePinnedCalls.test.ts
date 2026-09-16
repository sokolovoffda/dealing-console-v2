import { mount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import Component from '../ui/ChangeVolumePinnedCall.vue'

vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => ({
      sessions: ref(new Map()),
      getSessionByPServed: vi.fn(),
    }),
    usePinnedCallsStore: vi.fn().mockReturnValue({
      activePinnedCall: null,
      changeVolume: vi.fn(),
    }),
  }
})

const InputSelector = 'input[type="range"]'

describe('ChangeVolumePinnedCall.vue', () => {
  let wrapper: VueWrapper<typeof Component>

  const createComponent = function () {
    wrapper = mount(Component, {
      props: {
        pinnedCall: {
          micState: false,
          order: 1,
          pServed: 'PSERVED',
          volume: 0.5,
          title: 'title',
          prevVolume: 0.3,
          prevMicState: true,
        },
      },
    }) as unknown as VueWrapper<typeof Component>
  }

  it('Set input value by props', async () => {
    createComponent()
    const input = wrapper.get(InputSelector)
    expect((input.element as HTMLInputElement).value).toBe('0.5')
  })

  it('Call method on change input', async () => {
    createComponent()
    const input = wrapper.get(InputSelector)
    const spy = vi.spyOn(wrapper.vm, 'setVolume') 
    await input.setValue('0.2')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
