import { PServed } from '@wui/im'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref, shallowRef } from 'vue'

import type { Contact } from '@/entities/contact'

import { useContactCachedStore } from '../model/use-contact-cached-store'

const fetchContactsMock = vi.fn()
const fetchContactGroupsMock = vi.fn(() => Promise.resolve({ data: [] }))
const fetchExternalContactsFromIndexedDbMock = vi.fn(() => Promise.resolve())
const deleteExternalContactFromIndexedDbMock = vi.fn()
const externalContactsFromIndexedDb = shallowRef(new Map<PServed, Contact>())
const currentUser = ref()

vi.mock('@/entities/contact', () => ({
  isExternalContactDto: (contact: Contact) => {
    if (contact.contactType) {
      return contact.contactType === 'externalContact'
    }

    return !contact.imLogin && !contact.internalNumber
  },
  useContactApi: () => ({
    fetchContacts: fetchContactsMock,
    fetchContactGroups: fetchContactGroupsMock,
  }),
  useContactStore: () => ({
    externalContactsFromIndexedDb,
    fetchExternalContactsFromIndexedDb: fetchExternalContactsFromIndexedDbMock,
    deleteExternalContactFromIndexedDb: deleteExternalContactFromIndexedDbMock,
  }),
}))

vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser,
  }),
}))

vi.mock('@/shared/services', () => ({
  contactNumberToPServed: (internalNumber: string) => `<sip:${internalNumber}@ROOT>`,
  contactPServedToNumber: (pServed: string) => pServed.replace('<sip:', '').replace('@ROOT>', ''),
}))

const createExternalContact = (pServed: PServed): Contact => ({
  pServed,
  internalNumber: '100',
  name: '100 (Внешний контакт)',
  organization: '',
  organizationalUnit: 'Внешний контакт',
  groupIds: [],
  id: 'external-100',
  imLogin: '',
  terminalLogin: '',
  terminalPassword: '',
  isExternal: true,
  groups: [],
})

const createUserContact = (pServed: PServed): Contact => ({
  pServed,
  internalNumber: '100',
  name: 'Alice',
  organization: '',
  organizationalUnit: 'Support',
  groupIds: [],
  id: 'user-100',
  imLogin: pServed,
  terminalLogin: '',
  terminalPassword: '',
  isExternal: false,
  groups: [],
})

const createBackendExternalContact = (pServed: PServed): Contact => ({
  ...createUserContact(pServed),
  id: 'external-backend-100',
  imLogin: '',
  contactType: 'externalContact',
  isExternal: false,
})

describe('useContactCachedStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchContactsMock.mockReset()
    fetchContactGroupsMock.mockClear()
    fetchExternalContactsFromIndexedDbMock.mockClear()
    deleteExternalContactFromIndexedDbMock.mockClear()
    currentUser.value = undefined

    externalContactsFromIndexedDb.value.clear()
  })

  it('fetches real contact even when external fallback exists with the same pServed', async () => {
    const pServed = '<sip:100@ROOT>'
    const externalContact = createExternalContact(pServed)
    const userContact = createUserContact(pServed)

    externalContactsFromIndexedDb.value.set(pServed, externalContact)
    fetchContactsMock.mockResolvedValue({
      data: {
        list: [userContact],
        page: {
          currentPage: 1,
          total: 1,
          lastPage: 1,
          perPage: 1,
        },
      },
    })

    const store = useContactCachedStore()

    const result = await store.fetchContactsBySomeIds(pServed)

    expect(fetchContactsMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual([expect.objectContaining({ name: 'Alice', isExternal: false })])
    expect(store.contacts.get(pServed)).toEqual(expect.objectContaining({ name: 'Alice', isExternal: false }))
  })

  it('replaces external fallback in getByPServed when fetchIfDoesNotExists is true', async () => {
    const pServed = '<sip:100@ROOT>'
    const externalContact = createExternalContact(pServed)
    const userContact = createUserContact(pServed)

    externalContactsFromIndexedDb.value.set(pServed, externalContact)
    fetchContactsMock.mockResolvedValue({
      data: {
        list: [userContact],
        page: {
          currentPage: 1,
          total: 1,
          lastPage: 1,
          perPage: 1,
        },
      },
    })

    const store = useContactCachedStore()

    const result = await store.getByPServed(pServed, true)

    expect(fetchContactsMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expect.objectContaining({ name: 'Alice', isExternal: false }))
  })

  it('marks fetched backend external contact by contactType', async () => {
    const pServed = '<sip:100@ROOT>'
    const externalContact = createBackendExternalContact(pServed)

    fetchContactsMock.mockResolvedValue({
      data: {
        list: [externalContact],
        page: {
          currentPage: 1,
          total: 1,
          lastPage: 1,
          perPage: 1,
        },
      },
    })

    const store = useContactCachedStore()

    const result = await store.fetchContactsBySomeIds(pServed, 'pServed', true)

    expect(fetchContactsMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual([expect.objectContaining({ contactType: 'externalContact', isExternal: true })])
    expect(store.contacts.get(pServed)).toEqual(expect.objectContaining({ contactType: 'externalContact', isExternal: true }))
  })
})
