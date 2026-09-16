import { shallowMount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockConference } from '@/__mocks_/mock-conference'
import { mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockContactStatuses } from '@/__mocks_/mock-contact-statuses'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { STATE } from '@/entities/call-session'
import { RoomMemberRole } from '@/entities/conference'
import { CallStatusState, Contact } from '@/entities/contact'

import Component from '../ui/cards/ConferenceCreateCard.vue'

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
vi.mock('@/entities/conference', () => {
  return {
    useConferenceDraft: () => {
      return {
        init: () => vi.fn(),
        conferenceDraft: ref({ ...mockConference }),
        cancelConferenceDraft: () => vi.fn(),
        persist: () => vi.fn(),
        deleteDraftConferenceSubscriber: () => vi.fn(),
        loading: ref(false),
        setConfDraftName: () => vi.fn(),
      }
    },
    useRoomControl: () => {
      return {
        roomCall: () => vi.fn(),
      }
    },
    RoomMemberRole: () => vi.fn().mockReturnValue(RoomMemberRole),
    ConferenceSubscribersList: vi.fn(),
  }
})

describe('test ConferenceCreateCard', () => {
  it('Проверка computed`ов и html', () => {
    const wrapper = shallowMount(Component)
    const VM = wrapper.vm as unknown as { subscriberCount: number, isValid: boolean, conferenceContacts: Array<Contact>, isConferenceActive: boolean }
    expect(wrapper.html()).toContain('Конференция')
    expect(wrapper.html()).toContain('3 Участника')
    expect(VM.conferenceContacts).toEqual([
      {
        internalNumber: '4498',
        targetNumber: undefined,
        fromNumber: '3450',
        callId: 'call-id 2',
        registered: true,
        remote: 'confirmed',
      },
      {
        internalNumber: '3450',
        targetNumber: '4498',
        fromNumber: undefined,
        callId: 'call-id 1',
        registered: true,
        remote: 'early',
      },
    ])
    expect(VM.isConferenceActive).toBeFalsy()
    expect(VM.isValid).toBeTruthy()
    expect(VM.subscriberCount).toEqual(3)
  })
})
