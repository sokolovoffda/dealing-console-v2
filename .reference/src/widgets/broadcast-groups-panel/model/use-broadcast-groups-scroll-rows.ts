import { computed, onBeforeUnmount, ref, watch, type CSSProperties, type Ref } from 'vue'

import { BROADCAST_GROUPS_GRID_GAP_PX } from './use-broadcast-groups-layout'

/**
 * Высота ряда для compact+8: как у раскладки 4 (½ viewport − gap).
 */
export const useBroadcastGroupsScrollRows = (isScrollLayout: Readonly<Ref<boolean>>) => {
  const gridViewportEl = ref<HTMLElement | null>(null)
  const scrollRowHeightPx = ref<number | null>(null)

  let gridViewportObserver: ResizeObserver | null = null

  const gridViewportStyle = computed((): CSSProperties | undefined => {
    if (!isScrollLayout.value || scrollRowHeightPx.value == null) {
      return undefined
    }

    return {
      '--broadcast-group-row-height': `${scrollRowHeightPx.value}px`,
    }
  })

  const updateScrollRowHeight = () => {
    const el = gridViewportEl.value
    if (!el || !isScrollLayout.value) {
      scrollRowHeightPx.value = null
      return
    }

    scrollRowHeightPx.value = Math.max(0, (el.clientHeight - BROADCAST_GROUPS_GRID_GAP_PX) / 2)
  }

  const bindGridViewportObserver = () => {
    gridViewportObserver?.disconnect()
    gridViewportObserver = null

    const el = gridViewportEl.value
    if (!el || !isScrollLayout.value) {
      scrollRowHeightPx.value = null
      return
    }

    gridViewportObserver = new ResizeObserver(() => {
      updateScrollRowHeight()
    })
    gridViewportObserver.observe(el)
    updateScrollRowHeight()
  }

  watch([isScrollLayout, gridViewportEl], () => {
    bindGridViewportObserver()
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    gridViewportObserver?.disconnect()
    gridViewportObserver = null
  })

  return {
    gridViewportEl,
    gridViewportStyle,
  }
}
