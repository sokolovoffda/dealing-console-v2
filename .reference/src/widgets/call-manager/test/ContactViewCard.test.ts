import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockContact } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import Component from '../ui/cards/ContactViewCard.vue'


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
        readyPreferredGoose: ref(undefined),
      }
    },
    LogicalMediaDeviceTypeEnum: {
      GOOSE: 'goose',
    },
    useDevicesSessionsStore: () => {
      return {
        bindSessionToDevice: () => vi.fn(),
      }
    },
  }
})

vi.mock('@/widgets/call-manager', () => {
  return {
    useCallManagerState: () => {
      return {
        selected: ref({ ...mockContact }),
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
    unselectContact: () => vi.fn(),
  }
})

describe('test ContactViewCard', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('Проверка рендера', () => {
    const wrapper = mount(Component)
    const results = [mockContact.name, mockContact.internalNumber, mockContact.position, mockContact.organizationalUnit]
    results.forEach((r) => {
      expect(wrapper.html()).toContain(r)
    })
  })
})
