import { type ComputedRef, computed } from 'vue'

import { type WidgetViewport, useWidgetViewport } from '@/entities/workspace'

const PINNED_CALLS_GRID_COLUMNS: Record<WidgetViewport, number> = {
  monopoly: 3,
  'two-thirds': 2,
  half: 2,
  'one-third': 1,
}

export const usePinnedCallsGridColumns = (): ComputedRef<number> => {
  const viewport = useWidgetViewport()

  return computed(() => PINNED_CALLS_GRID_COLUMNS[viewport.value])
}
