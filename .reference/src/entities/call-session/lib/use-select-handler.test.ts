import { ConferenceType } from '@wui/im'
import { vi } from 'vitest'

const CONF_PSERVED = '<sip:ROOMS-test-room@ROOT>'

const mocks = vi.hoisted(() => ({
  setCallManagerState: vi.fn(),
  getSessionById: vi.fn(),
  getSessionByPServed: vi.fn(),
  getConfByPServed: vi.fn(),
  addConference: vi.fn(),
  isPServedSession: vi.fn(),
}))

vi.mock('@/widgets/call-manager', () => ({
  CallManagerState: {
    INCOMING_CALL: 2,
    CONFERENCE_CALL: 5,
    CONFERENCE_VIEW: 4,
  },
  useCallManagerState: () => ({
    setCallManagerState: mocks.setCallManagerState,
  }),
}))

vi.mock('@/entities/call-session', () => ({
  usePinnedCallsStore: () => ({
    activePinnedCall: {
      pServed: CONF_PSERVED,
      sessionId: null,
      title: 'Pinned Conference',
    },
    isPServedSession: mocks.isPServedSession,
  }),
  useSessionStore: () => ({
    getSessionById: mocks.getSessionById,
    getSessionByPServed: mocks.getSessionByPServed,
  }),
  STATE: {
    RINGING: 'RINGING',
  },
}))

vi.mock('@/entities/group-contacts', () => ({
  useGroupContactsStore: () => ({
    isEditMode: false,
    removeFromAllGroups: vi.fn(),
  }),
}))

vi.mock('@/entities/conference/model/use-conference-state', () => ({
  default: () => ({
    getConfByPServed: mocks.getConfByPServed,
    addConference: mocks.addConference,
  }),
}))

vi.mock('@/features/create-conference-from-tet-a-tet', () => ({
  useCreateConferenceFromTetATet: () => ({
    creating: { value: false },
    toggleContact: vi.fn(),
  }),
}))

vi.mock('@/features/refer-call', () => ({
  useReferCallState: () => ({
    selectedReferType: { value: null },
    executeRefer: vi.fn(),
    finishProcess: vi.fn(),
  }),
}))

vi.mock('@/entities/conference/model/use-conference-draft', () => ({
  default: () => ({
    isActive: { value: false },
    addDraftConferenceSubscriber: vi.fn(),
    deleteDraftConferenceSubscriber: vi.fn(),
    conferenceDraft: { value: null },
  }),
}))

vi.mock('@/shared/controller', () => ({
  useHandsetPickupHangupHandler: () => ({
    hangupHandsetHandler: vi.fn(),
  }),
}))

vi.mock('@/shared/jssip', () => ({
  useWebRTC: () => ({
    switchToCall: vi.fn(),
  }),
}))

vi.mock('@/entities/contact', () => ({
  useContactCachedStore: () => ({
    getLocalByPServed: vi.fn(),
    getByPServed: vi.fn(),
  }),
}))

vi.mock('@/shared/composables', () => ({
  useConfigurationState: () => ({
    configuration: { value: { domainPath: 'ROOT' } },
  }),
}))

vi.mock('@/entities/call-session/model/use-pinned-calls-store', () => ({
  usePinnedCallsStore: () => ({
    pinnedCalls: new Map(),
  }),
}))

import { checkDtoByPServed, selectConference } from './use-select-handler'

const ROOM_GUID = '4BD87736B65862772AFA6DE721EE5AF7'
const ROOM_PSERVED = `<sip:ROOMS-${ROOM_GUID}@ROOT>`
const MISCLASSIFIED_PSERVED = `<sip:${ROOM_GUID}@ROOT>`

describe('checkDtoByPServed', () => {
  beforeEach(() => {
    mocks.getConfByPServed.mockReset()
    mocks.addConference.mockReset()
    mocks.getConfByPServed.mockReturnValue(undefined)
  })

  it('should return conference stub when IM state is empty', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const result = checkDtoByPServed(CONF_PSERVED, { title: 'Queue Conference' })

    // Assert
    expect(result.type).toBe('conference')
    expect(result.dto).toEqual(expect.objectContaining({
      pServed: CONF_PSERVED,
      name: 'Queue Conference',
      subscribers: [],
    }))
    expect(mocks.addConference).toHaveBeenCalled()
  })

  it('should resolve incoming conference by room GUID when pServed looks like contact', () => {
    // Arrange
    mocks.getConfByPServed.mockReturnValue(undefined)

    // Act
    const result = checkDtoByPServed(MISCLASSIFIED_PSERVED, {
      number: ROOM_GUID,
      title: 'Moderated Conference Aug 17',
    })

    // Assert
    expect(result.type).toBe('conference')
    expect(result.dto).toEqual(expect.objectContaining({
      pServed: ROOM_PSERVED,
      name: 'Moderated Conference Aug 17',
      subscribers: [],
    }))
  })

  it('should return contact for regular internal pServed', () => {
    // Arrange
    const contactPServed = '<sip:9001@ROOT>'

    // Act
    const result = checkDtoByPServed(contactPServed, { number: '9001' })

    // Assert
    expect(result.type).toBe('contact')
    expect(result.dto).toEqual(expect.objectContaining({
      internalNumber: '9001',
    }))
  })
})

