import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import Component from '../ui/AddToGroupCard.vue'


vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: {
      sessions: ref(new Map()),
      getSessionByPServed: vi.fn(),
    },
    usePinnedCallsStore: vi.fn().mockReturnValue({
      activePinnedCall: null,
    }),
  }
})

describe('AddToGroupCard', () => {
  it('renders correctly', async () => {
    const wrapper = mount(Component, {
      props: {
        editMode: true,
        clickable: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    })
    expect(wrapper.html()).toContain('!text-black-700 cursor-not-allowed')
    expect(wrapper.html()).toContain('button')
    await wrapper.setProps({ editMode: false })
    expect(wrapper.html()).not.toContain('button')
  })

  it('renders passive placeholder for non-clickable slots in edit mode', () => {
    const wrapper = mount(Component, {
      props: {
        editMode: true,
        clickable: false,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    })

    expect(wrapper.find('button').exists()).toBe(false)
    const placeholder = wrapper.findAll('div')[1]
    expect(placeholder.classes()).toEqual(expect.arrayContaining([
      'rounded-8',
      'w-full',
      'bg-black-800/60',
    ]))
  })
})
