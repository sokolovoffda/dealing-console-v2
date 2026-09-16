import { mount } from '@vue/test-utils'

import Component from '../IconButton.vue'

describe('IconButton.vue', () => {
  it('test props badge', async () => {
    const wrapper = mount(Component, {
      attrs: {
        disabled: true,
      },
      props: {
        icon: 'edit',
        badge: '23',
      },
    })
    expect(wrapper.html()).toContain('23')
    await wrapper.setProps({ icon: 'edit', badge: '42' })
    expect(wrapper.html()).toContain('42')
  })

  it('test props loading', async () => {
    const wrapper = mount(Component, {
      attrs: {
        disabled: true,
      },
      props: {
        icon: 'edit',
        loading: true,
      },
    })
    expect(wrapper.html()).toContain('transform="rotate(0 50 50)"')
    await wrapper.setProps({ icon: 'edit', loading: false })
    expect(wrapper.html()).not.toContain('transform="rotate(0 50 50)"')
  })

  it('test props active', async () => {
    const wrapper = mount(Component, {
      attrs: {
        disabled: true,
      },
      props: {
        icon: 'edit',
        active: true,
      },
    })
    expect(wrapper.html()).toContain('active')
    await wrapper.setProps({ icon: 'edit', active: false })
    expect(wrapper.html()).not.toContain('active')
  })

  it('test props largeIcon', async () => {
    const wrapper = mount(Component, {
      attrs: {
        disabled: true,
      },
      props: {
        icon: 'edit',
        largeIcon: true,
      },
    })
    const VM = wrapper.vm as unknown as { iconSizeClass: string[] }
    expect(wrapper.html()).toContain('!w-12 !h-12')
    expect(VM.iconSizeClass).toBe('!w-12 !h-12')
    await wrapper.setProps({ icon: 'edit', largeIcon: false })
    expect(wrapper.html()).toContain('!w-8 !h-8')
    expect(VM.iconSizeClass).toBe('!w-8 !h-8')
    await wrapper.setProps({ icon: 'edit', smallIcon: true })
    expect(wrapper.html()).toContain('!w-[18px] !h-[18px]')
    expect(VM.iconSizeClass).toBe('!w-[18px] !h-[18px]')
  })

  it('test attrs', async () => {
    const wrapper = mount(Component, {
      attrs: {
        disabled: true,
        autofocus: true,
        name: 'button',
        type: 'submit',
      },
      props: {
        icon: 'edit',
        largeIcon: true,
      },
    })
    expect(wrapper.html()).toContain('disabled="" autofocus="" name="button" type="submit"')
  })
})
