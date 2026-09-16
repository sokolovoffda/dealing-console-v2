import { mount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'

import Component from '../ui/pagination-local.vue'

vi.mock('@/shared/i18n', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'common.paginatorFrom': 'из',
      'common.paginatorPerPage': 'Записей на странице',
    }[key] ?? key),
  }),
}))

describe('PaginationLocal', () => {
  let wrapper: VueWrapper<typeof Component>

  const createComponent = function () {
    wrapper = mount(Component, {
      props: {
        items: new Array(100).fill(0).map((_, i) => i + 1),
        perPage: 20,
      },
    }) as unknown as VueWrapper<typeof Component>
  }

  it('test offset computed', async () => {
    createComponent()
    const VM = wrapper.vm as unknown as { offset: number }
    expect(VM.offset).toBe(0)
    const nextButton = wrapper.find('[data-test="next"]')
    await nextButton.trigger('click')
    expect(VM.offset).toBe(20)
    await nextButton.trigger('click')
    expect(VM.offset).toBe(40)
    await nextButton.trigger('click')
    expect(VM.offset).toBe(60)
    await nextButton.trigger('click')
    expect(VM.offset).toBe(80)
    await nextButton.trigger('click')
    // Добрались до последней страницы, после чего функция не срабатывает
    expect(VM.offset).toBe(80)
    await nextButton.trigger('click')
    expect(VM.offset).toBe(80)

    // Нажимаем назад
    const prevButton = wrapper.find('[data-test="prev"]')
    await prevButton.trigger('click')
    expect(VM.offset).toBe(60)
    await prevButton.trigger('click')
    expect(VM.offset).toBe(40)
    await prevButton.trigger('click')
    expect(VM.offset).toBe(20)
    await prevButton.trigger('click')
    expect(VM.offset).toBe(0)
    // Добрались в самое начало, после чего функция не срабатывает
    await prevButton.trigger('click')
    expect(VM.offset).toBe(0)
    await prevButton.trigger('click')
    expect(VM.offset).toBe(0)
  })

  it('test emit setItemsPerPage', async () => {
    createComponent()
    const expected = new Array(20).fill(0).map((_, i) => i + 1)
    const expected2 = new Array(20).fill(0).map((_, i) => i + 21)
    expect(wrapper.emitted()).toHaveProperty('setItemsPerPage', [[expected]])
    const nextButton = wrapper.find('[data-test="next"]')
    await nextButton.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('setItemsPerPage', [[expected], [expected2]])
  })

  it('test per page select', async () => {
    wrapper = mount(Component, {
      props: {
        items: new Array(100).fill(0).map((_, i) => i + 1),
        perPage: 20,
        perPageVariants: [20, 40],
      },
    }) as unknown as VueWrapper<typeof Component>

    await wrapper.find('select').setValue('40')

    const expected = new Array(40).fill(0).map((_, i) => i + 1)
    expect(wrapper.emitted('setItemsPerPage')?.at(-1)).toEqual([expected])
  })
})
