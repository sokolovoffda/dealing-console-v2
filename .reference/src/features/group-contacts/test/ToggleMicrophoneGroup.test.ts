import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import { GroupContacts } from '@/entities/group-contacts'

import Component from '../ui/ToggleMicrophoneGroup.vue'

vi.mock('@/entities/group-contacts', () => {
  return {
    useGroupContactsStore: () => ({
      groupContacts: ref(new Map<number, GroupContacts>([
        [0, { micState: true, volumeState: true, members: [] }],
        [1, { micState: false, volumeState: false, members: [] }],
        [2, { micState: false, volumeState: false, members: [] }],
        [3, { micState: false, volumeState: false, members: [] }],
        [4, { micState: false, volumeState: false, members: [] }],
        [5, { micState: false, volumeState: false, members: [] }],
        [6, { micState: false, volumeState: false, members: [] }],
      ])),
      isEditMode: ref<boolean>(true),
      addPinnedCall: vi.fn(),
      removeContact: vi.fn(),
      removeFromAllGroups: vi.fn(),
      toggleMicForGroup: vi.fn(),
      toggleVolumeForGroup: vi.fn(),
      getGroupByIdx: vi.fn(),
      loadByPreferences: vi.fn(),
    }),
  }
})
vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => ({}),
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


describe('ToggleMicrophoneGroup', () => {
  it('test isEditMode ref', () => {
    const wrapper = mount(Component, {
      props: {
        groupIdx: 2,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    })
    expect(wrapper.html()).toContain('disabled')
  })
})
