import { useConfigurationState } from '@/shared/composables'

const P_SERVED_REGEXP = /<sip:(.*)@ROOT>/
const P_SERVED_ROOM_REGEXP = /<sip:ROOMS-(.*)@ROOT>/

export function contactPServedToNumber (pServed: string): string {
  return pServed.replace(/<sip:|@ROOT>/g, '')
}

export function roomGuidToPServed (guid: string): string {
  const { configuration } = useConfigurationState()
  return guid.includes('<sip:') ? guid : `<sip:ROOMS-${guid}@${configuration.value.domainPath}>`
}

export function contactNumberToPServed (number: string) {
  const { configuration } = useConfigurationState()
  return number.includes('<sip:') ? number : `<sip:${number}@${configuration.value.domainPath}>`
}

export function conferencePServedToNumber (pServed: string): string {
  const pattern = /<sip:ROOMS-([^@>]+)@ROOT>/gi
  const match = pattern.exec(pServed)
  return match ? match[1] : pServed
}

export const isPServed = (pServed?: string): boolean => {
  return !!pServed?.length && P_SERVED_REGEXP.test(pServed)
}

export const pServedIsNotGroup = (pServed: string): boolean => {
  return isPServed(pServed) && !P_SERVED_ROOM_REGEXP.test(pServed)
}

const ROOM_GUID_REGEXP = /^[0-9A-Fa-f]{32}$/
const ROOM_NUMBER_PREFIX = 'ROOMS-'

/** SIP user / pServed комнаты: GUID 32 hex или ROOMS-..., не внутренний номер */
export const isConferenceRoomNumber = (number: string): boolean => {
  if (!number) {
    return false
  }

  if (P_SERVED_ROOM_REGEXP.test(number)) {
    return true
  }

  if (number.startsWith(ROOM_NUMBER_PREFIX) && number.length > ROOM_NUMBER_PREFIX.length) {
    return true
  }

  return ROOM_GUID_REGEXP.test(number)
}
