import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockConference } from '@/__mocks_/mock-conference'
import { mockContact } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { ConferenceDto } from '@/entities/conference'
import { Contact } from '@/entities/contact'

import Component from '../ui/cards/IncomingCallCard.vue'

const mocks = vi.hoisted(() => ({
  getConfByPServed: vi.fn(),
  selected: { value: undefined as Contact | ConferenceDto | undefined },
}))

vi.mock('@/shared/composables', () => {
  return {
    useAutoAnswer: () => {
      return {
        checkAutoAnswerAndGetDevice: () => vi.fn(),
      }
    },
    useConfigurationState: () => {
      return {
        configuration: ref({ domainPath: 'ROOT' }),
      }
    },
    useDevicesStore: () => {
      return {
        readyQueueDevices: ref([]),
        readyPreferredGoose: ref(undefined),
        queueDevices: ref([]),
        gooseDevices: ref([]),
        getDeviceForPinnedSessions: vi.fn(),
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
vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => {
      return {
        sessions: new Map(),
        addSession: () => vi.fn(),
        getSessionByPServed: () => vi.fn().mockReturnValue({ ...mockRTCSessionFacade }),
        getQueueSessionIndex: () => null,
      }
    },
    usePinnedCallsStore: () => {
      return {
        isPServedSession: () => false,
        getPinnedCallBySessionId: () => undefined,
        getPinnedCallsByPServed: () => [],
        activePinnedCall: null,
      }
    },
  }
})
vi.mock('@/entities/conference/model/use-conference-state', () => ({
  default: () => ({
    getConfByPServed: mocks.getConfByPServed,
  }),
}))
vi.mock('@/widgets/call-manager', () => {
  return {
    CallManagerState: { INITIAL: 0 },
    useCallManagerState: () => {
      return {
        selected: mocks.selected,
        selectedSession: ref({ ...mockRTCSessionFacade }),
        setCallManagerState: vi.fn(),
      }
    },
  }
})

describe('IncomingCallCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.getConfByPServed.mockReset()
    mocks.selected.value = { ...mockContact }
  })

  it('should render contact incoming card', () => {
    // Arrange
    mocks.selected.value = { ...mockContact }

    // Act
    const wrapper = mount(Component)
    const html = wrapper.html()

    // Assert
    expect(html).toContain(mockContact.name)
    expect(html).toContain('3450')
    expect(html).toContain(mockContact.organization)
  })

  it('should render conference incoming card with conf icon and participants', () => {
    // Arrange
    const conferenceStub: ConferenceDto = {
      ...mockConference,
      name: 'Moderated Conference Aug 17',
      subscribers: [],
    }
    mocks.selected.value = conferenceStub
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const wrapper = mount(Component)
    const html = wrapper.html()

    // Assert
    expect(html).toContain('Moderated Conference Aug 17')
    expect(html).toContain('Участников: 0')
    expect(wrapper.findComponent({ name: 'WuiIcon' }).props('name')).toBe('confCall')
  })

  it('should show updated conference data from innerData instead of stale stub', () => {
    // Arrange
    const conferenceStub: ConferenceDto = {
      ...mockConference,
      name: 'Stub Conference',
      subscribers: [],
    }
    mocks.selected.value = conferenceStub
    mocks.getConfByPServed.mockImplementation((pServed: string) => {
      if (pServed === conferenceStub.pServed) {
        return {
          ...mockConference,
          name: 'Updated Conference',
        }
      }

      return undefined
    })

    // Act
    const wrapper = mount(Component)
    const html = wrapper.html()

    // Assert
    expect(mocks.getConfByPServed).toHaveBeenCalledWith(conferenceStub.pServed)
    expect(html).toContain('Updated Conference')
    expect(html).toContain(`Участников: ${mockConference.subscribers.length}`)
  })
})
