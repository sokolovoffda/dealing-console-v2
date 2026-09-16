import { createTestingPinia } from '@pinia/testing'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import { AddToPinnedCallsCard } from '@/features/pinned-calls'

import { Contact } from '@/entities/contact'

import Component from '../ui/RemoveFromPinnedCalls.vue'

const AddBtnSelector = '[data-test="add-btn"]'
const mockedState = vi.hoisted(() => ({
  addByPServed: vi.fn(),
  addByDto: vi.fn(),
}))
const selectedSession = ref<{ sessionId: string } | null>({
  sessionId: 'session-1',
})

vi.mock('@/widgets/call-manager', async () => {
  const contact: Contact = {
    id: '1',
    name: 'name',
    pServed: '1231',
    internalNumber: '1234',
    groupIds: [],
    groups: [],
    photo: '',
    imLogin: '1231',
    terminalLogin: '',
    terminalPassword: '',
  }
  return {
    useCallManagerState: () => {
      return {
        selected: ref(contact),
        selectedSession,
      }
    },
  }
})
vi.mock('@/entities/call-session', async () => {
  return {
    usePinnedCallsStore: () => {
      return {
        addByPServed: mockedState.addByPServed,
        addByDto: mockedState.addByDto,
      }
    },
    useSessionStore: () => vi.fn(),
  }
})
vi.mock('@/shared/services', () => {
  return {
    IDB: {
      getAll: () => Promise.resolve([]),
    },
    OBJECT_STORE_NAME_EXTERNAL: 'EXTERNAL',
    OBJECT_STORE_NAME_FAVORITES: 'FAVORITES',
    contactNumberToPServed: () => vi.fn(),
  }
})

describe('AddToPinnedCallsCard', () => {
  let wrapper: VueWrapper<typeof Component>
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedState.addByPServed.mockClear()
    mockedState.addByDto.mockClear()
    selectedSession.value = { sessionId: 'session-1' }
  })

  const createComponent = function () {
    wrapper = mount(AddToPinnedCallsCard, {
      props: {
        order: 2,
      },
      global: {
        plugins: [ createTestingPinia() ],
      },
    }) as unknown as VueWrapper<typeof Component>
  }

  it('call onClick method', async () => {
    // Arrange
    createComponent()
    const spy = vi.spyOn(wrapper.vm, 'onClick')

    // Act
    await wrapper.find(AddBtnSelector).trigger('click')

    // Assert
    expect(spy).toHaveBeenCalled()
    expect(mockedState.addByPServed).toHaveBeenCalledWith('1231', 2, 'session-1')
  })

  it('Add to Pinned - check props', async () => {
    // Arrange
    createComponent()

    // Assert
    // @ts-expect-error not found props order
    expect(wrapper.props().order).toBe(2)
  })

  it('should pass selected dto to pinned store when selected session is absent', async () => {
    selectedSession.value = null
    createComponent()

    // Act
    await wrapper.find(AddBtnSelector).trigger('click')

    // Assert
    expect(mockedState.addByDto).toHaveBeenCalledWith(expect.objectContaining({
      pServed: '1231',
      name: 'name',
    }), 2)
  })
})

