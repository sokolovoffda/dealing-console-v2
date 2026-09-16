export const BROADCAST_GROUPS_CARD_MIN_WIDTH_PX = 466

export type BroadcastGroupsLayoutCount = 4 | 8

export const isBroadcastGroupsLayoutCount = (value: unknown): value is BroadcastGroupsLayoutCount => {
  return value === 4 || value === 8
}
