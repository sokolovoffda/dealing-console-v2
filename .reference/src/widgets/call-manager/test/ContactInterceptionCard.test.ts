import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockContact } from '@/__mocks_/mock-contact'
import { mockContactStatuses } from '@/__mocks_/mock-contact-statuses'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { CallStatusState, Contact, SubscriberStatus } from '@/entities/contact'

import Component from '../ui/cards/ContactInterceptionCard.vue'

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
  }
})
vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => {
      return {
        sessions: new Map(),
        addSession: () => vi.fn(),
        getSessionByPServed: () => vi.fn().mockReturnValue({ ...mockRTCSessionFacade }),
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
vi.mock('@/widgets/call-manager', () => {
  return {
    useCallManagerState: () => {
      return {
        selected: ref({ ...mockContact }),
        selectedStatusLine: ref<SubscriberStatus>({
          internalNumber: '4498',
          callId: '1fdsfdsfdsf-fdscxzf',
          remote: CallStatusState.EARLY,
          fromNumber: '3333',
          registered: true,
        }),
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
      }
    },
  }
})

describe('test ContactInterceptionCard', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('Проверка рендера и computed`ов', () => {
    const wrapper = mount(Component)
    const VM = wrapper.vm as unknown as { background: string, contactStatus: Record<string, unknown>, initialContact: Contact, targetContact: Contact, fromContact: Contact }
    expect(wrapper.html()).toContain('01:32')
    expect(VM.background).toEqual('')
    expect(VM.initialContact).toBeTruthy()
    expect(VM.fromContact).toBeFalsy()
    expect(VM.targetContact).toBeFalsy()
  })
})
