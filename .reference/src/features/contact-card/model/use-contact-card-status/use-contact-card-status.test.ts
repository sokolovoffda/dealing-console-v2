import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

import type { Contact } from '@/entities/contact'

import {
  CONTACT_CARD_SELF_STATUSES,
  useContactCardStatus,
} from './use-contact-card-status'

const mocks = vi.hoisted(() => {
  const STATE = {
    INITIAL: 0,
    PROGRESS: 1,
    RINGING: 2,
    CONNECTED: 3,
    ERROR: 4,
    ONHOLD: 5,
    DISCONNECTED: 6,
  } as const

  return {
    STATE,
    getPreferredSessionByPServedMock: vi.fn(),
    slotSessionIds: new Map<number, string>(),
  }
})

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()

  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => store,
  }
})

vi.mock('@/entities/call-session', () => ({
  STATE: mocks.STATE,
  useSessionStore: () => ({
    getPreferredSessionByPServed: mocks.getPreferredSessionByPServedMock,
  }),
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    slotSessionIds: mocks.slotSessionIds,
  }),
}))

vi.mock('@/shared/composables', () => ({
  LogicalMediaDeviceTypeEnum: {
    GOOSE: 'goose',
    HANDSET: 'handset',
    HEADSET: 'headset',
    INPUT: 'input',
    OUTPUT: 'output',
    OTHER: 'other',
  },
}))

vi.mock('@/entities/contact', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/contact')>()

  return {
    ...actual,
    useContactStatusState: () => ({
      contactStatuses: ref({}),
      findLinesByInternalNumber: () => [],
    }),
  }
})

const createContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-1',
  name: 'Петров Владимир',
  pServed: '<sip:2233@ROOT>',
  internalNumber: '2233',
  groupIds: [],
  imLogin: '<sip:2233@ROOT>',
  terminalLogin: 'terminal-2233',
  terminalPassword: 'password-2233',
  groups: [],
  ...overrides,
})

const createSession = (
  state: number,
  overrides: Partial<{
    direction: 'incoming' | 'outgoing'
    conference: unknown
    sessionId: string
    currentDevice: ReturnType<typeof ref>
    isConfOnHold: ReturnType<typeof ref>
    hold: { local: boolean, remote: boolean }
  }> = {},
) => {
  const { hold, ...rest } = overrides

  return {
    sessionId: 'session-1',
    sessionState: ref(state),
    direction: 'outgoing' as const,
    currentDevice: ref(null),
    isConfOnHold: ref(false),
    session: {
      isOnHold: () => hold ?? { local: false, remote: false },
    },
    ...rest,
  }
}

const getModel = (contact = createContact()) => {
  return useContactCardStatus(contact)
}

describe('useContactCardStatus', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.getPreferredSessionByPServedMock.mockReset()
    mocks.slotSessionIds.clear()
  })

  it('returns null self status when contact has no internal number', () => {
    // Arrange / Act
    const model = getModel(createContact({ internalNumber: '' }))

    // Assert
    expect(model.selfStatus.value).toBeNull()
  })

  it('returns null self status when there is no local session', () => {
    // Arrange / Act
    const model = getModel()

    // Assert
    expect(model.selfStatus.value).toBeNull()
  })

  it.each([
    [mocks.STATE.RINGING, 'incoming', undefined, CONTACT_CARD_SELF_STATUSES.incomingSelf],
    [mocks.STATE.PROGRESS, 'outgoing', undefined, CONTACT_CARD_SELF_STATUSES.outgoingSelf],
    [mocks.STATE.CONNECTED, 'outgoing', undefined, CONTACT_CARD_SELF_STATUSES.connectedSelf],
    [mocks.STATE.ONHOLD, 'incoming', { local: false, remote: true }, CONTACT_CARD_SELF_STATUSES.incomingHoldSelf],
    [mocks.STATE.ONHOLD, 'outgoing', { local: true, remote: false }, CONTACT_CARD_SELF_STATUSES.outgoingHoldSelf],
  ])('maps local session state %s to self status', (sessionState, direction, hold, expectedSelfStatus) => {
    // Arrange
    const contact = createContact()
    mocks.getPreferredSessionByPServedMock.mockReturnValue(createSession(sessionState, {
      direction: direction as 'incoming' | 'outgoing',
      hold: hold as { local: boolean, remote: boolean } | undefined,
    }))

    // Act
    const model = getModel(contact)

    // Assert
    expect(model.selfStatus.value).toBe(expectedSelfStatus)
    expect(mocks.getPreferredSessionByPServedMock).toHaveBeenCalledWith(contact.pServed)
  })

  it('maps remote hold to incoming-hold even for outgoing call direction', () => {
    // Arrange
    const contact = createContact()
    mocks.getPreferredSessionByPServedMock.mockReturnValue(createSession(mocks.STATE.ONHOLD, {
      direction: 'outgoing',
      hold: { local: false, remote: true },
    }))

    // Act
    const model = getModel(contact)

    // Assert
    expect(model.selfStatus.value).toBe(CONTACT_CARD_SELF_STATUSES.incomingHoldSelf)
  })

  it.each([
    [mocks.STATE.CONNECTED, 'outgoing', undefined, CONTACT_CARD_SELF_STATUSES.connectedSelf],
    [mocks.STATE.ONHOLD, 'incoming', { local: false, remote: true }, CONTACT_CARD_SELF_STATUSES.incomingHoldSelf],
  ])('maps conference session state %s to non-conference self status', (sessionState, direction, hold, expectedSelfStatus) => {
    // Arrange
    const contact = createContact()
    mocks.getPreferredSessionByPServedMock.mockReturnValue(createSession(sessionState, {
      direction: direction as 'incoming' | 'outgoing',
      hold: hold as { local: boolean, remote: boolean } | undefined,
      conference: {
        pServed: '<sip:ROOMS-room-1@ROOT>',
      },
    }))

    // Act
    const model = getModel(contact)

    // Assert
    expect(model.selfStatus.value).toBe(expectedSelfStatus)
  })
})
