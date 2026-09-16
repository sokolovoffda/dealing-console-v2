import { shallowMount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'

import { mockConference } from '@/__mocks_/mock-conference'
import { mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockContactStatuses } from '@/__mocks_/mock-contact-statuses'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { STATE } from '@/entities/call-session'
import { ConferenceDto } from '@/entities/conference'
import { CallStatusState } from '@/entities/contact'

import Component from '../ui/cards/ConferenceViewCard.vue'

const i18n = createI18n({
  // Опции i18n
})

vi.mock('@/shared/composables', () => {
  return {
    useAutoAnswer: () => {
      return {
        checkAutoAnswerAndGetDevice: () => vi.fn(),
      }
    },
    useDevicesStore: () => {
      return {
        readyQueueDevices: ref([]),
        readyPreferredGoose: undefined,
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

describe('test ConferenceViewCard', () => {
  it('Проверка рендера и computed', () => {
    const $t = (key: string) => key
    const wrapper = shallowMount(Component, {
      global: {
        plugins: [mockRouter, i18n],
      },
      provide: {
        $t,
      },
    })
    const VM = wrapper.vm as unknown as {
      selected: ConferenceDto
      selectedConferencePServed: string
      allowDeleteConference: boolean
    }
    expect(VM.selected).toEqual(mockConference)
    expect(VM.selectedConferencePServed).toEqual('Conference-P-Served')
    expect(VM.allowDeleteConference).toEqual(false)
    const expected = ['Конференция', 'Participants: 3']
    expected.forEach((e) => {
      expect(wrapper.html()).toContain(e)
    })
  })
})
