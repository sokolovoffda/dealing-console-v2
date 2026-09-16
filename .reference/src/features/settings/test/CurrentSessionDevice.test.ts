import { mount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { RTCSessionFacade } from '@/entities/call-session'

import Component from '../toggle-media-device/CurrentSessionDevice.vue'

vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => ({}),
    usePinnedCallsStore: () => ({
      isPServedSession: () => false,
    }),
  }
})
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

describe('test current session media device', () => {

  it('test computed getIcon and iconNumber expected headsetMic and ""', async () => {
    const wrapper = mount(Component, {
      props: {
        session: <RTCSessionFacade>{
          currentDevice: ref({ icon: 'headsetMic' }),
        },
      },
    }) as unknown as VueWrapper<typeof Component>
    const VM = wrapper.vm
    expect(VM.getIcon).toEqual('headsetMic')
    expect(VM.iconNumber).toEqual('')
  })

  it('test active props', async () => {
    const wrapper = mount(Component, {
      props: {
        session: <RTCSessionFacade>{
          currentDevice: ref({ icon: 'micSpeaker' }),
        },
        active: true,
      },
    }) as unknown as VueWrapper<typeof Component>
    expect(wrapper.html()).toContain('active')
    await wrapper.setProps({ active: false })
    expect(wrapper.html()).not.toContain('active')
  })
})
