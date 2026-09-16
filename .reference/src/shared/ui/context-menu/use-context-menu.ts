import {
  computed,
  onBeforeUnmount,
  ref,
  unref,
  watch,
  type MaybeRef,
  type Ref,
} from 'vue'

import type {
  ContextMenuAnchorMode,
  ContextMenuCursorPosition,
  ContextMenuItem,
  ContextMenuPlacement,
} from './types'

type UseContextMenuOptions = {
  items: MaybeRef<ContextMenuItem[]>
  anchorMode?: ContextMenuAnchorMode
  placement?: ContextMenuPlacement
  panelClass?: string
  activator?: Ref<HTMLElement | null>
}

export const useContextMenu = ({
  items,
  anchorMode = 'cursor',
  placement,
  panelClass,
  activator,
}: UseContextMenuOptions) => {
  const isOpen = ref(false)
  const cursorPosition = ref<ContextMenuCursorPosition | null>(null)

  const captureCursor = (event: MouseEvent) => {
    cursorPosition.value = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  const open = (event?: MouseEvent) => {
    if (anchorMode === 'cursor') {
      if (event) {
        captureCursor(event)
      }
    }

    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    cursorPosition.value = null
  }

  let activatorElement: HTMLElement | null = null

  const handleActivatorClick = (event: MouseEvent) => {
    if (anchorMode === 'cursor') {
      captureCursor(event)
    }
  }

  const bindActivator = (element: HTMLElement | null) => {
    if (activatorElement) {
      activatorElement.removeEventListener('click', handleActivatorClick, true)
      activatorElement = null
    }

    if (!element || anchorMode !== 'cursor') {
      return
    }

    element.addEventListener('click', handleActivatorClick, true)
    activatorElement = element
  }

  if (activator) {
    watch(activator, bindActivator, { immediate: true })
  }

  onBeforeUnmount(() => {
    bindActivator(null)
  })

  const menuProps = computed(() => ({
    open: isOpen.value,
    items: unref(items),
    anchorMode,
    cursorPosition: cursorPosition.value,
    activator: anchorMode === 'activator' ? activator?.value ?? null : null,
    placement,
    panelClass,
  }))

  return {
    isOpen,
    open,
    close,
    menuProps,
  }
}
