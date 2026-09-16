import type { IconName } from '@wui/common-library'
import dayjs from 'dayjs'

import { contactPServedToNumber } from '@/shared/services'

import type { CallHistoryItem, DirectionCall } from '../types/types'

type CurrentUser = {
  imLogin?: string
  name?: string
} | null | undefined

export const CALL_HISTORY_FILTER_IDS = ['all', 'incoming', 'outgoing', 'missed', 'frequent'] as const
export type CallHistoryFilterId = typeof CALL_HISTORY_FILTER_IDS[number]

export const CALL_HISTORY_SORTABLE_FIELDS = ['number', 'name', 'dateTime', 'duration'] as const
export type CallHistorySortableField = typeof CALL_HISTORY_SORTABLE_FIELDS[number]

export type CallHistorySortOrder = 'asc' | 'desc'

export type CallHistoryTableSort = {
  field: CallHistorySortableField
  order: CallHistorySortOrder
}

export type CallHistoryPanelRow = {
  id: string
  typeIcon: IconName
  actionIcon: IconName
  direction: DirectionCall
  isConference: boolean
  isFrequent: boolean
  name: string
  number: string
  dateTime: string
  timestamp: number
  duration: string
  durationMs: number
  hasRecording: boolean
  recordingUrl: string
  recordingFileName: string
}

export type GetCallHistoryPanelRowsOptions = Partial<{
  searchText: string
  filterId: CallHistoryFilterId
  sort: CallHistoryTableSort
}>

const DEFAULT_ACTION_ICON: IconName = 'chevronRightSmM'
const CONFERENCE_NUMBER_LABEL = 'Конференция'
const CONFERENCE_ICON_NAME: IconName = 'userGroupM'

const directionIcons: Record<DirectionCall, IconName> = {
  outgoing: 'arrowNorthEastM',
  incoming: 'arrowSouthWestM',
  missed: 'arrowElbowLeftM',
}

const missedCallEvents = [
  'dialing_terminated',
  'call_missed',
  'dialing_busy',
] as const

const normalizeHistoryValue = (value: string | undefined) => {
  return value?.trim() || ''
}

const hasRoomName = (call: CallHistoryItem): call is CallHistoryItem & {
  item: CallHistoryItem['item'] & { roomName: string }
} => {
  return 'roomName' in call.item && typeof call.item.roomName === 'string' && call.item.roomName.length > 0
}

const isConferenceHistoryItem = (call: CallHistoryItem) => {
  return hasRoomName(call)
}

const getCallHistoryDirection = (
  call: CallHistoryItem,
  currentUser: CurrentUser,
): DirectionCall => {
  if (missedCallEvents.includes(call.item.event as typeof missedCallEvents[number])) return 'missed'
  if (!('srcPServed' in call.item)) return 'incoming'

  return call.item.srcPServed === currentUser?.imLogin
    ? 'outgoing'
    : 'incoming'
}

const getCallHistoryPeerFields = (
  call: CallHistoryItem,
  currentUser: CurrentUser,
): { name: string, number: string } => {
  if (hasRoomName(call))
    return {
      name: normalizeHistoryValue(call.item.roomName) || CONFERENCE_NUMBER_LABEL,
      number: CONFERENCE_NUMBER_LABEL,
    }

  if (!('srcPServed' in call.item)) return { name: '', number: '' }

  if (call.item.srcPServed === currentUser?.imLogin && call.item.dstPServed === currentUser?.imLogin) {
    return {
      name: normalizeHistoryValue(currentUser?.name) || '',
      number: normalizeHistoryValue(call.item.dstNumber ? contactPServedToNumber(call.item.dstNumber) : ''),
    }
  }

  const isOutgoing = call.item.srcPServed === currentUser?.imLogin
  const rawName = isOutgoing ? call.item.dstName : call.item.srcName
  const rawNumber = isOutgoing ? call.item.dstNumber : call.item.srcNumber
  const number = normalizeHistoryValue(rawNumber ? contactPServedToNumber(rawNumber) : '')

  return {
    name: normalizeHistoryValue(rawName) || number,
    number,
  }
}

const getCallHistoryDurationMs = (call: CallHistoryItem) => {
  if ('duration' in call.item) return call.item.duration

  if ('conferenceStatistic' in call.item) {
    const { timestampStart, timestampStop } = call.item.conferenceStatistic
    return Math.max(0, (timestampStop - timestampStart) * 1000)
  }

  return 0
}

const getCallHistoryDuration = (call: CallHistoryItem) => {
  return dayjs.duration(getCallHistoryDurationMs(call), 'milliseconds').format('HH:mm:ss')
}

const getPathNameFromUrl = (url: string) => {
  try {
    const { pathname } = new URL(url)
    return pathname
  } catch (e) {
    console.error(e)
    return url
  }
}

const getCallHistoryRecording = (call: CallHistoryItem) => {
  if (call.item.event !== 'call_record_completed')
    return {
      hasRecording: false,
      recordingUrl: '',
      recordingFileName: '',
    }

  const recordingFileName = normalizeHistoryValue(call.item.callRecordUrl.split('/').at(-1))

  return {
    hasRecording: true,
    recordingUrl: `/${getPathNameFromUrl(call.item.callRecordUrl)}`,
    recordingFileName,
  }
}

