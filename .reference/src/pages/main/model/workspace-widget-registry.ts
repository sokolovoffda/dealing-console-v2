import type { Component } from 'vue'

import { BroadcastGroupsPanel } from '@/widgets/broadcast-groups-panel'
import { ActivityMonitorPanel } from '@/widgets/activity-monitor'
import { CallHistoryPanel } from '@/widgets/call-history'
import { PhoneBookPanel } from '@/widgets/phone-book'
import { PinnedCallsPanel } from '@/widgets/pinned-calls-panel'
import { QuickCallPanel } from '@/widgets/quick-call-panel'

import type { WorkspaceWidgetType } from '@/entities/workspace'

export const workspaceWidgetRegistry: Record<WorkspaceWidgetType, Component> = {
  contacts: QuickCallPanel,
  pinnedCalls: PinnedCallsPanel,
  groups: BroadcastGroupsPanel,
  activityMonitor: ActivityMonitorPanel,
  history: CallHistoryPanel,
  phonebook: PhoneBookPanel,
}

/** Legacy API/snapshot key до переименования callQueue → activityMonitor. */
const LEGACY_WIDGET_TYPE_ALIASES: Record<string, WorkspaceWidgetType> = {
  callQueue: 'activityMonitor',
}

export const getWorkspaceWidgetComponent = (widgetType: WorkspaceWidgetType | string) => {
  const resolvedType = LEGACY_WIDGET_TYPE_ALIASES[widgetType] ?? widgetType

  return workspaceWidgetRegistry[resolvedType as WorkspaceWidgetType]
}
