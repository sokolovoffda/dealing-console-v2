import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import { useContactTabs } from '../model/use-contact-tabs'

const mocks = vi.hoisted(() => ({
  fetchAllGroupsMock: vi.fn(() => Promise.resolve([
    { guid: 'group-2', name: 'Group 2', type: 'user' },
    { guid: 'group-1', name: 'Group 1', type: 'user' },
  ])),
}))

vi.mock('@/entities/contact', () => {
  return {
    useContactStore: () => ({
      fetchAllGroups: mocks.fetchAllGroupsMock,
    }),
  }
})

describe('useContactTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.fetchAllGroupsMock.mockClear()
    mocks.fetchAllGroupsMock.mockResolvedValue([
      { guid: 'group-2', name: 'Group 2', type: 'user' },
      { guid: 'group-1', name: 'Group 1', type: 'user' },
    ])
  })

  it('maps backend groups to contact tabs', async () => {
    // Arrange
    const store = useContactTabs()

    // Act
    await store.initTabs()

    // Assert
    expect(mocks.fetchAllGroupsMock).toHaveBeenCalledWith(false)
    expect(store.tabs).toEqual([
      {
        id: 'group-2',
        groupGuid: 'group-2',
        name: 'Group 2',
        order: 1,
        enabled: true,
      },
      {
        id: 'group-1',
        groupGuid: 'group-1',
        name: 'Group 1',
        order: 2,
        enabled: true,
      },
    ])
    expect(store.activeTabId).toEqual('group-2')
    expect(store.activeTab?.groupGuid).toEqual('group-2')
    expect(store.isInitialized).toEqual(true)
    expect(store.loading).toEqual(false)
    expect(store.error).toEqual(null)
  })

  it('returns sorted and enabled tabs', async () => {
    // Arrange
    const store = useContactTabs()

    // Act
    await store.initTabs()

    // Assert
    expect(store.sortedTabs.map(tab => tab.id)).toEqual(['group-2', 'group-1'])
    expect(store.enabledTabs.map(tab => tab.id)).toEqual(['group-2', 'group-1'])
    expect(store.hasTabs).toEqual(true)
  })

  it('maps only user backend groups to contact tabs', async () => {
    // Arrange
    mocks.fetchAllGroupsMock.mockResolvedValue([
      { guid: 'predefined-group', name: 'Predefined Group', type: 'predefined' },
      { guid: 'shared-group', name: 'Shared Group', type: 'predefinedShared' },
      { guid: 'user-group', name: 'User Group', type: 'user' },
    ])
    const store = useContactTabs()

    // Act
    await store.initTabs()

    // Assert
    expect(store.tabs.map(tab => tab.groupGuid)).toEqual(['user-group'])
    expect(store.activeTabId).toEqual('user-group')
  })

  it('selects first tab after initialization and changes active tab by id', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()

    // Act
    store.setActiveTab('group-1')

    // Assert
    expect(store.activeTabId).toEqual('group-1')
    expect(store.activeTab?.groupGuid).toEqual('group-1')
  })

  it('does not fetch groups again when tabs are initialized', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()

    // Act
    await store.initTabs()

    // Assert
    expect(mocks.fetchAllGroupsMock).toHaveBeenCalledTimes(1)
  })

  it('fetches groups again when initTabs is forced', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()

    // Act
    await store.initTabs(true)

    // Assert
    expect(mocks.fetchAllGroupsMock).toHaveBeenCalledTimes(2)
  })

  it('refreshes groups and keeps active tab when its group exists', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()
    store.setActiveTab('group-1')
    mocks.fetchAllGroupsMock.mockResolvedValue([
      { guid: 'group-1', name: 'Group 1 updated', type: 'user' },
      { guid: 'group-3', name: 'Group 3', type: 'user' },
    ])

    // Act
    await store.refreshTabs()

    // Assert
    expect(mocks.fetchAllGroupsMock).toHaveBeenCalledTimes(2)
    expect(store.tabs.map(tab => tab.groupGuid)).toEqual(['group-1', 'group-3'])
    expect(store.activeTabId).toEqual('group-1')
    expect(store.activeTab?.name).toEqual('Group 1 updated')
  })

  it('adds created tab locally and activates it without waiting for fetch', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()

    // Act
    store.addTabAndActivate({ guid: 'group-new', name: 'New Group' })

    // Assert
    expect(store.tabs.map(tab => tab.groupGuid)).toEqual(['group-2', 'group-1', 'group-new'])
    expect(store.activeTabId).toEqual('group-new')
    expect(mocks.fetchAllGroupsMock).toHaveBeenCalledTimes(1)
  })

  it('removes deleted tab locally and activates preferred neighbor', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()
    store.setActiveTab('group-1')

    // Act
    store.removeTabAndActivate('group-1', 'group-2')

    // Assert
    expect(store.tabs.map(tab => tab.groupGuid)).toEqual(['group-2'])
    expect(store.activeTabId).toEqual('group-2')
    expect(mocks.fetchAllGroupsMock).toHaveBeenCalledTimes(1)
  })

  it('clears active tab when last group is removed locally', async () => {
    // Arrange
    mocks.fetchAllGroupsMock.mockResolvedValue([
      { guid: 'group-only', name: 'Only Group', type: 'user' },
    ])
    const store = useContactTabs()
    await store.initTabs()

    // Act
    store.removeTabAndActivate('group-only')

    // Assert
    expect(store.tabs).toEqual([])
    expect(store.activeTabId).toEqual(null)
    expect(store.hasTabs).toEqual(false)
  })

  it('selects preferred tab after refresh when provided', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()
    store.setActiveTab('group-2')
    mocks.fetchAllGroupsMock.mockResolvedValue([
      { guid: 'group-2', name: 'Group 2', type: 'user' },
      { guid: 'group-1', name: 'Group 1', type: 'user' },
      { guid: 'group-3', name: 'Group 3', type: 'user' },
    ])

    // Act
    await store.refreshTabs('group-3')

    // Assert
    expect(store.activeTabId).toEqual('group-3')
    expect(store.activeTab?.groupGuid).toEqual('group-3')
  })

  it('falls back to first tab when preferred group is missing after refresh', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()
    mocks.fetchAllGroupsMock.mockResolvedValue([
      { guid: 'group-3', name: 'Group 3', type: 'user' },
      { guid: 'group-4', name: 'Group 4', type: 'user' },
    ])

    // Act
    await store.refreshTabs('deleted-group')

    // Assert
    expect(store.activeTabId).toEqual('group-3')
    expect(store.activeTab?.groupGuid).toEqual('group-3')
  })

  it('selects first available tab when active group disappears after refresh', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()
    store.setActiveTab('group-1')
    mocks.fetchAllGroupsMock.mockResolvedValue([
      { guid: 'group-3', name: 'Group 3', type: 'user' },
      { guid: 'group-4', name: 'Group 4', type: 'user' },
    ])

    // Act
    await store.refreshTabs()

    // Assert
    expect(store.activeTabId).toEqual('group-3')
    expect(store.activeTab?.groupGuid).toEqual('group-3')
  })

  it('resets active tab when all groups disappear after refresh', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()
    mocks.fetchAllGroupsMock.mockResolvedValue([])

    // Act
    await store.refreshTabs()

    // Assert
    expect(store.tabs).toEqual([])
    expect(store.activeTabId).toEqual(null)
    expect(store.activeTab).toEqual(null)
  })

  it('ignores unknown active tab id', async () => {
    // Arrange
    const store = useContactTabs()
    await store.initTabs()

    // Act
    store.setActiveTab('unknown')

    // Assert
    expect(store.activeTabId).toEqual('group-2')
    expect(store.activeTab?.groupGuid).toEqual('group-2')
  })

  it('handles empty backend groups list', async () => {
    // Arrange
    mocks.fetchAllGroupsMock.mockResolvedValue([])
    const store = useContactTabs()

    // Act
    await store.initTabs()

    // Assert
    expect(store.tabs).toEqual([])
    expect(store.activeTabId).toEqual(null)
    expect(store.activeTab).toEqual(null)
    expect(store.hasTabs).toEqual(false)
    expect(store.isInitialized).toEqual(true)
  })

  it('stores loading error and resets tabs', async () => {
    // Arrange
    mocks.fetchAllGroupsMock.mockRejectedValue(new Error('Network error'))
    const store = useContactTabs()

    // Act
    await store.initTabs()

    // Assert
    expect(store.tabs).toEqual([])
    expect(store.activeTabId).toEqual(null)
    expect(store.error).toEqual('Network error')
    expect(store.isInitialized).toEqual(false)
    expect(store.loading).toEqual(false)
  })
})
