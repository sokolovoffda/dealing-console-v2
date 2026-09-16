/* eslint-disable vue/require-default-prop */
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import Component from '../ui/FooterHandsetButton.vue'

const WuiBtnStub = defineComponent({
  name: 'WuiBtn',
  props: {
    size: Number,
    icon: Boolean,
    prependIcon: String,
    appendIcon: String,
    contentAlign: String,
    disabled: Boolean,
  },
  template: '<button data-test="handset-button" v-bind="$attrs"><slot /></button>',
})

describe('FooterHandsetButton.vue', () => {
  it('renders selected left free handset with neutral active state', () => {
    const wrapper = mount(Component, {
      props: {
        icon: 'phoneM',
        id: 'left',
        title: 'Левая',
        statusText: 'Свободна',
        tone: 'neutcon',
        selected: true,
      },
      global: {
        stubs: {
          WuiBtn: WuiBtnStub,
        },
      },
    })

    const button = wrapper.get('[data-test="handset-button"]')
    const wuiButton = wrapper.getComponent(WuiBtnStub)

    expect(button.classes()).toContain('footer-handset-button--neutcon')
    expect(button.classes()).toContain('footer-handset-button--active')
    expect(wuiButton.props()).toMatchObject({
      prependIcon: 'phoneM',
      appendIcon: undefined,
      contentAlign: 'start',
    })
    expect(wrapper.text()).toContain('Левая')
    expect(wrapper.text()).toContain('Свободна')
  })

  it('renders inactive right hold handset without losing status tone', () => {
    const wrapper = mount(Component, {
      props: {
        icon: 'phonePauseInvM',
        id: 'right',
        title: 'Правая',
        statusText: 'Удержание',
        tone: 'waitcon',
        selected: false,
      },
      global: {
        stubs: {
          WuiBtn: WuiBtnStub,
        },
      },
    })

    const button = wrapper.get('[data-test="handset-button"]')
    const wuiButton = wrapper.getComponent(WuiBtnStub)

    expect(button.classes()).toContain('footer-handset-button--waitcon')
    expect(button.classes()).toContain('footer-handset-button--inactive')
    expect(wuiButton.props()).toMatchObject({
      prependIcon: undefined,
      appendIcon: 'phonePauseInvM',
      contentAlign: 'end',
    })
    expect(wrapper.text()).toContain('Правая')
    expect(wrapper.text()).toContain('Удержание')
  })
})
