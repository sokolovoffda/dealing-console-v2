import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import {
  createExternalContact,
  createFallbackContact,
  PSTNGUEST,
  removePSTNGUESTFromString,
} from '@/shared/utils/contact'

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

describe('contact utils', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates explicit external contact', () => {
    const externalContactLabel = '\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u043a\u043e\u043d\u0442\u0430\u043a\u0442'

    expect(createExternalContact('984498', false)).toEqual({
      internalNumber: '984498',
      name: `984498 (${externalContactLabel})`,
      pServed: '<sip:984498@ROOT>',
      organization: '',
      organizationalUnit: externalContactLabel,
      groupIds: [],
      id: '984498',
      imLogin: '',
      terminalLogin: '',
      terminalPassword: '',
      isExternal: true,
      groups: [],
    })

    expect(createExternalContact('79271112233', false)).toEqual({
      internalNumber: '79271112233',
      name: `79271112233 (${externalContactLabel})`,
      pServed: '<sip:79271112233@ROOT>',
      organization: '',
      organizationalUnit: externalContactLabel,
      groupIds: [],
      id: '79271112233',
      imLogin: '',
      terminalLogin: '',
      terminalPassword: '',
      isExternal: true,
      groups: [],
    })
  })

  it('creates fallback contact without external marker', () => {
    expect(createFallbackContact('498000')).toEqual({
      internalNumber: '498000',
      name: '498000',
      pServed: '<sip:498000@ROOT>',
      organization: '',
      organizationalUnit: '',
      groupIds: [],
      id: '498000',
      imLogin: '',
      terminalLogin: '',
      terminalPassword: '',
      isExternal: false,
      groups: [],
    })
  })

  it('removes PSTNGUEST prefix', () => {
    const values = ['4450', `${PSTNGUEST}-1234`, `${PSTNGUEST}-3333`, '9999']
    const result = values.map(removePSTNGUESTFromString)

    expect(result).toEqual(['4450', '1234', '3333', '9999'])
  })
})
