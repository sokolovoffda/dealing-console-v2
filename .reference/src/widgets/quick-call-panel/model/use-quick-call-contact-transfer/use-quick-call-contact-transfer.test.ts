import { vi } from 'vitest'

import { useQuickCallContactTransfer } from './use-quick-call-contact-transfer'

const mocks = vi.hoisted(() => ({
  fetchGroup: vi.fn(),
  updateGroup: vi.fn(),
}))

vi.mock('@/entities/group', () => {
  return {
    useGroupStore: () => ({
      fetchGroup: mocks.fetchGroup,
      updateGroup: mocks.updateGroup,
    }),
  }
})

describe('useQuickCallContactTransfer (WUI-5642)', () => {
  beforeEach(() => {
    mocks.fetchGroup.mockReset()
    mocks.updateGroup.mockReset()
  })

  it('should skip RTU updateGroup when group has no contactGuids', async () => {
    // Arrange
    mocks.fetchGroup.mockResolvedValue({
      guid: 'group-1',
      name: 'Group_1',
      type: 'user',
    })
    const { addContactToGroup } = useQuickCallContactTransfer()

    // Act
    const added = await addContactToGroup({
      contactGuid: 'contact-1',
      targetGroupGuid: 'group-1',
    })

    // Assert
    expect(added).toBe(true)
    expect(mocks.updateGroup).not.toHaveBeenCalled()
  })

  it('should call updateGroup when contactGuids are supported', async () => {
    // Arrange
    mocks.fetchGroup.mockResolvedValue({
      guid: 'group-1',
      name: 'Group_1',
      type: 'user',
      contactGuids: ['contact-0'],
    })
    mocks.updateGroup.mockResolvedValue({
      guid: 'group-1',
      name: 'Group_1',
      type: 'user',
      contactGuids: ['contact-0', 'contact-1'],
    })
    const { addContactToGroup } = useQuickCallContactTransfer()

    // Act
    const added = await addContactToGroup({
      contactGuid: 'contact-1',
      targetGroupGuid: 'group-1',
    })

    // Assert
    expect(added).toBe(true)
    expect(mocks.updateGroup).toHaveBeenCalledWith('group-1', {
      name: 'Group_1',
      type: 'user',
      contactGuids: ['contact-0', 'contact-1'],
    })
  })

  it('should return true without blocking when updateGroup fails', async () => {
    // Arrange
    mocks.fetchGroup.mockResolvedValue({
      guid: 'group-1',
      name: 'Group_1',
      type: 'user',
      contactGuids: [],
    })
    mocks.updateGroup.mockRejectedValue(new Error('RTU membership failed'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { addContactToGroup } = useQuickCallContactTransfer()

    // Act
    const added = await addContactToGroup({
      contactGuid: 'contact-1',
      targetGroupGuid: 'group-1',
    })

    // Assert
    expect(added).toBe(true)
    expect(mocks.updateGroup).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('should skip RTU update on remove when group has no contactGuids', async () => {
    // Arrange
    mocks.fetchGroup.mockResolvedValue({
      guid: 'group-1',
      name: 'Group_1',
      type: 'user',
    })
    const { removeContactFromGroup } = useQuickCallContactTransfer()

    // Act
    const removed = await removeContactFromGroup({
      contactGuid: 'contact-1',
      sourceGroupGuid: 'group-1',
    })

    // Assert
    expect(removed).toBe(true)
    expect(mocks.updateGroup).not.toHaveBeenCalled()
  })
})
