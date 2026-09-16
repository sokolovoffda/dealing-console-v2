import { PServed } from '@wui/im'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref, shallowRef } from 'vue'

import { Contact, useContactStore } from '@/entities/contact'

const GROUPS = [
  { guid: 'group-1', name: 'Group 1' },
  { guid: 'group-2', name: 'Group 2' },
  { guid: 'group-3', name: 'Group 3' },
]

const GROUP_COUNTS = {
  [GROUPS[0].guid]: 7,
  [GROUPS[1].guid]: 3,
  [GROUPS[2].guid]: 0,
} as const

const contactGenerator = (index: number): Contact => {
  const generatePassword = (length: number): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  const generateName = () => {
    const adjectives = ['Red', 'Brave', 'Mighty', 'Quick', 'Bright']
    const nouns = ['Lion', 'Eagle', 'Bear', 'Wolf', 'Tiger']
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${randomAdjective} ${randomNoun}`
  }

  const phone = `${1000 + index}`
  const groupGuid = GROUPS[index % 2]?.guid ?? GROUPS[0].guid

  return {
    groups: GROUPS.filter(group => group.guid === groupGuid),
    terminalPassword: generatePassword(10),
    terminalLogin: `${2000 + index}`,
    internalNumber: phone,
    id: `${index + 1}`,
    pServed: `<sip:${phone}@ROOT>`,
    imLogin: `<sip:${phone}@ROOT>`,
    name: generateName(),
    groupIds: [groupGuid],
  }
}

const mockContacts = shallowRef(new Map<PServed, Contact>())
const CONTACTS_COUNT = 20
new Array(CONTACTS_COUNT).fill(0).map((_, index) => contactGenerator(index)).forEach((contact: Contact) => {
  mockContacts.value.set(contact.pServed, contact)
})

vi.mock('@/entities/contact/api/use-contact-api', () => ({
  useContactApi: () => ({
    fetchContacts: (query?: { groupId?: string }) => {
      if (query?.groupId) {
        const total = GROUP_COUNTS[query.groupId as keyof typeof GROUP_COUNTS] ?? 0
        return Promise.resolve({
          data: {
            list: [],
            page: {
              currentPage: 1,
              total,
              lastPage: 1,
              perPage: 1,
            },
          },
        })
      }

      return Promise.resolve({ 
        data: { 
          list: Array.from(mockContacts.value.values()),
          page: {
            currentPage: 1,
            total: CONTACTS_COUNT,
            lastPage: 1,
            perPage: CONTACTS_COUNT,
          },
        },
      })
    },
    fetchContactGroups: () => Promise.resolve({ data: GROUPS }),
  }),
}))
vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser: ref(undefined),
  }),
}))
vi.mock('@/entities/call-session', () => {
  return {
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

describe('test use contact store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const fillContactsStore = () => {
    useContactStore().contacts = mockContacts.value
  }

  it('test fetch function', async () => {
    const store = useContactStore()
    const result = await store.fetchData({ Page: 1, Size: CONTACTS_COUNT }) as Map<string, Contact>
    expect(result.size).toBe(CONTACTS_COUNT)
    expect(Array.from(result.values()).every(contact => contact.groups.every(group => 'guid' in group))).toBe(true)
  })

  it('test getByInternalNumber function', () => {
    const store = useContactStore()
    fillContactsStore()
    const arrayContact = Array.from(store.contacts.values())
    const internalNumbers = arrayContact.map((c) => c.internalNumber)
    internalNumbers.forEach((internalNumber, index) => {
      const contact = store.getByInternalNumber(internalNumber)
      expect(contact).toEqual(arrayContact[index])
    })
  })

  it('test getByPServed function', async () => {
    const store = useContactStore()
    fillContactsStore()
    const contact = mockContacts.value.values().next().value! // 1st element
    const result = store.getByPServed(contact.pServed)
    expect(result).toEqual(contact)
  })

  it('test fetchAllGroups function returns groups with guid', async () => {
    const store = useContactStore()
    const result = await store.fetchAllGroups(false)

    expect(result).toEqual(GROUPS)
  })

  it('test fetchGroupContactCounts and fetchNonEmptyGroups functions', async () => {
    const store = useContactStore()

    const counts = await store.fetchGroupContactCounts(false)
    const nonEmptyGroups = await store.fetchNonEmptyGroups(false)

    expect(counts.get(GROUPS[0].guid)).toBe(GROUP_COUNTS[GROUPS[0].guid])
    expect(counts.get(GROUPS[1].guid)).toBe(GROUP_COUNTS[GROUPS[1].guid])
    expect(counts.get(GROUPS[2].guid)).toBe(GROUP_COUNTS[GROUPS[2].guid])
    expect(nonEmptyGroups).toEqual([GROUPS[0], GROUPS[1]])
  })
})
