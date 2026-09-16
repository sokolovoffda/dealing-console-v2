import { vi } from 'vitest'

import { useWorkspaceGroupContacts } from './use-workspace-group-contacts'

const mocks = vi.hoisted(() => ({
  fetchAllGroupsMock: vi.fn(() => Promise.resolve([
    { guid: 'group-1', name: 'Group 1' },
    { guid: 'group-2', name: 'Group 2' },
  ])),
  fetchContactsMock: vi.fn((query: { groupId?: string, SearchText?: string } = {}) => {
    const groupId = query.groupId ?? 'group-1'

    return Promise.resolve({
      data: {
        list: [
          {
            id: `contact-${groupId}`,
            name: `Contact ${groupId}`,
            pServed: `<sip:${groupId}@ROOT>`,
            internalNumber: groupId,
            groupIds: [groupId],
            imLogin: `<sip:${groupId}@ROOT>`,
            terminalLogin: `terminal-${groupId}`,
            terminalPassword: `password-${groupId}`,
          },
        ],
        page: {
          currentPage: 1,
          lastPage: 1,
          perPage: 100,
          total: 1,
        },
      },
    })
  }),
}))

vi.mock('@/entities/contact', () => {
  return {
    isExternalContactDto: (contact: { contactType?: string, imLogin?: string, internalNumber?: string }) => {
      if (contact.contactType) {
        return contact.contactType === 'externalContact'
      }

      return !contact.imLogin && !contact.internalNumber
    },
    useContactApi: () => ({
      fetchContacts: mocks.fetchContactsMock,
    }),
    useContactStore: () => ({
      fetchAllGroups: mocks.fetchAllGroupsMock,
    }),
  }
})

vi.mock('@/shared/services', () => {
  return {
    contactNumberToPServed: (value: string) => `<sip:${value}@ROOT>`,
  }
})

describe('useWorkspaceGroupContacts', () => {
  beforeEach(() => {
    mocks.fetchAllGroupsMock.mockClear()
    mocks.fetchContactsMock.mockClear()
  })

  it('loads group contacts and stores them in cache', async () => {
    // Arrange
    const model = useWorkspaceGroupContacts()

    // Act
    await model.loadGroupContacts('group-1')

    // Assert
    expect(mocks.fetchContactsMock).toHaveBeenCalledWith({
      Page: 1,
      Size: 100,
      groupId: 'group-1',
    })
    expect(model.contacts.value.map(contact => contact.id)).toEqual(['contact-group-1'])
    expect(model.contactsByGroupGuid.value.has('group-1')).toEqual(true)
  })

  it('uses cached contacts when the same group is opened again', async () => {
    // Arrange
    const model = useWorkspaceGroupContacts()
    await model.loadGroupContacts('group-1')

    // Act
    await model.loadGroupContacts('group-1')

    // Assert
    expect(mocks.fetchContactsMock).toHaveBeenCalledTimes(1)
    expect(model.contacts.value.map(contact => contact.id)).toEqual(['contact-group-1'])
  })

  it('loads contacts again on forced refresh', async () => {
    // Arrange
    const model = useWorkspaceGroupContacts()
    await model.loadGroupContacts('group-1')

    // Act
    await model.refreshGroupContacts('group-1')

    // Assert
    expect(mocks.fetchContactsMock).toHaveBeenCalledTimes(2)
  })

  it('keeps cached group list when switching back to a previously opened group', async () => {
    // Arrange
    const model = useWorkspaceGroupContacts()
    await model.loadGroupContacts('group-1')
    await model.loadGroupContacts('group-2')

    // Act
    await model.loadGroupContacts('group-1')

    // Assert
    expect(mocks.fetchContactsMock).toHaveBeenCalledTimes(2)
    expect(model.contacts.value.map(contact => contact.id)).toEqual(['contact-group-1'])
  })

  it('hydrates missing fast-dial contacts by guid when groupId list is empty (WUI-5642)', async () => {
    // Arrange
    mocks.fetchContactsMock.mockImplementation((query?: { groupId?: string, SearchText?: string }) => {
      if (query?.groupId) {
        return Promise.resolve({
          data: {
            list: [],
            page: { currentPage: 1, lastPage: 1, perPage: 100, total: 0 },
          },
        })
      }

      const guid = query?.SearchText ?? 'contact-from-fast-dial'

      return Promise.resolve({
        data: {
          list: [{
            id: guid,
            guid,
            name: `Resolved ${guid}`,
            pServed: `<sip:${guid}@ROOT>`,
            internalNumber: '100',
            groupIds: [] as string[],
            imLogin: `<sip:${guid}@ROOT>`,
            terminalLogin: 'terminal',
            terminalPassword: 'password',
          }],
          page: { currentPage: 1, lastPage: 1, perPage: 20, total: 1 },
        },
      })
    })
    const model = useWorkspaceGroupContacts()
    await model.loadGroupContacts('group-1')

    // Act
    await model.hydrateMissingContacts('group-1', ['contact-from-fast-dial'])

    // Assert
    expect(mocks.fetchContactsMock).toHaveBeenCalledWith({
      Page: 1,
      Size: 20,
      SearchText: 'contact-from-fast-dial',
    })
    expect(model.contacts.value.map(contact => contact.guid || contact.id)).toEqual(['contact-from-fast-dial'])
  })
})
