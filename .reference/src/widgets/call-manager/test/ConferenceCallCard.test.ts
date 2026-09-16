import { shallowMount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { mockConference } from '@/__mocks_/mock-conference'
import { mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockContactStatuses } from '@/__mocks_/mock-contact-statuses'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { STATE } from '@/entities/call-session'
import { CallStatusState } from '@/entities/contact'

import Component from '../ui/cards/ConferenceCallCard.vue'

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
    STATE: () => vi.fn().mockReturnValue(STATE),
  }
})
vi.mock('@/widgets/call-manager', () => {
  return {
    useCallManagerState: () => {
      return {
        selected: ref({ ...mockConference }),
        selectedSession: ref({ ...mockRTCSessionFacade }),
      }
    },
  }
})
vi.mock('@/entities/contact', () => {
  return {
    useContactCachedStore: () => {
      return {
        fetchContactsBySomeIds: () => vi.fn(),
        getLocalByPServed: () => undefined,
        contacts: new Map(),
      }
    },
    useContactStatusState: () => {
      return {
        contactStatuses: mockContactStatuses,
      }
    },
    CallStatusState: () => vi.fn().mockReturnValue(CallStatusState),
    useContactStore: () => {
      return {
        getByInternalNumber: (number: string) => mockContactStatuses.value[number],
        getByInternalNumberOrCreateExternal: () => vi.fn(),
      }
    },
  }
})

const mockRouter = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: Component }] })
mockRouter.currentRoute.value.path = '/'

describe('test ConferenceCallCard', () => {
  it('should ', () => {
    const wrapper = shallowMount(Component, {
      global: {
        plugins: [mockRouter],
      },
    })
    const VM = wrapper.vm as unknown as { activeContacts: number, isHold: boolean }
    expect(VM.activeContacts).toEqual(0)
    expect(VM.isHold).toEqual(true)
    expect(wrapper.html()).toContain('Конференция')
    expect(wrapper.html()).toContain('Участников: 3')
    expect(wrapper.html()).toContain('Подключено участников: 0')
  })
})