describe('selectConference', () => {
  beforeEach(() => {
    mocks.setCallManagerState.mockReset()
    mocks.getSessionById.mockReset()
    mocks.getSessionByPServed.mockReset()
    mocks.getConfByPServed.mockReset()
    mocks.isPServedSession.mockReset()
    mocks.getSessionById.mockReturnValue(undefined)
    mocks.getSessionByPServed.mockReturnValue(undefined)
    mocks.getConfByPServed.mockReturnValue(undefined)
    mocks.isPServedSession.mockReturnValue(false)
  })

  it('should open CONFERENCE_VIEW with stub when conference is missing and session is absent', () => {
    // Arrange
    const partialConference = {
      pServed: CONF_PSERVED,
      name: 'Pinned Conference',
    }

    // Act
    selectConference(partialConference as never, 'Pinned Conference')

    // Assert
    expect(mocks.setCallManagerState).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        pServed: CONF_PSERVED,
        name: 'Pinned Conference',
        selectorMode: ConferenceType.FREE_FOR_ALL,
        subscribers: [],
      }),
    )
  })

  it('should open CONFERENCE_CALL when live session exists', () => {
    // Arrange
    const conference = {
      name: 'Live Conference',
      pServed: CONF_PSERVED,
      capacity: 10,
      domainPath: 'ROOT',
      selectorMode: ConferenceType.FREE_FOR_ALL,
      subscribers: [],
    }
    mocks.getConfByPServed.mockReturnValue(conference)
    mocks.getSessionByPServed.mockReturnValue({
      sessionId: 'session-1',
      sessionState: { value: 'CONNECTED' },
      callId: { value: 'call-1' },
    })

    // Act
    selectConference(conference)

    // Assert
    expect(mocks.setCallManagerState).toHaveBeenCalledWith(
      5,
      conference,
      {
        sessionId: 'session-1',
        callId: 'call-1',
      },
    )
  })

  it('should open CONFERENCE_VIEW for ringing pinned conference', () => {
    // Arrange
    const conference = {
      name: 'Pinned Conference',
      pServed: CONF_PSERVED,
      capacity: 10,
      domainPath: 'ROOT',
      selectorMode: ConferenceType.FREE_FOR_ALL,
      subscribers: [],
    }
    mocks.isPServedSession.mockReturnValue(true)
    mocks.getConfByPServed.mockReturnValue(conference)
    mocks.getSessionByPServed.mockReturnValue({
      sessionId: 'session-ringing',
      sessionState: { value: 'RINGING' },
      callId: { value: 'call-ringing' },
    })

    // Act
    selectConference(conference)

    // Assert
    expect(mocks.setCallManagerState).toHaveBeenCalledWith(
      4,
      conference,
      {
        sessionId: 'session-ringing',
        callId: 'call-ringing',
      },
    )
  })

  it('should open INCOMING_CALL for ringing non-pinned conference', () => {
    // Arrange
    const conference = {
      name: 'Queue Conference',
      pServed: CONF_PSERVED,
      capacity: 10,
      domainPath: 'ROOT',
      selectorMode: ConferenceType.FREE_FOR_ALL,
      subscribers: [],
    }
    mocks.isPServedSession.mockReturnValue(false)
    mocks.getConfByPServed.mockReturnValue(conference)
    mocks.getSessionByPServed.mockReturnValue({
      sessionId: 'session-ringing',
      sessionState: { value: 'RINGING' },
      callId: { value: 'call-ringing' },
    })

    // Act
    selectConference(conference)

    // Assert
    expect(mocks.setCallManagerState).toHaveBeenCalledWith(
      2,
      conference,
      {
        sessionId: 'session-ringing',
        callId: 'call-ringing',
      },
    )
  })
})
