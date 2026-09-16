export const ACTIVITY_MONITOR_SCHEMA_VERSION = 1
/** Верхняя сетка по макету 6×4. */
export const ACTIVITY_MONITOR_GRID_SIZE = 24

export type ActivityMonitorCellIndex = number

export type ActivityMonitorSubscriptionDto = {
  contactGuid?: string
  order?: number
}

export type ActivityMonitorPanelDto = {
  schemaVersion?: number
  subscriptions?: ActivityMonitorSubscriptionDto[]
}

export type ActivityMonitorSubscriptionPayload = {
  contactGuid: string
  order: number
}

export type ReplaceActivityMonitorSubscriptionsPayload = {
  subscriptions: ActivityMonitorSubscriptionPayload[]
}

export type ReorderActivityMonitorSubscriptionsPayload = {
  fromOrder: number
  toOrder: number
}

export type ActivityMonitorSubscription = {
  contactGuid: string
  cellIndex: ActivityMonitorCellIndex
}

export type ActivityMonitorPanel = {
  schemaVersion: number
  subscriptions: ActivityMonitorSubscription[]
}

export type ActivityMonitorGridCell = {
  cellIndex: ActivityMonitorCellIndex
  subscription: ActivityMonitorSubscription | null
}
