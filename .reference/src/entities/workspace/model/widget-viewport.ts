import type { WorkspaceLayout, WorkspaceWidgetPosition } from './types'

export type WidgetViewport = 'monopoly' | 'two-thirds' | 'half' | 'one-third'

export const MONOPOLY_WIDGET_VIEWPORT: WidgetViewport = 'monopoly'

export const resolveWidgetViewport = (
  layout: WorkspaceLayout,
  position: WorkspaceWidgetPosition,
): WidgetViewport => {
  switch (layout) {
  case 'two-equal':
    return 'half'
  case 'two-left-narrow':
    return position === 0 ? 'one-third' : 'two-thirds'
  case 'two-right-narrow':
    return position === 0 ? 'two-thirds' : 'one-third'
  case 'three-equal':
    return 'one-third'
  }
}
