import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockConference } from '@/__mocks_/mock-conference'
import { mockContact3450, mockContact4495, mockContact4498, mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { MemberStatus } from '@/entities/conference'
import { Contact } from '@/entities/contact'

import Component from '../ui/subscribers-list/ConferenceSubscribersList.vue'

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
        getSessionByPServed: () => ({ ...mockRTCSessionFacade }),
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
  }
})

vi.mock('@/entities/conference/lib/use-room-control', () => {
  return {
    useRoomControl: () => {
      return {
        memberMute: vi.fn(),
        memberUnmute: vi.fn(),
      }
    },
  }
})

describe('test ConferenceSubscribersList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should ', () => {
    const wrapper = shallowMount(Component, {
      props: {
        conference: mockConference,
        contacts: [mockContact3450, mockContact4495, mockContact4498],
      },
    })
    const VM = wrapper.vm as unknown as { selected: Contact, selectedStatus: MemberStatus, selectedMediaStatus: unknown, disabledToggleCall: boolean, disabledMute: boolean, isCurrentUser: boolean, isMuted: boolean, isMutedIcon: string, isActiveIcon: string }
    expect(wrapper.html()).toContain('Супергерой')
    expect(wrapper.html()).toContain('Пол Атрейдес')
    expect(wrapper.html()).toContain('Дмитрий Бикеев')
    expect(VM.disabledToggleCall).toBeTruthy()
    expect(VM.disabledMute).toBeTruthy()
    expect(VM.isActiveIcon).toEqual('phone')
    expect(VM.isCurrentUser).toBeFalsy()
    expect(VM.isMutedIcon).toEqual('mic')
  })
})