const getSearchHaystack = (row: CallHistoryPanelRow) => {
  return `${row.number} ${row.name}`.trim().toLowerCase()
}

const getCountsByNumber = (rows: readonly CallHistoryPanelRow[]) => {
  return rows.reduce<Map<string, number>>((map, row) => {
    const key = row.number
    if (!key) return map

    map.set(key, (map.get(key) ?? 0) + 1)
    return map
  }, new Map<string, number>())
}

const getFrequentOrderMap = (rows: readonly CallHistoryPanelRow[]) => {
  const countsByNumber = getCountsByNumber(rows)

  return rows.reduce<Map<string, number>>((map, row) => {
    const frequency = row.number ? (countsByNumber.get(row.number) ?? 0) : 0
    map.set(row.id, frequency)
    return map
  }, new Map<string, number>())
}

/** Одна строка на номер: самый свежий звонок, только номера с частотой > 1, по убыванию частоты. */
const collapseFrequentRows = (rows: readonly CallHistoryPanelRow[]) => {
  const countsByNumber = getCountsByNumber(rows)
  const latestByNumber = new Map<string, CallHistoryPanelRow>()

  for (const row of rows) {
    if (!row.number) continue
    if ((countsByNumber.get(row.number) ?? 0) <= 1) continue

    const current = latestByNumber.get(row.number)
    if (!current || row.timestamp > current.timestamp) {
      latestByNumber.set(row.number, row)
    }
  }

  return [...latestByNumber.values()].sort((left, right) => {
    const frequencyDiff = (countsByNumber.get(right.number) ?? 0) - (countsByNumber.get(left.number) ?? 0)
    if (frequencyDiff !== 0) return frequencyDiff

    return right.timestamp - left.timestamp
  })
}

const compareByDirectionFilter = (row: CallHistoryPanelRow, filterId: CallHistoryFilterId) => {
  if (filterId === 'all' || filterId === 'frequent') return true

  return row.direction === filterId
}

const compareValues = (left: string | number, right: string | number) => {
  if (typeof left === 'number' && typeof right === 'number') return left - right

  return String(left).localeCompare(String(right), 'ru', { sensitivity: 'base' })
}

export const mapCallHistoryToPanelRows = (
  calls: readonly CallHistoryItem[],
  currentUser: CurrentUser,
): CallHistoryPanelRow[] => {
  const baseRows = calls.map((call) => {
    const direction = getCallHistoryDirection(call, currentUser)
    const peer = getCallHistoryPeerFields(call, currentUser)
    const isConference = isConferenceHistoryItem(call)
    const recording = getCallHistoryRecording(call)
    const durationMs = getCallHistoryDurationMs(call)

    return {
      id: String(call.eventId),
      typeIcon: isConference ? CONFERENCE_ICON_NAME : directionIcons[direction],
      actionIcon: DEFAULT_ACTION_ICON,
      direction,
      isConference,
      isFrequent: false,
      name: peer.name || peer.number || '-',
      number: peer.number || '-',
      dateTime: dayjs(call.item.timestamp * 1000).format('DD.MM.YYYY HH:mm:ss'),
      timestamp: call.item.timestamp,
      duration: getCallHistoryDuration(call),
      durationMs,
      hasRecording: recording.hasRecording,
      recordingUrl: recording.recordingUrl,
      recordingFileName: recording.recordingFileName,
    } satisfies CallHistoryPanelRow
  })

  const frequentOrderMap = getFrequentOrderMap(baseRows)

  return baseRows.map((row) => ({
    ...row,
    isFrequent: (frequentOrderMap.get(row.id) ?? 0) > 1,
  }))
}

export const getCallHistoryPanelRows = (
  calls: readonly CallHistoryItem[],
  currentUser: CurrentUser,
  {
    searchText = '',
    filterId = 'all',
    sort = { field: 'dateTime', order: 'desc' },
  }: GetCallHistoryPanelRowsOptions = {},
): CallHistoryPanelRow[] => {
  const rows = mapCallHistoryToPanelRows(calls, currentUser)
  const normalizedSearchText = searchText.trim().toLowerCase()

  const filteredRows = rows.filter((row) => {
    if (!compareByDirectionFilter(row, filterId)) return false
    if (!normalizedSearchText) return true

    return getSearchHaystack(row).includes(normalizedSearchText)
  })

  if (filterId === 'frequent') {
    return collapseFrequentRows(filteredRows)
  }

  const valueByField: Record<CallHistorySortableField, (row: CallHistoryPanelRow) => string | number> = {
    number: row => row.number,
    name: row => row.name,
    dateTime: row => row.timestamp,
    duration: row => row.durationMs,
  }

  return [...filteredRows].sort((left, right) => {
    const result = compareValues(valueByField[sort.field](left), valueByField[sort.field](right))

    return sort.order === 'asc' ? result : result * -1
  })
}
