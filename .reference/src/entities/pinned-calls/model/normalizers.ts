import {
  PINNED_CALLS_API_MAX_ORDER,
  PINNED_CALLS_GROUP_COUNT,
  PINNED_CALLS_GROUP_MAX_MEMBERS,
  PINNED_CALLS_INITIAL_MIC_STATE,
  PINNED_CALLS_INITIAL_VOLUME,
  PINNED_CALLS_SCHEMA_VERSION,
  PINNED_CALLS_UI_SLOT_COUNT,
} from './types'
import type {
  PinnedCallGridCell,
  PinnedCallGroup,
  PinnedCallGroupCell,
  PinnedCallGroupDto,
  PinnedCallGroupMember,
  PinnedCallGroupMemberDto,
  PinnedCallGroupUpdateBody,
  PinnedCallPanel,
  PinnedCallPanelDto,
  PinnedCallSlot,
  PinnedCallSlotClearBody,
  PinnedCallSlotDto,
  PinnedCallGroupsReorderBody,
  PinnedCallSlotsReorderBody,
  PinnedCallSlotUpsertBody,
  PinnedCallsGroupsLayout,
} from './types'

export const isValidPinnedCallApiOrder = (order: number): boolean => {
  return Number.isInteger(order) && order >= 1 && order <= PINNED_CALLS_API_MAX_ORDER
}

export const isValidPinnedCallUiOrder = (order: number): boolean => {
  return Number.isInteger(order) && order >= 1 && order <= PINNED_CALLS_UI_SLOT_COUNT
}

export const isValidPinnedCallGroupIndex = (index: number): boolean => {
  return Number.isInteger(index) && index >= 0 && index < PINNED_CALLS_GROUP_COUNT
}

export const isValidPinnedCallSlotIndex = (slotIndex: number): boolean => {
  return Number.isInteger(slotIndex) && slotIndex > 0
}

export const isValidPinnedCallsGroupsLayout = (
  value: unknown,
): value is PinnedCallsGroupsLayout => {
  return value === 4 || value === 8
}

/** OpenAPI: 4 | 8 | null; всё остальное → null. */
export const normalizePinnedCallsGroupsLayout = (
  value: unknown,
): PinnedCallsGroupsLayout | null => {
  if (value === null) return null
  if (isValidPinnedCallsGroupsLayout(value)) return value

  return null
}

/**
 * Legacy heal: groups с members есть, а groupsLayout ещё null.
 * max index ≥ 4 → раскладка 8, иначе 4.
 */
export const inferPinnedCallsGroupsLayout = (
  groups: readonly Pick<PinnedCallGroup, 'index'>[],
): PinnedCallsGroupsLayout => {
  const maxIndex = groups.reduce((max, group) => Math.max(max, group.index), -1)

  return maxIndex >= 4 ? 8 : 4
}

export const clampPinnedCallVolume = (volume: number | undefined): number => {
  if (typeof volume !== 'number' || Number.isNaN(volume)) return PINNED_CALLS_INITIAL_VOLUME

  return Math.min(Math.max(volume, 0), 1)
}

/** Номер из pServed без SIP-обёртки (`<sip:2233@ROOT>` → `2233`). */
export const getPinnedCallPServedKey = (pServed: string): string => {
  const match = pServed.match(/sip:([^@>;]+)/i)
  return match?.[1] ?? pServed
}

const normalizePinnedCallSlotIndex = (slotIndex: number | undefined): number => {
  return slotIndex !== undefined && isValidPinnedCallSlotIndex(slotIndex) ? slotIndex : 1
}

export const normalizePinnedCallGroupMember = (
  member: PinnedCallGroupMemberDto,
): PinnedCallGroupMember | null => {
  if (!member.pServed) return null

  return {
    pServed: member.pServed,
    slotIndex: normalizePinnedCallSlotIndex(member.slotIndex),
  }
}

export const normalizePinnedCallSlot = (slot: PinnedCallSlotDto): PinnedCallSlot | null => {
  if (!isValidPinnedCallApiOrder(slot.order)) return null
  if (!slot.pServed) return null

  const volume = clampPinnedCallVolume(slot.volume)
  const prevVolume = clampPinnedCallVolume(slot.prevVolume)

  return {
    order: slot.order,
    pServed: slot.pServed,
    slotIndex: normalizePinnedCallSlotIndex(slot.slotIndex),
    title: slot.title || getPinnedCallPServedKey(slot.pServed),
    volume,
    prevVolume,
    // Mic — runtime UI (off по умолчанию); REST micState на этом этапе не источник истины.
    micState: PINNED_CALLS_INITIAL_MIC_STATE,
    prevMicState: PINNED_CALLS_INITIAL_MIC_STATE,
  }
}

