/* eslint-disable vue/one-component-per-file, vue/require-default-prop */
import { shallowMount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { defineComponent } from 'vue'

const mockedState = vi.hoisted(() => ({
  gooseDevice: {
    id: 'goose_L1',
    mode: 'stateful',
    module: 'goose_L1',
  } as { id: string, mode: string, module?: string },
  isEnabled: true,
  handleGooseSpeakPress: vi.fn(),
  handleGooseSpeakRelease: vi.fn(),
}))

vi.mock('@/shared/composables', () => ({
  useDevicesStore: () => ({
    readyPreferredGoose: mockedState.gooseDevice,
  }),
  useDevicesSessionsStore: () => ({
    isGooseMicGloballyEnabled: vi.fn(() => mockedState.isEnabled),
  }),
}))

vi.mock('@/shared/controller', () => ({
  handleGooseSpeakPress: mockedState.handleGooseSpeakPress,
  handleGooseSpeakRelease: mockedState.handleGooseSpeakRelease,
}))

vi.mock('@/shared/ui', () => ({
  MyBtn: {
    name: 'MyBtn',
    template: '<slot />',
  },
}))

import Component from '../ui/GlobalAppMicrophoneControl.vue'

const MyBtnStub = defineComponent({
  name: 'MyBtn',
  props: {
    icon: Boolean,
    mode: String,
    size: Number,
    variant: String,
    tone: String,
    active: Boolean,
    prependIcon: String,
    disabled: Boolean,
  },
  emits: ['click', 'pointerdown', 'pointerup', 'pointerleave', 'pointercancel'],
  template: `
    <button
      data-test="microphone-btn"
      :disabled="disabled"
      @click="$emit('click', $event)"
      @pointerdown="$emit('pointerdown', $event)"
      @pointerup="$emit('pointerup', $event)"
      @pointerleave="$emit('pointerleave', $event)"
      @pointercancel="$emit('pointercancel', $event)"
    />
  `,
})

describe('GlobalAppMicrophoneControl.vue', () => {
  let wrapper: VueWrapper

  const createComponent = () => {
    wrapper = shallowMount(Component, {
      global: {
        stubs: {
          MyBtn: MyBtnStub,
        },
      },
    })
  }

  beforeEach(() => {
    mockedState.gooseDevice.id = 'goose_L1'
    mockedState.gooseDevice.mode = 'stateful'
    mockedState.gooseDevice.module = 'goose_L1'
    mockedState.isEnabled = true
    mockedState.handleGooseSpeakPress.mockClear()
    mockedState.handleGooseSpeakRelease.mockClear()
  })

  it('shows enabled microphone button state by default', () => {
    createComponent()

    const button = wrapper.getComponent(MyBtnStub)

    expect(button.props()).toMatchObject({
      mode: 'toggle',
      variant: 'neutcon',
      tone: 'dark',
      active: false,
      prependIcon: 'micControlM',
      disabled: false,
    })
  })

  it('shows muted microphone button state when goose mic is disabled', () => {
    mockedState.isEnabled = false
    createComponent()

    const button = wrapper.getComponent(MyBtnStub)

    expect(button.props()).toMatchObject({
      variant: 'negcon',
      tone: 'base',
      active: false,
      prependIcon: 'micOffM',
    })
  })

  it('toggles microphone on click for non-ptt goose', async () => {
    createComponent()

    await wrapper.get('[data-test="microphone-btn"]').trigger('click')

    expect(mockedState.handleGooseSpeakPress).not.toHaveBeenCalled()
    expect(mockedState.handleGooseSpeakRelease).toHaveBeenCalledWith(
      mockedState.gooseDevice,
      'goose_L1',
    )
  })

  it('uses pointer press and release for ptt goose', async () => {
    mockedState.gooseDevice.mode = 'pushToTalk'
    createComponent()

    const button = wrapper.get('[data-test="microphone-btn"]')

    await button.trigger('pointerdown')
    expect(wrapper.getComponent(MyBtnStub).props('active')).toBe(true)
    await button.trigger('pointerup')
    expect(wrapper.getComponent(MyBtnStub).props('active')).toBe(false)

    expect(mockedState.handleGooseSpeakPress).toHaveBeenCalledWith(
      mockedState.gooseDevice,
      'goose_L1',
    )
    expect(mockedState.handleGooseSpeakRelease).toHaveBeenCalledWith(
      mockedState.gooseDevice,
      'goose_L1',
    )
  })

  it('disables button when goose is unavailable', () => {
    mockedState.gooseDevice = undefined as never
    createComponent()

    const button = wrapper.getComponent(MyBtnStub)

    expect(button.props('disabled')).toBe(true)
  })
})
