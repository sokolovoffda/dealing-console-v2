import { storeToRefs } from 'pinia'
import { computed, type CSSProperties } from 'vue'

import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'
import { type WidgetViewport, useWidgetViewport } from '@/entities/workspace'

import type { BroadcastGroupsLayoutCount } from './broadcast-groups-layout'

/** half / 1/3 → 2 колонки; monopoly / 2/3 → 4 колонки (fill). */
const isCompactViewport = (viewport: WidgetViewport): boolean => {
  return viewport === 'half' || viewport === 'one-third'
}

/** gap-2 в Tailwind = 0.5rem = 8px; одна щель между двумя видимыми рядами как в раскладке 4. */
export const BROADCAST_GROUPS_GRID_GAP_PX = 8

export const useBroadcastGroupsLayout = () => {
  const store = usePinnedCallsPanelStore()
  const {
    groupsLayout,
    persistedGroupsLayout,
  } = storeToRefs(store)
  const viewport = useWidgetViewport()

  /** Effective layout: API persisted или runtime draft. */
  const layoutCount = computed((): BroadcastGroupsLayoutCount | null => {
    return groupsLayout.value
  })

  const setLayoutCount = (count: BroadcastGroupsLayoutCount) => {
    store.setDraftGroupsLayout(count)
  }

  /**
   * Сброс раскладки при пустых группах:
   * draft всегда; если уже зафиксировано на API — PUT null.
   */
  const clearLayout = async () => {
    if (persistedGroupsLayout.value != null) {
      await store.updateGroupsLayout(null)
      return
    }

    store.clearDraftGroupsLayout()
  }

  const hasLayout = computed(() => layoutCount.value !== null)

  const isCompactLayout = computed(() => {
    return hasLayout.value && isCompactViewport(viewport.value)
  })

  /**
   * Compact + 8: ячейка как в раскладке 4 (½ высоты viewport), 4 ряда со скроллом.
   * Compact + 4: 2×2 fill без скролла.
   */
  const isScrollLayout = computed(() => {
    return isCompactLayout.value && layoutCount.value === 8
  })

  const gridStyle = computed((): CSSProperties | undefined => {
    if (layoutCount.value == null) {
      return undefined
    }

    if (isCompactLayout.value && layoutCount.value === 4) {
      return {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
      }
    }

    if (isScrollLayout.value) {
      return {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gridAutoRows: 'var(--broadcast-group-row-height)',
      }
    }

    // monopoly / two-thirds
    if (layoutCount.value === 8) {
      return {
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
      }
    }

    return {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gridTemplateRows: 'minmax(0, 1fr)',
    }
  })

  return {
    layoutCount,
    hasLayout,
    isCompactLayout,
    isScrollLayout,
    setLayoutCount,
    clearLayout,
    gridStyle,
  }
}
