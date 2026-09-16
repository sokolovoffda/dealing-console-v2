import { vi } from 'vitest'

import { useConferenceState } from '@/entities/conference'

vi.mock('@wui/im', async () => {
  return {
    useIM: () => {
      return {
        removeSubscriber: () => Promise.resolve(),
        onConferenceCreated: () => vi.fn(),
        onConferenceUpdated: () => vi.fn(),
        onConferenceEdited: () => vi.fn(),
        subscribeOnConferenceUpdates: () => Promise.resolve(),
      }
    },
  }
})
vi.mock('@/entities/contact', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/contact')>()

  return {
    ...actual,
    useContactStore: () => ({
      getByInternalNumberOrCreateExternal: () => {},
    }),
  }
})
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

describe('test use-conference-state', () => {
  it('test addConference function', () => {
    const store = useConferenceState()
    store.addConference({
      name: 'name',
      capacity: 21,
      domainPath: 'domainPath',
      selectorMode: 'selectorMode',
      subscribers: [],
      pServed: 'pServed',
    })
    expect(store.conferences.value).toEqual([
      {
        name: 'name',
        capacity: 21,
        domainPath: 'domainPath',
        selectorMode: 'selectorMode',
        subscribers: [],
        pServed: 'pServed',
      },
    ])
  })
  it('test updateConferenceContactStatuses function', () => {
    const store = useConferenceState()
    store.updateConferenceContactStatuses({
      name: 'name',
      pServed: 'pServed',
      type: 'GroupStatusEvent',
      extendedParams: {},
      timestamp: 123123,
      eventId: 123141245124,
      status: 1,
      isOnline: true,
      message: 'asdsadasd',
      rank: 21,
      lastSeen: 123123123,
      myLastReadEventId: 513513515,
    })
  })
})
