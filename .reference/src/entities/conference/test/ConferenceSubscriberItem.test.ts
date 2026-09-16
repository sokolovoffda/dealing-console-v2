import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import Component from '../ui/subscribers-list/ConferenceSubscriberItem.vue'

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
  }
})

describe('test ConferenceSubscriberItem', () => {
  it('should ', () => {
    const wrapper = shallowMount(Component, {
      props: {
        title: 'title',
        subtitle: 'subtitle',
        confPServed: 'confPServed',
        number: 'number',
        icon: 'speaker',
        dark: true,
      },
      global: {
        plugins: [ createTestingPinia() ],
      },
    })
    const VM = wrapper.vm as unknown as { isRegisteredClass: string, isMutedMember: boolean, contactItemStyles: string, contactItemNameStyles: string, contactItemSubtitleStyles: string }
    expect(wrapper.html()).toContain('title')
    expect(wrapper.html()).toContain('subtitle')
    expect(VM.isRegisteredClass).toEqual('primary')
    expect(VM.contactItemNameStyles).toEqual('font-normal')
    expect(VM.contactItemSubtitleStyles).toEqual('text-black-135 font-normal')
    expect(VM.contactItemStyles).toEqual('text-white bg-black-700')
  })
})
