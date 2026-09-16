export const FAST_DIAL_GRID_SIZE = 36

export type FastDialCellIndex = number

export type FastDialContactDto = {
  contactGuid?: string
  order?: number
}

export type FastDialGroupDto = {
  id?: string
  groupGuid?: string
  order?: number
  contacts?: FastDialContactDto[]
}

export type FastDialPanelDto = {
  schemaVersion?: number
  groups?: FastDialGroupDto[]
}

export type FastDialContactPositionPayload = {
  contactGuid: string
  order: number
}

export type CreateFastDialGroupPayload = {
  groupGuid: string
  order: number
  contacts: FastDialContactPositionPayload[]
}

export type UpdateFastDialGroupPayload = {
  contacts: FastDialContactPositionPayload[]
}

export type ReorderFastDialGroupPayload = {
  id: string
  toIndex: number
}

export type FastDialContactPosition = {
  contactGuid: string
  cellIndex: FastDialCellIndex
}

export type FastDialGroup = {
  id: string
  groupGuid: string
  order: number
  contacts: FastDialContactPosition[]
}

export type FastDialPanel = {
  schemaVersion: number
  groups: FastDialGroup[]
}
