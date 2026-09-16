import type { WorkspaceWidgetType } from '@/entities/workspace'

export type MonopolyWidgetRouteMeta = {
  workspaceWidgetType: WorkspaceWidgetType
}

declare module 'vue-router' {
  interface RouteMeta {
    workspaceWidgetType?: WorkspaceWidgetType
  }
}
