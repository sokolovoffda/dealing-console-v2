import { shallowMount } from '@vue/test-utils'
import { ContactState } from '@wui/im'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockContactState } from '@/__mocks_/mock-contact-state'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { MemberStatusNumber } from '../types'
import Component from '../ui/ConferenceUser.vue'

const mocks = vi.hoisted(() => ({
  STATE: {
    INITIAL: 0,
    PROGRESS: 1,
    RINGING: 2,
    CONNECTED: 3,
    ERROR: 4,
    ONHOLD: 5,
    DISCONNECTED: 6,
  },
}))

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
    STATE: mocks.STATE,
  }
})
vi.mock('@/entities/conference', () => {
  return {
    useConferenceState: () => {
      return {
        getConferenceContactStatusByPServed: () => {
          return mockContactState
        },
        getMediaStatus: () => {
          return { isAudioMuted: true, handEnabled: true }
        },
      }
    },
    useRoomControl: () => {
      return {
        memberMute: () => vi.fn(), memberUnmute: () => vi.fn(),
      }
    },
    useConferencePushToTalk: () => {
      return {
        pressParticipantPtt: vi.fn(),
        releaseParticipantPtt: vi.fn(),
        pressOperatorPtt: vi.fn(),
        releaseOperatorPtt: vi.fn(),
        isPushToTalkEnabled: () => true,
      }
    },
    MemberStatusNumber: () => vi.fn().mockReturnValue(MemberStatusNumber),
  }
})

describe('test ConferenceUser', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('should ', () => {
    const wrapper = shallowMount(Component, {
      props: {
        name: 'name',
        pServed: '<sip:test@ROOT>',
        phoneNumber: '1234',
        confPServed: 'confPServed',
        callId: 'TEST-ID',
      },
    })
    const VM = wrapper.vm as unknown as { status: ContactState, colorMap: Map<string, string>, titleMap: Map<string, string>, title: string, background: string, isMuted: boolean, handEnabled: boolean, iconName: string }
    expect(VM.isMuted).toEqual(true)
    expect(VM.handEnabled).toEqual(true)
    expect(VM.iconName).toEqual('micOff')
  })
})
