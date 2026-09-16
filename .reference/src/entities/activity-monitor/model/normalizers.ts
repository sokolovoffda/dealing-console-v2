import {
  ACTIVITY_MONITOR_GRID_SIZE,
  ACTIVITY_MONITOR_SCHEMA_VERSION,
  type ActivityMonitorGridCell,
  type ActivityMonitorPanel,
  type ActivityMonitorPanelDto,
  type ActivityMonitorSubscription,
  type ActivityMonitorSubscriptionDto,
  type ActivityMonitorSubscriptionPayload,
} from './types'

export const isValidActivityMonitorCellIndex = (cellIndex: number): boolean => {
  return Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < ACTIVITY_MONITOR_GRID_SIZE
}

const normalizeActivityMonitorSubscription = (
  subscription: ActivityMonitorSubscriptionDto,
): ActivityMonitorSubscription | null => {
  if (!subscription.contactGuid || subscription.order === undefined) return null
  if (!isValidActivityMonitorCellIndex(subscription.order)) return null

  return {
    contactGuid: subscription.contactGuid,
    cellIndex: subscription.order,
  }
}

export const normalizeActivityMonitorSubscriptions = (
  subscriptions: ActivityMonitorSubscriptionDto[] = [],
): ActivityMonitorSubscription[] => {
  const usedContactGuids = new Set<string>()
  const usedCellIndexes = new Set<number>()
  const normalizedSubscriptions: ActivityMonitorSubscription[] = []

  subscriptions.forEach((subscription) => {
    const normalizedSubscription = normalizeActivityMonitorSubscription(subscription)
    if (!normalizedSubscription) return
    if (usedContactGuids.has(normalizedSubscription.contactGuid)) return
    if (usedCellIndexes.has(normalizedSubscription.cellIndex)) return

    usedContactGuids.add(normalizedSubscription.contactGuid)
    usedCellIndexes.add(normalizedSubscription.cellIndex)
    normalizedSubscriptions.push(normalizedSubscription)
  })

  return normalizedSubscriptions
}

export const normalizeActivityMonitorPanel = (
  panel: ActivityMonitorPanelDto,
): ActivityMonitorPanel => {
  return {
    schemaVersion: panel.schemaVersion ?? ACTIVITY_MONITOR_SCHEMA_VERSION,
    subscriptions: normalizeActivityMonitorSubscriptions(panel.subscriptions),
  }
}

export const toActivityMonitorSubscriptionPayload = (
  subscription: ActivityMonitorSubscription,
): ActivityMonitorSubscriptionPayload | null => {
  if (!isValidActivityMonitorCellIndex(subscription.cellIndex)) return null

  return {
    contactGuid: subscription.contactGuid,
    order: subscription.cellIndex,
  }
}

export const toActivityMonitorSubscriptionsPayload = (
  subscriptions: ActivityMonitorSubscription[],
): ActivityMonitorSubscriptionPayload[] => {
  return subscriptions
    .map(toActivityMonitorSubscriptionPayload)
    .filter((payload): payload is ActivityMonitorSubscriptionPayload => Boolean(payload))
}

export const buildActivityMonitorGridCells = (
  subscriptions: ActivityMonitorSubscription[],
): ActivityMonitorGridCell[] => {
  const subscriptionsByCellIndex = new Map(
    subscriptions.map(subscription => [subscription.cellIndex, subscription]),
  )

  return Array.from({ length: ACTIVITY_MONITOR_GRID_SIZE }, (_, cellIndex) => ({
    cellIndex,
    subscription: subscriptionsByCellIndex.get(cellIndex) ?? null,
  }))
}
