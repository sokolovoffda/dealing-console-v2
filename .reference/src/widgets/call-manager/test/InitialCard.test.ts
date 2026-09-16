import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import Component from '../ui/cards/InitialCard.vue'

vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => ({
      sessions: ref(new Map()),
      getSessionByPServed: vi.fn(),
    }),
  }
})

const navigatorMock = {
  mediaDevices: {
    enumerateDevices: () => Promise.resolve([]),
    addEventListener: () => vi.fn(),
  },
};

(global.navigator.mediaDevices as any) = navigatorMock.mediaDevices

const MEDIA_DEVICES_VERSION = '3'
const localStorageMock = {
  getItem: vi.fn().mockReturnValue(MEDIA_DEVICES_VERSION),
  setItem: vi.fn(),
  clear: vi.fn(),
};
(global.localStorage as any) = localStorageMock

const mockRouter = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: Component }] })
mockRouter.currentRoute.value.path = '/'

describe('test InitialCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('Проверка работы компонента', async () => {
    const wrapper = mount(Component, {
      global: {
        plugins: [mockRouter],
      },
    })
    const VM = wrapper.vm as unknown as { telephoneNumber: '' }
    const panelToggleButton = wrapper.find('[title="Панель набора номера"]')
    // Нажимаем кнопку открытия панели с цифрами
    await panelToggleButton.trigger('click')
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#']
    // Ожидается что панель раскрывается
    buttons.forEach((b) => {
      expect(wrapper.html()).toContain(b)
    })
    // Нажимаем на кнопки, в numberToCall должно меняться значение
    const AllButtons = wrapper.findAll('button')
    const one = AllButtons.filter((b) => b.text() === '1')[0]
    const three = AllButtons.filter((b) => b.text() === '3')[0]
    const nine = AllButtons.filter((b) => b.text() === '9')[0]
    await one.trigger('click')
    await nine.trigger('click')
    await three.trigger('click')
    expect(VM.telephoneNumber).toEqual('193')
    // Удаляем один символ
    const backspace = wrapper.find('[title="Удалить элемент"]')
    await backspace.trigger('click')
    expect(VM.telephoneNumber).toEqual('19')
    // Полностью очищаем
    const clear = wrapper.find('[title="Очистить"]')
    await clear.trigger('click')
    expect(VM.telephoneNumber).toEqual('')
  })
})
