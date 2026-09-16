<template>
  <wui-data-table
    table-name="RingtonesTable"
    :items="tableItems"
    :columns="columns"
    :sortable-column-ids="SORTABLE_COLUMN_IDS"
    :sort="sort"
    :size="56"
    is-disabled-paginator
    :auto-per-page-by-height="false"
    class="ringtones-table w-full"
    @sort="onSort"
  >
    <template #emptyData>
      {{ t('NoData') }}
    </template>
    <template #row="{ item }">
      <td>
        <div class="wui-data-table__cell-content w-full min-w-0">
          <span class="truncate">{{ item.name }}</span>
        </div>
      </td>
      <td>
        <div class="wui-data-table__cell-content w-full min-w-0">
          <span class="truncate">{{ item.categoryName }}</span>
        </div>
      </td>
      <td class="ringtones-table__player-cell">
        <div class="wui-data-table__cell-content w-full min-w-0">
          <table-audio-player
            :audio-src="item.path"
            :track-name="item.name"
          />
        </div>
      </td>
      <td>
        <div class="wui-data-table__cell-content w-full min-w-0">
          <span class="truncate">{{ item.description }}</span>
        </div>
      </td>
      <td class="ringtones-table__action-cell">
        <div class="wui-data-table__cell-content w-full justify-center">
          <wui-btn
            v-if="item.isDeletable"
            icon
            :size="48"
            variant="negative"
            state="alpha"
            prepend-icon="trashM"
            @click.stop="onRemove(item.guid)"
          />
        </div>
      </td>
    </template>
  </wui-data-table>
</template>

<script setup lang="ts">
import {
  WuiBtn,
  WuiDataTable,
  useDataTableColumnDefinitions,
} from '@wui/common-library'
import type { DataTableSortState } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import { useRingtonesStore } from '@/entities/main-settings'

import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'
import { TableAudioPlayer } from '@/shared/ui'

const SORTABLE_COLUMN_IDS = ['name'] as const

const ringtonesStore = useRingtonesStore()
const { ringtonesList } = storeToRefs(ringtonesStore)

const { t } = useLocalization()

const sort = ref<DataTableSortState>({ field: 'name', order: 'asc' })

const columns = useDataTableColumnDefinitions(() => [
  { id: 'name', label: t('Title') },
  { id: 'categoryName', label: t('Category') },
  { id: 'player', label: t('ListenToAudio') },
  { id: 'description', label: t('Note') },
  { id: 'actions', label: t('Action') },
] as const)

const tableItems = computed(() => {
  const items = Array.from(ringtonesList.value.values()).map((item) => ({
    guid: item.guid,
    name: item.name,
    categoryName: item.categoryName,
    path: item.path,
    description: item.description,
    isDeletable: item.isDeletable,
  }))
  const { field, order } = sort.value

  if (field !== 'name') return items

  return items.sort((left, right) => {
    const compareResult = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    return order === 'asc' ? compareResult : -compareResult
  })
})

const onSort = (field: string) => {
  if (field !== 'name') return

  sort.value = {
    field,
    order: sort.value.field === field && sort.value.order === 'asc' ? 'desc' : 'asc',
  }
}

const onRemove = (guid: string) => {
  const { showNotification } = useNotification()

  ringtonesStore.removeRingtone(guid)
    .then(() => showNotification({ type: 'success', message: t('AudioFileSuccessfullyDeleted') }))
    .catch((err: Error) => showNotification({ type: 'error', message: err.message }))
}
</script>

<style scoped>
:deep(.wui-data-table__wrap) {
  flex-grow: 0;
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
  width: 280px;
}

:deep(.wui-data-table th:nth-child(2)),
:deep(.wui-data-table td:nth-child(2)) {
  width: 200px;
}

:deep(.wui-data-table th:nth-child(3)),
:deep(.wui-data-table td:nth-child(3)) {
  width: 320px;
}

:deep(.wui-data-table th:nth-child(4)),
:deep(.wui-data-table td:nth-child(4)) {
  width: auto;
}

:deep(.wui-data-table th:nth-child(5)),
:deep(.wui-data-table td:nth-child(5)) {
  width: 144px;
}

.ringtones-table__player-cell {
  padding-right: 24px;
}

.ringtones-table__action-cell {
  padding: 4px;
}
</style>
