import { nextTick, type Ref, ref, watch } from 'vue'

import type { ContextMenuCursorPosition, ContextMenuPlacement, ContextMenuPosition } from './types'

type ContextMenuAnchor =
  | { type: 'element', element: HTMLElement }
  | { type: 'point', point: ContextMenuCursorPosition }

type UseContextMenuPositionOptions = {
  open: Ref<boolean>
  anchor: Ref<ContextMenuAnchor | null>
  menu: Ref<HTMLElement | null>
  placement?: Ref<ContextMenuPlacement> | ContextMenuPlacement
  offset?: number
  viewportPadding?: number
}

const getAnchorRect = (anchor: ContextMenuAnchor): DOMRect => {
  if (anchor.type === 'element') {
    return anchor.element.getBoundingClientRect()
  }

  const { x, y } = anchor.point

  return {
    x,
    y,
    left: x,
    top: y,
    right: x,
    bottom: y,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  }
}

const getPlacement = (
  placement: ContextMenuPlacement,
  activatorRect: DOMRect,
  menuRect: DOMRect,
  offset: number,
): ContextMenuPosition => {
  switch (placement) {
  case 'top-start':
    return {
      left: activatorRect.left,
      top: activatorRect.top - menuRect.height - offset,
    }
  case 'top-end':
    return {
      left: activatorRect.right - menuRect.width,
      top: activatorRect.top - menuRect.height - offset,
    }
  case 'bottom-end':
    return {
      left: activatorRect.right - menuRect.width,
      top: activatorRect.bottom + offset,
    }
  case 'left-start':
    return {
      left: activatorRect.left - menuRect.width - offset,
      top: activatorRect.top,
    }
  case 'left-end':
    return {
      left: activatorRect.left - menuRect.width - offset,
      top: activatorRect.bottom - menuRect.height,
    }
  case 'right-start':
    return {
      left: activatorRect.right + offset,
      top: activatorRect.top,
    }
  case 'right-end':
    return {
      left: activatorRect.right + offset,
      top: activatorRect.bottom - menuRect.height,
    }
  case 'bottom-start':
  default:
    return {
      left: activatorRect.left,
      top: activatorRect.bottom + offset,
    }
  }
}

const clampPosition = (
  position: ContextMenuPosition,
  menuRect: DOMRect,
  viewportPadding: number,
): ContextMenuPosition => {
  const maxLeft = Math.max(viewportPadding, window.innerWidth - menuRect.width - viewportPadding)
  const maxTop = Math.max(viewportPadding, window.innerHeight - menuRect.height - viewportPadding)

  return {
    left: Math.min(Math.max(position.left, viewportPadding), maxLeft),
    top: Math.min(Math.max(position.top, viewportPadding), maxTop),
  }
}

export const useContextMenuPosition = ({
  open,
  anchor,
  menu,
  placement = 'bottom-start',
  offset = 4,
  viewportPadding = 8,
}: UseContextMenuPositionOptions) => {
  const position = ref<ContextMenuPosition>({ left: 0, top: 0 })

  const resolvePlacement = () => {
    return typeof placement === 'string' ? placement : placement.value
  }

  const updatePosition = () => {
    const anchorValue = anchor.value
    const menuElement = menu.value

    if (!anchorValue || !menuElement) {
      return
    }

    const anchorRect = getAnchorRect(anchorValue)
    const menuRect = menuElement.getBoundingClientRect()

    position.value = clampPosition(
      getPlacement(resolvePlacement(), anchorRect, menuRect, offset),
      menuRect,
      viewportPadding,
    )
  }

  const addListeners = () => {
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
  }

  const removeListeners = () => {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
  }

  watch(open, async (isOpen) => {
    if (!isOpen) {
      removeListeners()
      return
    }

    await nextTick()
    updatePosition()
    requestAnimationFrame(updatePosition)
    addListeners()
  }, { flush: 'post' })

  watch(menu, () => {
    if (open.value) {
      updatePosition()
    }
  })

  if (typeof placement !== 'string') {
    watch(placement, () => {
      if (open.value) {
        updatePosition()
      }
    })
  }

  watch(anchor, () => {
    if (open.value) {
      updatePosition()
    }
  }, { deep: true })

  return {
    position,
    updatePosition,
  }
}
