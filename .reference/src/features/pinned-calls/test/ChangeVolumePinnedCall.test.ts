import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import Component from '../ui/ChangeVolumePinnedCall.vue'

vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: {
      sessions: ref(new Map()),
      getSessionByPServed: vi.fn(),
    },
    usePinnedCallsStore: vi.fn().mockReturnValue({
      activePinnedCall: null,
      changeVolume: vi.fn(),
    }),
  }
})

describe('ChangeVolumePinnedCall.vue', () => {
  it('test change event', async () => {
    const wrapper = mount(Component, {
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
    })
    const input = wrapper.find('input')
    expect(input.element.value).toBe('0.5')
  })
})
