import type { IconName } from '@wui/common-library'

export type ContextMenuPlacement =
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end'

export type ContextMenuPosition = {
  left: number
  top: number
}

export type ContextMenuAnchorMode = 'activator' | 'cursor'

export type ContextMenuCursorPosition = {
  x: number
  y: number
}

export type ContextMenuItemBorder = 'top' | 'bottom' | 'both'

export type ContextMenuItem = {
  label: string
  icon: IconName
  iconClass?: string
  labelClass?: string
  border?: ContextMenuItemBorder
  disabled?: boolean
  dataTest?: string
  onClick: () => void
}
