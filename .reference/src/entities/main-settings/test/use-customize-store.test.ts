import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { useCustomizeStore } from '@/entities/main-settings'

const setPreferencesMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

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
vi.mock('@/entities/preference', () => ({
  usePreferencesStore: () => ({
    setPreferences: setPreferencesMock,
  }),
}))

describe('test use-customize-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setPreferencesMock.mockClear()
  })
  it('Проверка store', () => {
    const store = useCustomizeStore()
    store.loadByPreferences({
      '4498': {
        pServed: '<sip:4498@ROOT>',
        color: 'red',
        ringtoneGuid: 'ringtoneGuid',
        ringtonePath: 'ringtonePath',
      },
    })
    const result1 = store.getCustomizeByPServed('4498')
    expect(result1).toEqual({
      pServed: '<sip:4498@ROOT>',
      color: 'red',
      ringtoneGuid: 'ringtoneGuid',
      ringtonePath: 'ringtonePath',
    })
    store.setColor('4498', 'blue')
    const result2 = store.getCustomizeByPServed('4498')
    expect(result2).toEqual({
      pServed: '4498',
      color: 'blue',
      ringtoneGuid: 'ringtoneGuid',
      ringtonePath: 'ringtonePath',
    })
    store.setRingtone('4498', 'newGuid')
    const result3 = store.getCustomizeByPServed('4498')
    expect(result3).toEqual({
      pServed: '4498',
      color: 'blue',
      ringtoneGuid: 'newGuid',
      ringtonePath: '',
    })
  })

  it('saves added contacts to preferences', async () => {
    const store = useCustomizeStore()

    await store.addItems(['<sip:4498@ROOT>', '<sip:4499@ROOT>'])

    expect(setPreferencesMock).toHaveBeenCalledWith('customize', {
      '<sip:4498@ROOT>': {
        pServed: '<sip:4498@ROOT>',
      },
      '<sip:4499@ROOT>': {
        pServed: '<sip:4499@ROOT>',
      },
    })
  })
})
