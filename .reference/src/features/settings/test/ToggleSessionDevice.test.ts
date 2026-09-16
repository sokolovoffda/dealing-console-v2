import { createTestingPinia } from '@pinia/testing'
import { mount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { RTCSessionFacade } from '@/entities/call-session'

import { LogicalMediaDeviceTypeEnum, type LogicalMediaDevice } from '@/shared/composables'

import Component from '../toggle-media-device/ToggleSessionDevice.vue'

vi.mock('@/entities/call-session', () => ({
  useSessionStore: () => ({
    useAutoAnswer: vi.fn(),
  }),
}))

const navigatorMock = {
  mediaDevices: {
    enumerateDevices: () => Promise.resolve([]),
    addEventListener: () => vi.fn(),
  },
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  configurable: true,
  value: navigatorMock.mediaDevices,
})

const btnSelector = '[data-test="select-device-btn"]'

describe('ToggleSessionDevice.vue', () => {
  let wrapper: VueWrapper<typeof Component>
  const mockMediaDevice: LogicalMediaDevice = {
    id: 'id',
    name: 'name',
    icon: 'headsetMic',
    iconNumber: '',
    order: 1,
    inputId: 'inputId',
    outputId: 'outputID',
    type: LogicalMediaDeviceTypeEnum.GOOSE,
    module: 'Module_R1',
    origin: 'controller',
    hasInput: true,
    hasOutput: true,
    status: 'ready',
    enabled: true,
    volume: 50,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }

  const createComponent = function () {
    wrapper = mount(Component, {
      props: {
        item: mockMediaDevice,
        session: {
          currentDevice: ref(mockMediaDevice),
          setCurrentDevice: vi.fn(),
        } as unknown as RTCSessionFacade,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    }) as unknown as VueWrapper<typeof Component>
  }

  it('Test class & device icon', async () => {
    createComponent()
    expect(wrapper.get(btnSelector).classes()).toContain('!bg-black-865')
    const VM = wrapper.vm
    expect(VM.item.icon).toEqual('headsetMic')
    expect(VM.item.iconNumber).toEqual('')

    await wrapper.setProps({
      item: {
        ...mockMediaDevice,
        icon: 'phone',
        iconNumber: '1',
      },
    })
    expect(VM.item.icon).toEqual('phone')
    expect(VM.item.iconNumber).toEqual('1')
  })

  it('Call method on click btn ', async () => {
    createComponent()
    const spy = vi.spyOn(wrapper.vm, 'changeSessionDevice')
    await wrapper.get(btnSelector).trigger('click')
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveReturnedWith(true)
  })
})
