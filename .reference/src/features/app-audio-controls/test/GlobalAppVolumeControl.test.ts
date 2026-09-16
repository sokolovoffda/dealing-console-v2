/* eslint-disable vue/one-component-per-file, vue/require-default-prop */
import { shallowMount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { defineComponent } from 'vue'

vi.mock('@/shared/ui', () => ({
  MyBtn: {
    name: 'MyBtn',
    template: '<slot />',
  },
}))

import Component from '../ui/GlobalAppVolumeControl.vue'

const mockedState = vi.hoisted(() => ({
  globalVolumeMultiplier: { value: 0.7 },
  changeGlobalVolumeMultiplier: vi.fn(),
}))

vi.mock('pinia', () => ({
  storeToRefs: () => ({
    globalVolumeMultiplier: mockedState.globalVolumeMultiplier,
  }),
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: vi.fn().mockReturnValue({
    globalVolumeMultiplier: mockedState.globalVolumeMultiplier,
    changeGlobalVolumeMultiplier: mockedState.changeGlobalVolumeMultiplier,
  }),
}))

const WuiDropdownStub = defineComponent({
  name: 'WuiDropdown',
  props: {
    modelValue: Boolean,
    direction: String,
    closeOnClickOutside: Boolean,
  },
  emits: ['update:modelValue'],
  setup (props, { emit, slots }) {
    const toggle = () => {
      emit('update:modelValue', !props.modelValue)
    }

    return () => [
      slots.activator?.({ toggle, isActive: props.modelValue }),
      slots.default?.({ close: vi.fn(), isActive: props.modelValue }),
    ]
  },
})

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
  },
  emits: ['click'],
  template: '<button data-test="volume-btn" @click="$emit(\'click\', $event)" />',
})

const WuiInputRangeStub = defineComponent({
  name: 'WuiInputRange',
  props: {
    modelValue: Number,
    min: Number,
    max: Number,
    step: Number,
    size: Number,
    orientation: String,
    btn: Boolean,
    btnIcon: String,
    btnOffIcon: String,
  },
  emits: ['update:modelValue'],
  template: `
    <input
      data-test="volume-range"
      type="range"
      :value="modelValue"
      @input="$emit('update:modelValue', Number($event.target.value))"
    >
  `,
})

describe('GlobalAppVolumeControl.vue', () => {
  let wrapper: VueWrapper

  const createComponent = () => {
    wrapper = shallowMount(Component, {
      global: {
        stubs: {
          MyBtn: MyBtnStub,
          WuiDropdown: WuiDropdownStub,
          WuiInputRange: WuiInputRangeStub,
        },
      },
    })
  }

  beforeEach(() => {
    mockedState.globalVolumeMultiplier.value = 0.7
    mockedState.changeGlobalVolumeMultiplier.mockClear()
  })

  it('passes app volume to range as percent', () => {
    createComponent()

    const range = wrapper.getComponent(WuiInputRangeStub)

    expect(range.props('modelValue')).toBe(70)
    expect(range.props()).toMatchObject({
      min: 0,
      max: 100,
      step: 1,
      size: 72,
      orientation: 'vertical',
      btn: true,
      btnIcon: 'volumeOnF',
      btnOffIcon: 'volumeOffF',
    })
  })

  it('maps range percent back to app volume multiplier', async () => {
    createComponent()

    await wrapper.get('[data-test="volume-range"]').setValue('20')

    expect(mockedState.changeGlobalVolumeMultiplier).toHaveBeenCalledWith(0.2)
  })

  it('shows muted button state when volume is zero', () => {
    mockedState.globalVolumeMultiplier.value = 0
    createComponent()

    const button = wrapper.getComponent(MyBtnStub)

    expect(button.props('variant')).toBe('negcon')
    expect(button.props('tone')).toBe('base')
    expect(button.props('active')).toBe(false)
    expect(button.props('prependIcon')).toBe('volumeOffM')
  })

  it('uses active neutral toggle state when dropdown is open', async () => {
    createComponent()

    await wrapper.get('[data-test="volume-btn"]').trigger('click')

    const button = wrapper.getComponent(MyBtnStub)

    expect(button.props('mode')).toBe('toggle')
    expect(button.props('variant')).toBe('neutcon')
    expect(button.props('tone')).toBe('dark')
    expect(button.props('active')).toBe(true)
  })

  it('uses inactive neutral toggle state by default', () => {
    createComponent()

    const button = wrapper.getComponent(MyBtnStub)

    expect(button.props('mode')).toBe('toggle')
    expect(button.props('variant')).toBe('neutcon')
    expect(button.props('tone')).toBe('dark')
    expect(button.props('active')).toBe(false)
  })

  it('keeps negative button state when muted dropdown is open', async () => {
    mockedState.globalVolumeMultiplier.value = 0
    createComponent()

    await wrapper.get('[data-test="volume-btn"]').trigger('click')

    const button = wrapper.getComponent(MyBtnStub)

    expect(button.props('variant')).toBe('negcon')
    expect(button.props('tone')).toBe('base')
    expect(button.props('active')).toBe(true)
  })
})
