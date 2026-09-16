import { vi } from 'vitest'
import { ref, type Ref } from 'vue'

import { STATE, type RTCSessionFacade } from '@/entities/call-session'

import { buildActivityMonitorQueueSessions } from '../model/build-activity-monitor-queue-sessions'

const mocks = vi.hoisted(() => ({
  isConferenceRoomNumberMock: vi.fn<(value: string) => boolean>(() => false),
}))

vi.mock('@/shared/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/services')>()

  return {
    ...actual,
    isConferenceRoomNumber: (value: string) => mocks.isConferenceRoomNumberMock(value),
  }
})

const createSession = (
  sessionId: string,
  state: STATE,
  options: {
    conference?: unknown
    pServed?: string
    number?: string
  } = {},
): RTCSessionFacade => {
  return {
    sessionId,
    sessionState: ref(state) as Ref<STATE>,
    conference: options.conference as RTCSessionFacade['conference'],
    pServed: options.pServed ?? `sip:${sessionId}@ROOT`,
    number: options.number ?? sessionId,
  } as unknown as RTCSessionFacade
}

const buildQueue = (
  handsetSessions: RTCSessionFacade[],
  pinnedEntries: Array<[order: number, session: RTCSessionFacade]> = [],
) => {
  const sessionsById = new Map<string, RTCSessionFacade>()
  const slotSessionIds = new Map<number, string>()

  pinnedEntries.forEach(([order, session]) => {
    slotSessionIds.set(order, session.sessionId)
    sessionsById.set(session.sessionId, session)
  })

  return buildActivityMonitorQueueSessions(
    handsetSessions,
    slotSessionIds.values(),
    (sessionId) => sessionsById.get(sessionId),
  )
}

describe('buildActivityMonitorQueueSessions', () => {
  beforeEach(() => {
    mocks.isConferenceRoomNumberMock.mockReset()
    mocks.isConferenceRoomNumberMock.mockReturnValue(false)
  })

  it('should mark queue empty when there are no sessions', () => {
    // Arrange / Act
    const queueSessions = buildQueue([])

    // Assert
    expect(queueSessions).toEqual([])
  })

  it('should union handset and pinned sessions without duplicates', () => {
    // Arrange
    const shared = createSession('shared', STATE.CONNECTED)
    const handsetOnly = createSession('handset-1', STATE.ONHOLD)
    const pinnedOnly = createSession('pinned-1', STATE.RINGING)

    // Act
    const queueSessions = buildQueue(
      [shared, handsetOnly],
      [
        [1, shared],
        [2, pinnedOnly],
      ],
    )

    // Assert
    expect(queueSessions.map(session => session.sessionId).sort()).toEqual([
      'handset-1',
      'pinned-1',
      'shared',
    ])
    expect(queueSessions).toHaveLength(3)
  })

  it('should exclude conference sessions by conference dto and room number', () => {
    // Arrange
    const regular = createSession('regular', STATE.CONNECTED)
    const withConferenceDto = createSession('conf-dto', STATE.CONNECTED, {
      conference: { name: 'Room' },
    })
    const withConferenceNumber = createSession('conf-number', STATE.ONHOLD, {
      number: 'room-guid',
      pServed: 'sip:room-guid@ROOT',
    })

    mocks.isConferenceRoomNumberMock.mockImplementation((value: string) => {
      return value.includes('room-guid')
    })

    // Act
    const queueSessions = buildQueue([regular, withConferenceDto, withConferenceNumber])

    // Assert
    expect(queueSessions.map(session => session.sessionId)).toEqual(['regular'])
  })

  it('should keep only CONNECTED, ONHOLD, RINGING and PROGRESS states', () => {
    // Arrange / Act
    const queueSessions = buildQueue([
      createSession('connected', STATE.CONNECTED),
      createSession('hold', STATE.ONHOLD),
      createSession('ringing', STATE.RINGING),
      createSession('progress', STATE.PROGRESS),
      createSession('initial', STATE.INITIAL),
      createSession('error', STATE.ERROR),
      createSession('disconnected', STATE.DISCONNECTED),
    ])

    // Assert
    expect(queueSessions.map(session => session.sessionId)).toEqual([
      'connected',
      'hold',
      'ringing',
      'progress',
    ])
  })

  it('should sort CONNECTED before ONHOLD before RINGING and PROGRESS', () => {
    // Arrange / Act
    const queueSessions = buildQueue([
      createSession('ringing', STATE.RINGING),
      createSession('progress', STATE.PROGRESS),
      createSession('hold', STATE.ONHOLD),
      createSession('connected', STATE.CONNECTED),
    ])

    // Assert
    expect(queueSessions.map(session => session.sessionId)).toEqual([
      'connected',
      'hold',
      'ringing',
      'progress',
    ])
  })

  it('should keep FIFO order inside the same state group', () => {
    // Arrange
    const firstConnected = createSession('connected-1', STATE.CONNECTED)
    const secondConnected = createSession('connected-2', STATE.CONNECTED)
    const firstRinging = createSession('ringing-1', STATE.RINGING)
    const secondRinging = createSession('ringing-2', STATE.RINGING)

    // Act
    const queueSessions = buildQueue([
      firstRinging,
      firstConnected,
      secondRinging,
      secondConnected,
    ])

    // Assert
    expect(queueSessions.map(session => session.sessionId)).toEqual([
      'connected-1',
      'connected-2',
      'ringing-1',
      'ringing-2',
    ])
  })

  it('should resolve pinned sessions via getSessionById and skip missing ids', () => {
    // Arrange
    const pinned = createSession('pinned-ok', STATE.CONNECTED)
    const slotSessionIds = new Map<number, string>([
      [1, 'pinned-ok'],
      [2, 'missing'],
    ])
    const sessionsById = new Map<string, RTCSessionFacade>([
      ['pinned-ok', pinned],
    ])

    // Act
    const queueSessions = buildActivityMonitorQueueSessions(
      [],
      slotSessionIds.values(),
      (sessionId) => sessionsById.get(sessionId),
    )

    // Assert
    expect(queueSessions.map(session => session.sessionId)).toEqual(['pinned-ok'])
  })
})
