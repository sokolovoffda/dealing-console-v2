import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { mockContact4495, mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import Component from '../ui/PhoneBookRow.vue'

vi.mock('@/shared/composables', () => {
  return {
    useAutoAnswer: () => {
      return {
        checkAutoAnswerAndGetDevice: () => vi.fn(),
      }
    },
    useDevicesStore: () => {
      return {
        queueDevices: [], gooseDevices: [],
      }
    },
    useDevicesSessionsStore: () => {
      return {
        bindSessionToDevice: () => vi.fn(),
      }
    },
    useAppStore: () => {
      return {
        currentUser: ref({ ...mockCurrentUser }),
      }
    },
    useStatusSubscribe: () => {
      return {
        subscribe: () => vi.fn(), unsubscribe: () => vi.fn(),
      }
    },
    useConfigurationState: () => {
      return {
        configuration: ref({ domainPath: '@ROOT' }),
      }
    },
  }
})
vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => {
      return {
        sessions: new Map(),
        addSession: () => vi.fn(),
        getSessionByPServed: () => vi.fn().mockReturnValue({ ...mockRTCSessionFacade }),
        queueSessions: [],
      }
    },
    usePinnedCallsStore: () => {
      return {
        isPServedSession: () => vi.fn(),
      }
    },
    useSessionTimer: () => {
      return {
        duration: ref('01:32'), start: () => vi.fn(), stop: () => vi.fn(),
      }
    },
    unselectContact: () => vi.fn(),
    selectContact: () => vi.fn(),
  }
})

const mockRouter = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: Component }, { path: '/phonebook', name: 'Phonebook', component: Component }] })
mockRouter.currentRoute.value.path = '/'

describe('test PhoneBookRow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('Проверка рендера', async () => {
    const wrapper = mount(Component, {
      props: {
        item: mockContact4495,
        isActive: true,
      },
      global: {
        plugins: [mockRouter],
      },
    })
    const expected = ['Пол Атрейдес', '4495', 'САТЕЛ ПРО', 'Разработчик', 'pol@satel.ru', 'Группа 1', 'Группа 2', 'Группа 3']
    expected.forEach((e) => {
      expect(wrapper.html()).toContain(e)
    })
  })
})
