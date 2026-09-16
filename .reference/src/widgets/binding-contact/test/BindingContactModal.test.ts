import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'

import { mockContact3450, mockContact4495, mockContact4498, mockCurrentUser } from '@/__mocks_/mock-contact'
import { mockRTCSessionFacade } from '@/__mocks_/mock-RTC-session-facade'

import { Contact } from '@/entities/contact'

import Component from '../ui/BindingContactModal.vue'

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
vi.mock('@/shared/utils/safeInject', () => {
  return {
    safeInject: () => vi.fn(),
  }
})
vi.mock('@/entities/contact', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/contact')>()

  return {
    ...actual,
    useContactFiltering: () => ({
      fetchContacts: vi.fn().mockResolvedValue(undefined),
      list: ref([mockContact4495, mockContact3450, mockContact4498]),
      total: ref(3),
      page: ref(1),
      perPage: ref(14),
      lastPage: ref(1),
      paginationModel: ref({
        currentPage: 1,
        total: 3,
        perPage: 14,
      }),
    }),
    useContactStore: () => ({
      externalContactsFromIndexedDb: ref(new Map()),
      fetchExternalContactsFromIndexedDb: vi.fn().mockResolvedValue(undefined),
      saveExternalContactToIndexedDb: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

vi.mock('@/shared/i18n', () => {
  const original = vi.importActual('@/shared/i18n')
  return {
    ...original,
    useLocalization: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('@/shared/utils/safeInject', () => {
  return {
    safeInject: vi.fn().mockReturnValue(vi.fn()),
  }
})


interface VM {
  contactModel: Contact | null,
  text: string,
  selectContact: (contact: Contact) => void
}

const WuiBtnStub = defineComponent({
  name: 'WuiBtn',
  emits: ['click'],
  template: '<button data-test="wui-btn" @click="$emit(\'click\')"><slot /></button>',
})

const WuiIconStub = defineComponent({
  name: 'WuiIcon',
  template: '<div data-test="wui-icon" />',
})

describe('Тест BindingContactModal', () => {
  beforeAll(() => {
    vi.useFakeTimers()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountComponent = (props = { contact: null }) => {
    return mount(Component, {
      props,
      global: {
        stubs: {
          'keyboard-pad': true,
          'wui-input': true,
          'wui-paginator': true,
          'v-click-outside': true,
          'wui-btn': WuiBtnStub,
          'wui-icon': WuiIconStub,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
  }

  it('deselects contact on second click', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as VM

    vm.selectContact(mockContact4495)
    await nextTick()
    expect(vm.contactModel?.id).toBe(mockContact4495.id)

    vm.selectContact(mockContact4495)
    await nextTick()
    expect(vm.contactModel).toBeNull()
  })

  it('adds characters from keyboard', async () => {
    const wrapper = mountComponent()
    const keyboardPad = wrapper.findComponent({ name: 'KeyboardPad' })

    await keyboardPad.vm.$emit('on-key-tap', { letter: 'a', key: { event: 'letter' } })
    expect((wrapper.vm as unknown as VM).text).toBe('a')

    await keyboardPad.vm.$emit('on-key-tap', { letter: 'b', key: { event: 'letter' } })
    expect((wrapper.vm as unknown as VM).text).toBe('ab')
  })

  it('creates local external contact from valid number', async () => {
    const wrapper = mountComponent()

    ;(wrapper.vm as unknown as VM).text = '1234'
    await nextTick()

    const addButton = wrapper.find('[data-test="wui-btn"]')
    expect(addButton.exists()).toBe(true)

    await addButton.trigger('click')

    const selectedContact = (wrapper.vm as unknown as VM).contactModel
    expect(selectedContact).not.toBeNull()
    expect(selectedContact?.internalNumber).toBe('1234')
    expect(selectedContact?.isExternal).toBe(true)
    expect((wrapper.vm as unknown as VM).text).toBe('1234')
  })
})
