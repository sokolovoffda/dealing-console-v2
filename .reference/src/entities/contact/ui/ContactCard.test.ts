import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { Contact } from '@/entities/contact'
import { useGroupContactsStore } from '@/entities/group-contacts'

import ContactCard from './ContactCard.vue'

vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser: ref(undefined),
  }),
}))
vi.mock('@/entities/call-session', () => {
  return {
    usePinnedCallsStore: () => ({
      activePinnedCall: ref(null),
      setActivePinnedCall: vi.fn(),
    }),
    useSessionStore: () => ({
      ringingSessions: [],
      getSessionById: vi.fn(),
    }),
    selectContact: vi.fn(),
    STATE: {},
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

test('ContactCard mount component', async () => {
  expect(ContactCard).toBeTruthy()
  const wrapper = mount(ContactCard, {
    global: {
      plugins: [ createTestingPinia() ],
    },
    props: {
      user: <Contact>{
        name: 'Test user',
        organizationalUnit: 'Test department',
        internalNumber: '0000',
      },
    },
  })
  expect(wrapper.html()).toContain('0000')
  expect(wrapper.html()).toContain('Test user')
})

test('remove overlay covers the entire contact card without parent padding offset', async () => {
  const pinia = createTestingPinia({ stubActions: false })
  const wrapper = mount(ContactCard, {
    global: {
      plugins: [pinia],
    },
    props: {
      user: <Contact>{
        name: 'Test user',
        organizationalUnit: 'Test department',
        internalNumber: '0000',
      },
    },
  })
  useGroupContactsStore().isEditMode = true

  await wrapper.find('section').trigger('click')

  const overlay = wrapper.find('[data-test="remove-from-group-overlay"]')
  expect(overlay.exists()).toBe(true)
  expect(overlay.classes()).toEqual(expect.arrayContaining([
    'absolute',
    'inset-0',
    'flex',
    'items-center',
    'justify-center',
    'rounded-8',
  ]))
})
