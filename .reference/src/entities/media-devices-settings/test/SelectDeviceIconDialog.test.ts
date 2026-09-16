import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import Component from '../ui/SelectDeviceIconDialog.vue'

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
        readyGooseDevices: ref([]),
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
    LogicalMediaDeviceIconEnum: {
      MIC_SPEAKER: 'micSpeaker',
      PHONE: 'phone',
      HEADSET_MIC: 'headsetMic',
      WORKSPACES: 'workspaces',
      SPEAKER: 'speaker',
      SETTINGS_PHONE: 'settingsPhone',
      RECORD_VOICE_OVER: 'recordVoiceOver',
      MIC: 'mic',
      HEADPHONES: 'headphones',
      AUDIO_CONTROL: 'audioControl',
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
  }
})
vi.mock('@/shared/utils/safeInject', () => {
  return {
    safeInject: () => vi.fn(),
  }
})

describe('test SelectDeviceIconDialog', () => {
  it('Проверка рендера кнопок', () => {
    const wrapper = mount(Component)
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(10)
  })
})
