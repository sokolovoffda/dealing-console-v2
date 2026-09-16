import { isBroadcastGroupsLayoutCount } from './broadcast-groups-layout'

describe('broadcast-groups-layout', () => {
  it('should accept only 4 and 8 as layout counts', () => {
    // Arrange / Act / Assert
    expect(isBroadcastGroupsLayoutCount(4)).toBe(true)
    expect(isBroadcastGroupsLayoutCount(8)).toBe(true)
    expect(isBroadcastGroupsLayoutCount(7)).toBe(false)
    expect(isBroadcastGroupsLayoutCount('4')).toBe(false)
  })
})
