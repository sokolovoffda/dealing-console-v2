import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

import { ConferenceDto } from '@/entities/conference'

import ConferenceCard from './ConferenceCard.vue'

vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => ({
      getSessionById: vi.fn(),
      getSessionByPServed: vi.fn(),
    }),
    usePinnedCallsStore: () => ({
      activePinnedCall: null,
      setActivePinnedCall: vi.fn(),
    }),
    selectConference: vi.fn(),
    STATE: {},
  }
})
vi.mock('@/entities/conference', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/conference')>()

  return {
    ...actual,
    useConferencePushToTalk: () => ({
      isPushToTalkEnabled: () => false,
      pressOperatorPtt: vi.fn(),
      releaseOperatorPtt: vi.fn(),
      pressParticipantPtt: vi.fn(),
      releaseParticipantPtt: vi.fn(),
    }),
    useConferenceTileOperatorPtt: () => ({
      touchHandlers: {
        start: vi.fn(),
        end: vi.fn(),
      },
      shouldSuppressClick: () => false,
    }),
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

test('ConferenceCard mount component', async () => {
  expect(ConferenceCard).toBeTruthy()
  const wrapper = mount(ConferenceCard, {
    props: {
      conference: {
        name: 'Test user',
        pServed: '<sip:ROOMS-asdasdasd@ROOT>',
        organizationalUnit: 'Test department',
        internalNumber: '0000',
        subscribers: [],
        subscribersCount: 0,
        capacity: 9999,
        domainPath: 'ROOT',
        selectorMode: '9999',
      } as ConferenceDto,
    },
    global: {
      plugins: [ createTestingPinia() ],
    },
  })
  expect(wrapper.html()).toContain('Участников: 0')
  expect(wrapper.html()).toContain('Test user')
})
