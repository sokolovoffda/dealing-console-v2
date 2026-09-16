<template>
  <section class="flex min-h-0 h-full flex-col overflow-hidden">
    <widget-header
      icon="clockM"
      title="История"
    />
    <div class="flex min-h-0 flex-1 flex-col gap-2">
      <div class="flex gap-2 overflow-x-auto">
        <wui-input
          v-model="searchText"
          class="w-full"
          :size="48"
          placeholder="Поиск"
          prepend-icon="search"
          with-clear
          @focus="openKeyboard"
          @click="openKeyboard"
        />

        <keyboard-modal
          v-if="keyboardVisible"
          @on-key-tap="onKeyTap"
          @close="keyboardVisible = false"
        />
      
        <my-btn
          v-for="filter in filters"
          :key="filter.id"
          class="call-history-filter-btn"
          :icon="false"
          mode="toggle"
          variant="neutcon"
          tone="dark"
          fixed-size
          :icon-tone="getFilterIconTone(filter.id)"
          :size="48"
          :active="activeFilterId === filter.id"
          :prepend-icon="filter.icon"
          @click="selectFilter(filter.id)"
        >
          {{ filter.label }}
        </my-btn>
      </div>
      <div class="flex min-h-0 flex-1 flex-col">
        <wui-data-table
          table-name="CallHistoryTable"
          :items="pageItems"
          :columns="columns"
          :sortable-column-ids="SORTABLE_COLUMN_IDS"
          :sort="sort"
          :paginator="paginationModel"
          :page-selector-threshold="1"
          :size="56"
          :column-header-class="getColumnHeaderClass"
          :auto-per-page-by-height="true"
          hide-per-page-selector
          class="min-h-0 flex-1"
          @sort="onSort"
          @update-paginator="onUpdatePaginator"
          @row-click="selectHistoryEntry"
        >
          <template #emptyData>
            {{ $t('NoData') }}
          </template>
          <template #row="{ item }">
            <td class="td-compact">
              <div class="wui-data-table__cell-content justify-center">
                <wui-icon
                  :name="item.typeIcon"
                  :class="['h-5! w-5!', getTypeIconClass(item)]"
                />
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.number }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.name }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.dateTime }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.duration }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full justify-end">
                <wui-btn
                  icon
                  :size="48"
                  variant="neut"
                  state="alpha"
                  prepend-icon="chevronRightSmM"
                  @click.stop="selectHistoryEntry(item)"
                />
              </div>
            </td>
          </template>
        </wui-data-table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  WuiBtn,
  WuiDataTable,
  WuiIcon,
  WuiInput,
  useDataTableColumnDefinitions,
} from '@wui/common-library'
import type { DataTableSortState, Pageable } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useCallCardStore } from '@/features/call-card'

import {
  CALL_HISTORY_FILTER_IDS,
  getCallHistoryPanelRows,
  useCallHistoryStore,
  type CallHistoryFilterId,
  type CallHistoryPanelRow,
  type CallHistorySortableField,
} from '@/entities/call-history'
import { useWorkspaceStore } from '@/entities/workspace'

import { useAppStore } from '@/shared/composables'
import { WidgetHeader, KeyboardModal, MyBtn, useFloatingKeyboard, type MyBtnIconName } from '@/shared/ui'
import { debounce } from '@/shared/utils/debounce'
import { throttle } from '@/shared/utils/throttle'

const SORTABLE_COLUMN_IDS = ['number', 'name', 'dateTime', 'duration'] as const
const VISIBLE_ROWS_WITH_HEADER = 11
const VISIBLE_ROWS_WITHOUT_HEADER = 12

const store = useCallHistoryStore()
const callCardStore = useCallCardStore()
const workspaceStore = useWorkspaceStore()
const { currentUser } = storeToRefs(useAppStore())
const { calls, isFullyLoaded, loading: isHistoryLoading } = storeToRefs(store)
const { isHeaderHidden } = storeToRefs(workspaceStore)

const searchText = ref('')
const { keyboardVisible, openKeyboard, onKeyTap } = useFloatingKeyboard(searchText)
const appliedSearchText = ref('')
const activeFilterId = ref<CallHistoryFilterId>(CALL_HISTORY_FILTER_IDS[0])
const sort = ref<DataTableSortState>({ field: 'dateTime', order: 'desc' })
const currentPage = ref(1)

const getPageSizeByHeaderVisibility = (headerHidden: boolean) => {
  return headerHidden ? VISIBLE_ROWS_WITHOUT_HEADER : VISIBLE_ROWS_WITH_HEADER
}

const pageSize = ref(getPageSizeByHeaderVisibility(isHeaderHidden.value))

const filters = [
  { id: 'all', label: 'Все', icon: 'phoneM' },
  { id: 'missed', label: 'Прп', icon: 'arrowElbowLeftM' },
  { id: 'incoming', label: 'Вхд', icon: 'arrowSouthWestM' },
  { id: 'outgoing', label: 'Исх', icon: 'arrowNorthEastM' },
  { id: 'frequent', label: 'Чст', icon: 'clockM' },
] as const satisfies ReadonlyArray<{
  id: CallHistoryFilterId
  label: string
  icon: MyBtnIconName
}>