export const normalizePinnedCallGroup = (group: PinnedCallGroupDto): PinnedCallGroup | null => {
  if (!isValidPinnedCallGroupIndex(group.index)) return null

  const usedMembers = new Set<string>()
  const members: PinnedCallGroupMember[] = []
  const groupMembers = group.members ?? []

  groupMembers.forEach((member) => {
    const normalizedMember = normalizePinnedCallGroupMember(member)
    if (!normalizedMember) return

    const key = getPinnedCallGroupMemberKey(normalizedMember)
    if (usedMembers.has(key)) return

    usedMembers.add(key)
    members.push(normalizedMember)
  })

  return {
    index: group.index,
    micState: group.micState,
    volumeState: group.volumeState,
    members: members.slice(0, PINNED_CALLS_GROUP_MAX_MEMBERS),
  }
}

export const normalizePinnedCallPanel = (panel: PinnedCallPanelDto): PinnedCallPanel => {
  const usedOrders = new Set<number>()
  const slots: PinnedCallSlot[] = []
  const panelSlots = panel.slots ?? []

  panelSlots.forEach((slot) => {
    const normalizedSlot = normalizePinnedCallSlot(slot)
    if (!normalizedSlot) return
    if (usedOrders.has(normalizedSlot.order)) return

    usedOrders.add(normalizedSlot.order)
    slots.push(normalizedSlot)
  })

  return {
    schemaVersion: PINNED_CALLS_SCHEMA_VERSION,
    slots: slots.sort((left, right) => left.order - right.order),
    groups: (panel.groups ?? [])
      .map(normalizePinnedCallGroup)
      .filter((group): group is PinnedCallGroup => Boolean(group))
      .sort((left, right) => left.index - right.index),
    groupsLayout: normalizePinnedCallsGroupsLayout(panel.groupsLayout),
  }
}

export const buildPinnedCallGridCells = (slots: PinnedCallSlot[]): PinnedCallGridCell[] => {
  const slotsByOrder = new Map(slots.map(slot => [slot.order, slot]))

  return Array.from({ length: PINNED_CALLS_UI_SLOT_COUNT }, (_, index) => {
    const order = index + 1

    return {
      order,
      slot: slotsByOrder.get(order) ?? null,
    }
  })
}

export const buildPinnedCallGroupCells = (groups: PinnedCallGroup[]): PinnedCallGroupCell[] => {
  const groupsByIndex = new Map(groups.map(group => [group.index, group]))

  return Array.from({ length: PINNED_CALLS_GROUP_COUNT }, (_, index) => ({
    index,
    displayNumber: index + 1,
    group: groupsByIndex.get(index) ?? null,
  }))
}

export const getPinnedCallGroupMemberKey = (member: PinnedCallGroupMember): string => {
  return `${member.pServed}:${member.slotIndex}`
}

export const toPinnedCallSlotUpsertBody = (
  slot: Omit<PinnedCallSlot, 'order'>,
): PinnedCallSlotUpsertBody => {
  return {
    pServed: slot.pServed,
    slotIndex: slot.slotIndex,
    title: slot.title,
    volume: clampPinnedCallVolume(slot.volume),
    prevVolume: clampPinnedCallVolume(slot.prevVolume),
    micState: slot.micState,
    prevMicState: slot.prevMicState,
  }
}

export const toPinnedCallSlotClearBody = (): PinnedCallSlotClearBody => {
  return { clear: true }
}

export const toPinnedCallSlotsReorderBody = (
  fromOrder: number,
  toOrder: number,
): PinnedCallSlotsReorderBody => {
  return {
    fromOrder,
    toOrder,
  }
}

export const toPinnedCallGroupsReorderBody = (
  fromIndex: number,
  toIndex: number,
): PinnedCallGroupsReorderBody => {
  return {
    fromIndex,
    toIndex,
  }
}

export const toPinnedCallGroupMemberBody = (
  member: PinnedCallGroupMember,
): PinnedCallGroupMemberDto => {
  return {
    pServed: member.pServed,
    slotIndex: member.slotIndex,
  }
}

export const toPinnedCallGroupUpdateBody = (
  group: Omit<PinnedCallGroup, 'index'>,
): PinnedCallGroupUpdateBody => {
  return {
    micState: group.micState,
    volumeState: group.volumeState,
    members: group.members.slice(0, PINNED_CALLS_GROUP_MAX_MEMBERS).map(toPinnedCallGroupMemberBody),
  }
}
