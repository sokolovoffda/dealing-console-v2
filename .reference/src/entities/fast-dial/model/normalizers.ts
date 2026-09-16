import {
  FAST_DIAL_GRID_SIZE,
  FastDialContactDto,
  FastDialContactPosition,
  FastDialContactPositionPayload,
  FastDialGroup,
  FastDialGroupDto,
  FastDialPanel,
  FastDialPanelDto,
} from './types'

export const isValidFastDialCellIndex = (cellIndex: number): boolean => {
  return Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < FAST_DIAL_GRID_SIZE
}

const normalizeFastDialContact = (contact: FastDialContactDto): FastDialContactPosition | null => {
  if (!contact.contactGuid || contact.order === undefined) return null
  if (!isValidFastDialCellIndex(contact.order)) return null

  return {
    contactGuid: contact.contactGuid,
    cellIndex: contact.order,
  }
}

export const normalizeFastDialContacts = (
  contacts: FastDialContactDto[] = [],
): FastDialContactPosition[] => {
  const usedContactGuids = new Set<string>()
  const usedCellIndexes = new Set<number>()
  const normalizedContacts: FastDialContactPosition[] = []

  contacts.forEach((contact) => {
    const normalizedContact = normalizeFastDialContact(contact)
    if (!normalizedContact) return
    if (usedContactGuids.has(normalizedContact.contactGuid)) return
    if (usedCellIndexes.has(normalizedContact.cellIndex)) return

    usedContactGuids.add(normalizedContact.contactGuid)
    usedCellIndexes.add(normalizedContact.cellIndex)
    normalizedContacts.push(normalizedContact)
  })

  return normalizedContacts
}

export const normalizeFastDialGroup = (group: FastDialGroupDto): FastDialGroup | null => {
  if (!group.id || !group.groupGuid) return null

  return {
    id: group.id,
    groupGuid: group.groupGuid,
    order: group.order ?? 0,
    contacts: normalizeFastDialContacts(group.contacts),
  }
}

export const normalizeFastDialPanel = (panel: FastDialPanelDto): FastDialPanel => {
  return {
    schemaVersion: panel.schemaVersion ?? 1,
    groups: (panel.groups ?? [])
      .map(normalizeFastDialGroup)
      .filter((group): group is FastDialGroup => Boolean(group)),
  }
}

export const toFastDialContactPayload = (
  contacts: FastDialContactPosition[],
): FastDialContactPositionPayload[] => {
  return contacts
    .filter(contact => isValidFastDialCellIndex(contact.cellIndex))
    .map(contact => ({
      contactGuid: contact.contactGuid,
      order: contact.cellIndex,
    }))
}