const columns = useDataTableColumnDefinitions(() => [
  { id: 'type', label: 'Тип' },
  { id: 'number', label: 'Номер' },
  { id: 'name', label: 'Полное имя' },
  { id: 'dateTime', label: 'Дата и время' },
  { id: 'duration', label: 'Длительность' },
  { id: 'actions', label: '' },
] as const)

const getColumnHeaderClass = (column: typeof columns.value[number]) => {
  if (column.id === 'type') return ['td-compact', 'call-history-table__type-header']

  return 'td-compact'
}

const filteredItems = computed(() =>
  getCallHistoryPanelRows(
    calls.value,
    currentUser.value,
    {
      searchText: appliedSearchText.value,
      filterId: activeFilterId.value,
      sort: {
        field: sort.value.field as CallHistorySortableField,
        order: sort.value.order === 'asc' ? 'asc' : 'desc',
      },
    },
  ),
)

const pageItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

const paginationModel = computed<Pageable>(() => ({
  currentPage: currentPage.value,
  perPage: pageSize.value,
  total: filteredItems.value.length,
}))

const selectFilter = (filterId: CallHistoryFilterId) => {
  activeFilterId.value = filterId
  currentPage.value = 1
}

const getFilterIconTone = (filterId: CallHistoryFilterId) => {
  if (filterId === 'missed') return 'neg'

  return 'def'
}

const onSort = (field: string) => {
  if (!isSortableField(field)) return

  sort.value = {
    field,
    order: sort.value.field === field && sort.value.order === 'asc' ? 'desc' : 'asc',
  }
  currentPage.value = 1
}

const ensureHistoryForCurrentPage = async () => {
  // Догружаем older, если для страницы не хватает строк или пользователь на последней
  // странице загруженного среза (иначе при length === page*perPage курсор «застревает»).
  while (!isFullyLoaded.value && !isHistoryLoading.value) {
    const loadedCount = filteredItems.value.length
    const maxPage = Math.max(1, Math.ceil(loadedCount / pageSize.value))
    const needCount = currentPage.value * pageSize.value
    const isLastLoadedPage = currentPage.value >= maxPage
    const shouldLoadMore = needCount > loadedCount || (isLastLoadedPage && loadedCount > 0)

    if (!shouldLoadMore) break

    const loadedBefore = calls.value.length
    await store.fetchMore()
    if (calls.value.length === loadedBefore) break
  }
}

const onUpdatePaginator = throttle(({ currentPage: nextPage, perPage }: Omit<Pageable, 'total'>) => {
  pageSize.value = perPage
  currentPage.value = nextPage
  void ensureHistoryForCurrentPage()
}, 100)

const isSortableField = (field: PropertyKey): field is CallHistorySortableField => {
  return typeof field === 'string' && (SORTABLE_COLUMN_IDS as readonly string[]).includes(field)
}

const selectHistoryEntry = (item: CallHistoryPanelRow) => {
  if (!item.number || item.number === '-' || item.number === 'Конференция') return

  callCardStore.setSelectedPanelMode('dialpad')
  if (!callCardStore.open()) return

  callCardStore.setSelectedDialTarget({
    name: item.name,
    number: item.number,
  })
}

const getTypeIconClass = (item: CallHistoryPanelRow) => {
  if (item.isConference) return 'text-white'
  return item.direction === 'missed' ? 'text-red-300' : 'text-white'
}

watch(searchText, debounce(() => {
  appliedSearchText.value = searchText.value
  currentPage.value = 1
}, 1000))

watch(isHeaderHidden, (headerHidden) => {
  pageSize.value = getPageSizeByHeaderVisibility(headerHidden)
  currentPage.value = 1
})

watch(filteredItems, (items) => {
  const maxPage = Math.max(1, Math.ceil(items.length / pageSize.value))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
  void ensureHistoryForCurrentPage()
})
</script>

<style scoped>
:deep(.wui-data-table__wrap) {
  --wui-data-table-paginator-gap: 6px;
}

:deep(.wui-data-table__paginator) {
  padding-inline: 0;
}

:deep(.wui-data-table) {
  table-layout: fixed;
}

:deep(.wui-data-table th:nth-child(1)),
:deep(.wui-data-table td:nth-child(1)) {
  width: 80px;
}

:deep(.call-history-table__type-header .wui-data-table__th-content) {
  justify-content: center;
}

:deep(.call-history-table__type-header .wui-data-table__th-label) {
  flex: 0 0 auto;
}

:deep(.wui-data-table__th-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.wui-data-table th:nth-child(2)),
:deep(.wui-data-table td:nth-child(2)),
:deep(.wui-data-table th:nth-child(3)),
:deep(.wui-data-table td:nth-child(3)),
:deep(.wui-data-table th:nth-child(4)),
:deep(.wui-data-table td:nth-child(4)),
:deep(.wui-data-table th:nth-child(5)),
:deep(.wui-data-table td:nth-child(5)) {
  width: calc((100% - 136px) / 4);
}

:deep(.wui-data-table th:nth-child(6)),
:deep(.wui-data-table td:nth-child(6)) {
  width: 56px;
}
</style>
