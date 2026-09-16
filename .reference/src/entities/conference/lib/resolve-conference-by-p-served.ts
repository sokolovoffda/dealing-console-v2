import { ConferenceType } from '@wui/im'

// eslint-disable-next-line no-restricted-imports -- прямой импорт без call-session/index: иначе цикл с useSessionFacade
import { usePinnedCallsStore } from '@/entities/call-session/model/use-pinned-calls-store'

import { conferencePServedToNumber, isConferenceRoomNumber, pServedIsNotGroup, roomGuidToPServed } from '@/shared/services/uri-helper'

import useConferenceState from '../model/use-conference-state'
import { ConferenceDto } from '../types'

const CONFERENCE_CAPACITY = 9999

type ResolveConferenceOptions = {
  title?: string
}

type ResolveIncomingConferenceOptions = {
  title?: string
}

export const createConferenceStub = (
  pServed: string,
  options: ResolveConferenceOptions = {},
): ConferenceDto => ({
  name: options.title?.trim() || conferencePServedToNumber(pServed) || pServed,
  pServed,
  capacity: CONFERENCE_CAPACITY,
  domainPath: 'ROOT',
  selectorMode: ConferenceType.FREE_FOR_ALL,
  subscribers: [],
})

/** Конфа из IM state или stub по pServed/title (после F5, до fetchAll) */
export const resolveConferenceByPServed = (
  pServed: string,
  options: ResolveConferenceOptions = {},
): ConferenceDto => {
  const { getConfByPServed, addConference } = useConferenceState()
  const existing = getConfByPServed(pServed)

  if (existing) {
    return existing
  }

  const stub = createConferenceStub(pServed, options)
  // Stub должен быть в innerData — иначе updateConferenceDto игнорирует GroupStatus
  addConference(stub)

  return stub
}

/** Конфа из IM state или stub по room guid / pServed */
export const resolveConferenceByNumber = (
  number: string,
  options: ResolveConferenceOptions = {},
): ConferenceDto => {
  const pServed = number.includes('<sip:')
    ? number
    : `<sip:ROOMS-${number}@ROOT>`

  return resolveConferenceByPServed(pServed, options)
}

const findPinnedConferenceByRoomNumber = (number: string) => {
  const { pinnedCalls } = usePinnedCallsStore()

  for (const pin of pinnedCalls.values()) {
    if (!pin || pServedIsNotGroup(pin.pServed)) {
      continue
    }

    if (conferencePServedToNumber(pin.pServed) === number) {
      return pin
    }
  }

  const roomPServed = roomGuidToPServed(number)

  for (const pin of pinnedCalls.values()) {
    if (!pin || pServedIsNotGroup(pin.pServed)) {
      continue
    }

    if (pin.pServed === roomPServed) {
      return pin
    }
  }

  return undefined
}

/** Входящая SIP-нога: IM, завешенные или GUID комнаты (быстрая конфа с Web) */
export const resolveIncomingConferenceFromRemoteNumber = (
  number: string,
  options: ResolveIncomingConferenceOptions = {},
): ConferenceDto | undefined => {
  const { getConfByPServed } = useConferenceState()
  let conference = getConfByPServed(number) ?? getConfByPServed(roomGuidToPServed(number))

  if (!conference) {
    const pinnedConference = findPinnedConferenceByRoomNumber(number)

    if (pinnedConference) {
      conference = resolveConferenceByPServed(pinnedConference.pServed, { title: pinnedConference.title })
    }
  }

  if (!conference && isConferenceRoomNumber(number)) {
    const roomNumber = number.startsWith('ROOMS-') ? number.slice('ROOMS-'.length) : number

    conference = resolveConferenceByNumber(roomNumber, {
      title: options.title?.trim() || undefined,
    })
  }

  return conference
}
