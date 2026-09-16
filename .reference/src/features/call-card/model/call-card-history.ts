import type { CallHistoryItem } from '@/entities/call-history'

import { contactPServedToNumber } from '@/shared/services'

export type CallCardHistoryEntry = {
  id: string
  name: string
  number: string
  direction: 'outgoing' | 'incoming' | 'missed'
}

type CurrentUser = {
  imLogin?: string
} | null | undefined

const getCallHistoryPeerFields = (
  call: CallHistoryItem,
  currentUser: CurrentUser,
): { name?: string, number?: string } | null => {
  if (!('srcPServed' in call.item)) return null
  if ('roomName' in call.item && call.item.roomName) return null

  const isOutgoing = call.item.srcPServed === currentUser?.imLogin

  return isOutgoing
    ? {
      name: call.item.dstName,
      number: 'dstNumber' in call.item ? call.item.dstNumber : undefined,
    }
    : {
      name: call.item.srcName,
      number: 'srcNumber' in call.item ? call.item.srcNumber : undefined,
    }
}

const normalizeHistoryNumber = (value: string | undefined): string => {
  if (!value) return ''

  return contactPServedToNumber(value)
}

const missedCallEvents = [
  'dialing_terminated',
  'call_missed',
  'dialing_busy',
]

const getCallHistoryDirection = (
  call: CallHistoryItem,
  currentUser: CurrentUser,
): CallCardHistoryEntry['direction'] => {
  if (missedCallEvents.includes(call.item.event)) return 'missed'
  if (!('srcPServed' in call.item)) return 'incoming'

  return call.item.srcPServed === currentUser?.imLogin
    ? 'outgoing'
    : 'incoming'
}

export const mapCallHistoryToCallCardEntries = (
  calls: readonly CallHistoryItem[],
  currentUser: CurrentUser,
  limit = 10,
): CallCardHistoryEntry[] =>
  calls
    .map((call): CallCardHistoryEntry | null => {
      const peer = getCallHistoryPeerFields(call, currentUser)
      const number = normalizeHistoryNumber(peer?.number)

      if (!number) return null

      return {
        id: String(call.eventId),
        name: peer?.name || number,
        number,
        direction: getCallHistoryDirection(call, currentUser),
      }
    })
    .filter((entry): entry is CallCardHistoryEntry => Boolean(entry))
    .slice(0, limit)
