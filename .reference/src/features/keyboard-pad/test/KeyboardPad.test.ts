import { mount, VueWrapper } from '@vue/test-utils'
import { expect } from 'vitest'

import Component from '../ui/KeyboardPad.vue'

describe('KeyboardPad.vue', () => {
  let wrapper: VueWrapper<typeof Component>

  const createComponent = function () {
    wrapper = mount(Component) as VueWrapper<typeof Component>
  }

  it('test default component state', () => {
    createComponent()
    expect(wrapper.vm.data).toEqual({
      upperCase: true,
      language: 'ru-RU',
      showVirtualKeyboard: true,
      showKeyboardKey: {
        style: {
          background: 'no-repeat 50% 50% url("/src/app/assets/images/dialpad.svg")',
        },
        event: 'showHideKeyboard',
      },
    })
    expect(wrapper.html()).toContain('flex items-center justify-center')
  })

  it('test emitted', async () => {
    createComponent()
    const buttons = wrapper.findAll('.keyboard-pad__key')
    await buttons[0].trigger('click')
    await buttons[20].trigger('click')
    expect(wrapper.emitted()).toHaveProperty('on-key-tap')
    expect(wrapper.emitted()['on-key-tap']).toEqual([
      [
        {
          'key': {
            'id': '1',
            'lower': 'ё',
            'upper': 'Ё',
          },
          'letter': 'Ё',
        },
      ],
      [
        {
          'key': {
            'id': '21',
            'lower': 'щ',
            'upper': 'Щ',
          },
          'letter': 'Щ',
        },
      ],
    ])
  })
})
