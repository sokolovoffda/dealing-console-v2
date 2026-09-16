import { vi } from 'vitest'
import { ref } from 'vue'

import { CallStatusState } from '@/entities/contact'

import { notifyBodyParser } from '@/shared/jssip/notify-body-parser'

import { confirmedBody, earlyBody, terminateBody, terminateBody2 } from './notify-body-parser-body-examples'

vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser: ref(undefined),
  }),
}))
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

describe('Notify body parser state', () => {
  it('should parse unknown', () => {
    const result = notifyBodyParser(terminateBody)
    expect(result && result.remote).toBe(CallStatusState.UNKNOWN)
  })

  it('should parse terminated', () => {
    const result = notifyBodyParser(terminateBody2)
    expect(result && result.remote).toBe(CallStatusState.TERMINATED)
  })

  it('should parse early at state', () => {
    const result = notifyBodyParser(earlyBody)
    expect(result && result.remote).toBe(CallStatusState.EARLY)
  })

  it('should parse confirmed at state', () => {
    const result = notifyBodyParser(confirmedBody)
    expect(result && result.remote).toBe(CallStatusState.CONFIRMED)
  })

  it('should parse null at state', () => {
    const func = () => {
      notifyBodyParser('')
    }
    expect(func).toThrow(Error)
  })

  it('should parse 3333 at internalNumber ', () => {
    const result = notifyBodyParser(confirmedBody)
    expect(result && result.internalNumber).toBe('3333')
  })
})
