export const PINNED_CALLS_SCHEMA_VERSION = 1
export const PINNED_CALLS_UI_SLOT_COUNT = 21
export const PINNED_CALLS_API_MAX_ORDER = 21
/** Мин. высота ячейки (~106px); при нехватке места — скролл, при запасе — ряд растягивается. */
export const PINNED_CALLS_SLOT_MIN_HEIGHT_PX = 106
/** Совпадает с Tailwind `gap-2` (0.5rem = 8px). */
export const PINNED_CALLS_GRID_GAP_PX = 8
export const PINNED_CALLS_GROUP_COUNT = 8
export const PINNED_CALLS_GROUP_MAX_MEMBERS = 7
export const PINNED_CALLS_INITIAL_VOLUME = 1
/** Дефолт mic слота: off; включать после active/hold сессии. */
export const PINNED_CALLS_INITIAL_MIC_STATE = false
/** Дефолт mic intent группы (бродкаст). */
export const PINNED_CALLS_GROUP_INITIAL_MIC_STATE = true

/** Раскладка бродкаст-групп на panel: 4 | 8; null = не зафиксирована на backend. */
export type PinnedCallsGroupsLayout = 4 | 8

export type PinnedCallSlotOrder = number
export type PinnedCallGroupIndex = number
export type PinnedCallSlotIndex = number
export type PinnedCallPServed = string

export type PinnedCallSlotDto = {
  order: number
  pServed: string
  slotIndex?: number
  title: string
  volume: number
  prevVolume: number
  micState: boolean
  prevMicState: boolean
}

export type PinnedCallGroupMemberDto = {
  pServed: string
  slotIndex?: number
}

export type PinnedCallGroupDto = {
  index: number
  micState: boolean
  volumeState: boolean
  members: PinnedCallGroupMemberDto[]
}

export type PinnedCallPanelDto = {
  schemaVersion: number
  slots: PinnedCallSlotDto[]
  groups: PinnedCallGroupDto[]
  /** OpenAPI: 4 | 8 | null */
  groupsLayout: PinnedCallsGroupsLayout | null
}

export type PinnedCallSlotClearBody = {
  clear: true
}

export type PinnedCallSlotUpsertBody = {
  pServed: string
  slotIndex?: number
  title: string
  volume: number
  prevVolume: number
  micState: boolean
  prevMicState: boolean
}

export type PinnedCallSlotPutBody = PinnedCallSlotClearBody | PinnedCallSlotUpsertBody

export type PinnedCallSlotsReorderBody = {
  fromOrder: number
  toOrder: number
}

export type PinnedCallGroupsReorderBody = {
  fromIndex: number
  toIndex: number
}

export type PinnedCallGroupUpdateBody = {
  micState: boolean
  volumeState: boolean
  members: PinnedCallGroupMemberDto[]
}

export type PinnedCallsGroupsLayoutBody = {
  groupsLayout: PinnedCallsGroupsLayout | null
}

export type PinnedCallsImportBody = {
  pinnedCalls?: Record<string, unknown>
  pinnedCallsGroups?: Record<string, unknown>
}

export type PinnedCallSlot = {
  order: PinnedCallSlotOrder
  pServed: PinnedCallPServed
  slotIndex: PinnedCallSlotIndex
  title: string
  volume: number
  prevVolume: number
  micState: boolean
  prevMicState: boolean
}

export type PinnedCallGroupMember = {
  pServed: PinnedCallPServed
  slotIndex: PinnedCallSlotIndex
}

export type PinnedCallGroup = {
  index: PinnedCallGroupIndex
  micState: boolean
  volumeState: boolean
  members: PinnedCallGroupMember[]
}

export type PinnedCallPanel = {
  schemaVersion: typeof PINNED_CALLS_SCHEMA_VERSION
  slots: PinnedCallSlot[]
  groups: PinnedCallGroup[]
  groupsLayout: PinnedCallsGroupsLayout | null
}

export type PinnedCallGridCell = {
  order: PinnedCallSlotOrder
  slot: PinnedCallSlot | null
}

export type PinnedCallGroupCell = {
  index: PinnedCallGroupIndex
  displayNumber: number
  group: PinnedCallGroup | null
}
