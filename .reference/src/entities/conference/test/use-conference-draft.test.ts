import { vi } from 'vitest'

import { Contact } from '@/entities/contact'

import useConferenceDraft from '../model/use-conference-draft'

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
    contactNumberToPServed: (value: string) => `<sip:${value}@undefined>`,
  }
})

describe('useConferenceDraft', () => {
  it('test init function', () => {
    const store = useConferenceDraft()
    store.init()
    expect(store.conferenceDraft.value?.selectorMode).toEqual('FreeForAll')
    expect(store.conferenceDraft.value?.subscribers).toEqual([])
  })
  it('test init function', () => {
    const store = useConferenceDraft()
    store.init({
      name: 'name',
      pServed: 'pServed',
      capacity: 21,
      domainPath: 'domainPath',
      selectorMode: 'selectorMode',
      subscribers: [],
    })
    expect(store.conferenceDraft.value?.pServed).toEqual('pServed')
  })
  it('test cancelConferenceDraft function', () => {
    const store = useConferenceDraft()
    store.init({
      name: 'name',
      pServed: 'pServed',
      capacity: 21,
      domainPath: 'domainPath',
      selectorMode: 'selectorMode',
      subscribers: [],
    })
    store.cancelConferenceDraft()
    expect(store.conferenceDraft.value).toEqual(undefined)
  })
  it('test setConfDraftName function', () => {
    const store = useConferenceDraft()
    store.init({
      name: 'name',
      pServed: 'pServed',
      capacity: 21,
      domainPath: 'domainPath',
      selectorMode: 'selectorMode',
      subscribers: [],
    })
    store.setConfDraftName('new name')
    expect(store.conferenceDraft.value?.name).toEqual('new name')
  })
  it('test addDraftConferenceSubscriber and deleteDraftConferenceSubscriber function', () => {
    const store = useConferenceDraft()
    store.init({
      name: 'name',
      pServed: 'pServed',
      capacity: 21,
      domainPath: 'domainPath',
      selectorMode: 'selectorMode',
      subscribers: [],
    })
    store.addDraftConferenceSubscriber({
      name: 'new name',
      pServed: 'pServed',
      id: 'id',
      internalNumber: '31231',
      groups: [],
    } as unknown as Contact)
    expect(store.conferenceDraft.value?.subscribers).toEqual([{
      email: 'Неизвестный',
      guid: '<sip:31231@undefined>',
      name: 'new name',
      pServed: '<sip:31231@undefined>',
      phoneNumber: '31231',
      type: 'member',
      role: 'User',
    }])
    store.deleteDraftConferenceSubscriber({
      name: 'new name',
      pServed: 'pServed',
      id: 'id',
      internalNumber: '31231',
      groups: [],
    } as unknown as Contact)
    expect(store.conferenceDraft.value?.subscribers.length).toEqual(0)
  })
})
