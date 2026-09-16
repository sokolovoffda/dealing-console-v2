import { ConferenceType } from '@wui/im'
import { vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getConfByPServed: vi.fn(),
  addConference: vi.fn(),
  pinnedCalls: new Map<number, { pServed: string; title: string } | null>(),
}))

vi.mock('@/shared/composables', () => ({
  useConfigurationState: () => ({
    configuration: { value: { domainPath: 'ROOT' } },
  }),
}))

vi.mock('@/entities/call-session/model/use-pinned-calls-store', () => ({
  usePinnedCallsStore: () => ({
    pinnedCalls: mocks.pinnedCalls,
  }),
}))

vi.mock('../model/use-conference-state', () => ({
  default: () => ({
    getConfByPServed: mocks.getConfByPServed,
    addConference: mocks.addConference,
  }),
}))

import {
  createConferenceStub,
  resolveConferenceByNumber,
  resolveConferenceByPServed,
  resolveIncomingConferenceFromRemoteNumber,
} from './resolve-conference-by-p-served'

const CONF_PSERVED = '<sip:ROOMS-test-room@ROOT>'
const ROOM_GUID = '4BD87736B65862772AFA6DE721EE5AF7'
const ROOM_PSERVED = `<sip:ROOMS-${ROOM_GUID}@ROOT>`

describe('resolveConferenceByPServed', () => {
  beforeEach(() => {
    mocks.getConfByPServed.mockReset()
  })

  it('should return conference from state when it exists', () => {
    // Arrange
    const conference = {
      name: 'State Conference',
      pServed: CONF_PSERVED,
      capacity: 10,
      domainPath: 'ROOT',
      selectorMode: ConferenceType.FREE_FOR_ALL,
      subscribers: [],
    }
    mocks.getConfByPServed.mockReturnValue(conference)

    // Act
    const resolved = resolveConferenceByPServed(CONF_PSERVED, { title: 'Pinned Title' })

    // Assert
    expect(resolved).toBe(conference)
  })

  it('should return stub when conference is missing in state', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const resolved = resolveConferenceByPServed(CONF_PSERVED, { title: 'Pinned Conference' })

    // Assert
    expect(resolved).toEqual(createConferenceStub(CONF_PSERVED, { title: 'Pinned Conference' }))
    expect(resolved.subscribers).toEqual([])
    expect(mocks.addConference).toHaveBeenCalledWith(resolved)
  })

  it('should fall back to pServed number when title is empty', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const resolved = resolveConferenceByPServed(CONF_PSERVED)

    // Assert
    expect(resolved.name).toBe('test-room')
  })

  it('should resolve conference stub by room guid', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const resolved = resolveConferenceByNumber('test-room')

    // Assert
    expect(resolved).toEqual(createConferenceStub(CONF_PSERVED))
    expect(mocks.addConference).toHaveBeenCalledWith(resolved)
  })
})

describe('resolveIncomingConferenceFromRemoteNumber', () => {
  beforeEach(() => {
    mocks.getConfByPServed.mockReset()
    mocks.addConference.mockReset()
    mocks.pinnedCalls.clear()
  })

  it('should return conference from IM state', () => {
    // Arrange
    const conference = {
      name: 'IM Conference',
      pServed: ROOM_PSERVED,
      capacity: 10,
      domainPath: 'ROOT',
      selectorMode: ConferenceType.FREE_FOR_ALL,
      subscribers: [],
    }
    mocks.getConfByPServed.mockImplementation((pServed: string) => {
      if (pServed === ROOM_PSERVED) {
        return conference
      }

      return undefined
    })

    // Act
    const resolved = resolveIncomingConferenceFromRemoteNumber(ROOM_GUID)

    // Assert
    expect(resolved).toBe(conference)
    expect(mocks.addConference).not.toHaveBeenCalled()
  })

  it('should resolve pinned conference stub when IM state is empty', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)
    mocks.pinnedCalls.set(1, {
      pServed: ROOM_PSERVED,
      title: 'Pinned Conference',
    })

    // Act
    const resolved = resolveIncomingConferenceFromRemoteNumber(ROOM_GUID)

    // Assert
    expect(resolved).toEqual(createConferenceStub(ROOM_PSERVED, { title: 'Pinned Conference' }))
    expect(mocks.addConference).toHaveBeenCalledWith(resolved)
  })

  it('should create stub for incoming room GUID without IM and pinned data', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const resolved = resolveIncomingConferenceFromRemoteNumber(ROOM_GUID, {
      title: 'Moderated Conference Aug 17',
    })

    // Assert
    expect(resolved).toEqual(createConferenceStub(ROOM_PSERVED, { title: 'Moderated Conference Aug 17' }))
    expect(mocks.addConference).toHaveBeenCalledWith(resolved)
  })

  it('should return undefined for regular internal number', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const resolved = resolveIncomingConferenceFromRemoteNumber('9001')

    // Assert
    expect(resolved).toBeUndefined()
    expect(mocks.addConference).not.toHaveBeenCalled()
  })
})
