<template>
  <section class="flex min-h-0 h-full flex-col overflow-hidden">
    <widget-header
      icon="userM"
      title="Справочник"
    />
    <div class="flex min-h-0 flex-1 flex-col gap-2">
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
      <div class="flex min-h-0 flex-1 flex-col">
        <wui-data-table
          table-name="PhonebookTable"
          :items="contactsList"
          :columns="columns"
          :sortable-column-ids="SORTABLE_COLUMN_IDS"
          :page-selector-threshold="1"
          :sort="sort"
          :paginator="paginationModel"
          :size="56"
          :column-header-class="getColumnHeaderClass"
          :auto-per-page-by-height="true"
          hide-per-page-selector
          class="min-h-0 flex-1"
          @sort="onSort"
          @update-paginator="onUpdatePaginator"
          @row-click="selectPhonebookContact"
        >
          <template #emptyData>
            {{ t('NoData') }}
          </template>
          <template #row="{ item }">
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.name }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.internalNumber }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ getDepartment(item) }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.position }}</span>
              </div>
            </td>
            <td class="td-compact">
              <div class="wui-data-table__cell-content w-full min-w-0">
                <span class="truncate">{{ item.email }}</span>
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
                  @click.stop="onArrowClick"
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
import { WuiBtn, WuiDataTable, WuiInput, useDataTableColumnDefinitions } from '@wui/common-library'
import type { DataTableSortState, Pageable } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onBeforeMount, ref, watch } from 'vue'

import { CALL_CARD_PANEL_MODES, useCallCardStore } from '@/features/call-card'

import { type Contact, useContactStore } from '@/entities/contact'
import { useWorkspaceStore } from '@/entities/workspace'

import { useLocalization } from '@/shared/i18n'
import { KeyboardModal, WidgetHeader, useFloatingKeyboard } from '@/shared/ui'
import { debounce } from '@/shared/utils/debounce'
import { throttle } from '@/shared/utils/throttle'

const SORTABLE_COLUMN_IDS = ['name', 'internalNumber', 'email'] as const
type PhonebookSortField = typeof SORTABLE_COLUMN_IDS[number]
type ServerSortField = 'name' | 'internalNumber' | 'email'

type FetchPhonebookOptions = Partial<{
  currentPage: number
  size: number
}>

const SERVER_SORT_FIELD_MAP: Partial<Record<PhonebookSortField, ServerSortField>> = {
  name: 'name',
  internalNumber: 'internalNumber',
  email: 'email',
}
const VISIBLE_ROWS_WITH_HEADER = 11
const VISIBLE_ROWS_WITHOUT_HEADER = 12

const store = useContactStore()
const { contacts, page, total } = storeToRefs(store)
const contactsList = computed(() => Array.from(contacts.value.values()))

const callCardStore = useCallCardStore()
const workspaceStore = useWorkspaceStore()
const { isHeaderHidden } = storeToRefs(workspaceStore)
const { t } = useLocalization()
const searchText = ref('')
const { keyboardVisible, openKeyboard, onKeyTap } = useFloatingKeyboard(searchText)

const sort = ref<DataTableSortState>({ field: 'name', order: 'asc' })
const getPageSizeByHeaderVisibility = (headerHidden: boolean) => {
  return headerHidden ? VISIBLE_ROWS_WITHOUT_HEADER : VISIBLE_ROWS_WITH_HEADER
}
const pageSize = ref(getPageSizeByHeaderVisibility(isHeaderHidden.value))

const columns = useDataTableColumnDefinitions(() => [
  { id: 'name', label: t('FullName') },
  { id: 'internalNumber', label: t('Number') },
  { id: 'department', label: t('Department') },
  { id: 'position', label: t('JobTitle') },
  { id: 'email', label: t('Email') },
  { id: 'actions', label: '' },
] as const)

const getColumnHeaderClass = () => 'td-compact'

onBeforeMount(() => {
  fetchFirstPage()
})

const paginationModel = computed<Pageable>(() => ({
  currentPage: page.value,
  perPage: pageSize.value,
  total: total.value,
}))

const onUpdatePaginator = throttle(async ({ currentPage, perPage }: Omit<Pageable, 'total'>) => {
  pageSize.value = perPage
  await fetchPhonebookData({ currentPage, size: perPage })
}, 100)

const onSort = async (field: string) => {
  if (!isServerSortField(field)) return

  sort.value = {
    field,
    order: sort.value.field === field && sort.value.order === 'asc' ? 'desc' : 'asc',
  }

  await fetchFirstPage()
}

const fetchFirstPage = () => {
  return fetchPhonebookData({
    currentPage: 1,
  })
}

const fetchPhonebookData = ({ currentPage = page.value, size = pageSize.value }: FetchPhonebookOptions = {}) => {
  const searchVal = searchText.value.trim()
  const sortQuery = getServerSortQuery()

  // WUI-5609: как web — параллельные Filters + merge (+ email); без SearchText / без or.
  if (searchVal) {
    return store.fetchDirectorySearch({
      searchText: searchVal,
      Page: currentPage,
      Size: size,
      ...sortQuery,
    })
  }

  return store.fetchData({
    Page: currentPage,
    Size: size,
    ...sortQuery,
  })
}

const getServerSortQuery = () => {
  const sortField = sort.value.field
  if (!isServerSortField(sortField)) return {}

  const sortBy = SERVER_SORT_FIELD_MAP[sortField]
  if (!sortBy) return {}

  return {
    SortBy: sortBy,
    Order: sort.value.order ?? 'asc',
  }
}

const isServerSortField = (field: PropertyKey): field is PhonebookSortField => {
  return typeof field === 'string' && (SORTABLE_COLUMN_IDS as readonly string[]).includes(field)
}

const getDepartment = (contact: Contact) => {
  return contact.organizationalUnit || contact.organization || ''
}

const selectPhonebookContact = (contact: Contact) => {
  if (!contact.internalNumber) return

  callCardStore.setSelectedPanelMode(CALL_CARD_PANEL_MODES.dialpad)
  if (!callCardStore.open()) return

  callCardStore.setSelectedDialTarget({
    name: contact.name,
    number: contact.internalNumber,
  })
}

const onArrowClick = () => {}

watch(searchText, debounce(fetchFirstPage, 1000))
watch(isHeaderHidden, async (headerHidden) => {
  const nextPageSize = getPageSizeByHeaderVisibility(headerHidden)
  if (pageSize.value === nextPageSize) return

  pageSize.value = nextPageSize
  await fetchPhonebookData({
    currentPage: 1,
    size: nextPageSize,
  })
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

:deep(.wui-data-table__th-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.wui-data-table th:nth-child(1)),
:deep(.wui-data-table td:nth-child(1)) {
  width: calc((100% - 56px) / 5);
  padding-left: 10px;
}

:deep(.wui-data-table th:nth-child(2)),
:deep(.wui-data-table td:nth-child(2)),
:deep(.wui-data-table th:nth-child(3)),
:deep(.wui-data-table td:nth-child(3)),
:deep(.wui-data-table th:nth-child(4)),
:deep(.wui-data-table td:nth-child(4)),
:deep(.wui-data-table th:nth-child(5)),
:deep(.wui-data-table td:nth-child(5)) {
  width: calc((100% - 56px) / 5);
}

:deep(.wui-data-table th:nth-child(6)),
:deep(.wui-data-table td:nth-child(6)) {
  width: 56px;
}
</style>
