import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { mockContact } from '@/__mocks_/mock-contact'
import { mockContactStatuses } from '@/__mocks_/mock-contact-statuses'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { STATE } from '@/entities/call-session'
import { CallStatusState } from '@/entities/contact'

import Component from '../ui/cards/ContactCallCard.vue'

const mockSelectedReferType = ref<null | 'blind' | 'consultation'>(null)
const mockSendDtmf = vi.fn()
const mockStopRefer = vi.fn(() => {
  mockSelectedReferType.value = null
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
vi.mock('@/features/refer-call', () => {
  return {
    useReferCallState: () => {
      return {
        startProcess: (state: 'blind' | 'consultation') => {
          mockSelectedReferType.value = state
        },
        selectedReferType: mockSelectedReferType,
        finishProcess: mockStopRefer,
        executeRefer: vi.fn(),
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
          getSessionByPServed: () => vi.fn().mockReturnValue({ ...mockRTCSessionFacade, sendDtmf: mockSendDtmf }),
          getQueueSessionIndex: () => null,
          queueSessions: [],
        }
      },
    usePinnedCallsStore: () => {
      return {
        isPServedSession: () => vi.fn(),
        getPinnedCallBySessionId: () => undefined,
        getPinnedCallsByPServed: () => [],
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
        selected: ref({ ...mockContact }),
        selectedSession: ref({ ...mockRTCSessionFacade, sendDtmf: mockSendDtmf }),
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

describe('test ContactCallCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSelectedReferType.value = null
    mockSendDtmf.mockClear()
    mockStopRefer.mockClear()
  })
  it('Проверка рендера', async () => {
    const wrapper = shallowMount(Component)
    const VM = wrapper.vm as unknown as { telephoneNumber: string, onNumpadPress: (val: string) => void }
    const expected = ['Дмитрий Бикеев', '4498', 'Разработчик']
    expected.forEach((e) => {
      expect(wrapper.html()).toContain(e)
    })
    VM.onNumpadPress('123test')
    expect(VM.telephoneNumber).toEqual('123test')
  })

  it('should send dtmf from common dialpad button when transfer mode is inactive', async () => {
    const wrapper = shallowMount(Component)
    const VM = wrapper.vm as unknown as {
      showHideCallDialpad: () => void
      onNumpadPress: (val: string) => void
      isDtmfDialPadOn: boolean
      isTransferDialPadOn: boolean
    }

    VM.showHideCallDialpad()
    await nextTick()
    VM.onNumpadPress('5')

    expect(VM.isDtmfDialPadOn).toBe(true)
    expect(VM.isTransferDialPadOn).toBe(false)
    expect(mockSendDtmf).toHaveBeenCalledWith('5')
  })

  it('should close transfer mode by common dialpad button and clear transfer number', async () => {
    const wrapper = shallowMount(Component)
    const VM = wrapper.vm as unknown as {
      showHideCallDialpad: () => void
      onNumpadPress: (val: string) => void
      isDtmfDialPadOn: boolean
      isTransferDialPadOn: boolean
      telephoneNumber: string
    }

    mockSelectedReferType.value = 'blind'
    await nextTick()

    VM.onNumpadPress('7')
    VM.showHideCallDialpad()
    await nextTick()

    expect(VM.telephoneNumber).toBe('')
    expect(mockSendDtmf).not.toHaveBeenCalled()
    expect(mockStopRefer).toHaveBeenCalled()
    expect(mockSelectedReferType.value).toBe(null)
    expect(VM.isTransferDialPadOn).toBe(false)
    expect(VM.isDtmfDialPadOn).toBe(false)
  })
})
