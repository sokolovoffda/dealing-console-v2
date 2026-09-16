<template>
  <section
    v-click-outside="close"
    class="flex h-[80vh] w-[1100px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-8 bg-black-800 text-white"
  >
    <header class="flex items-center justify-between gap-x-4 bg-black-735 px-4 py-3">
      <div>
        <h3 class="text-1624">{{ $t('Diagnostics') }}</h3>
        <p class="mt-1 text-1220 text-white/60">{{ $t('DiagnosticSnapshotDescription') }}</p>
      </div>
      <wui-btn :disabled="isLoading" @click="loadSnapshot">
        {{ $t('DiagnosticRefresh') }}
      </wui-btn>
    </header>

    <div class="border-b border-black-700 bg-black-700/60 px-4 py-3">
      <div class="grid grid-cols-[220px_220px_1fr] gap-3">
        <div>
          <p class="mb-1 text-1220 text-white/60">{{ $t('Category') }}</p>
          <wui-select
            v-model="selectedCategory"
            :items="categoryItems"
            class="app-select"
          />
        </div>
        <div>
          <p class="mb-1 text-1220 text-white/60">{{ $t('DiagnosticPeriod') }}</p>
          <wui-select
            v-model="selectedPreset"
            :items="periodItems"
            class="app-select"
          />
        </div>
        <div class="grid grid-cols-4 gap-2 text-1220 text-white/80">
          <div class="min-w-0">
            <p class="text-white/50">{{ $t('DiagnosticCollectedAt') }}</p>
            <p class="truncate">{{ formatDateTime(snapshot?.metadata.collectedAt) }}</p>
          </div>
          <div class="min-w-0">
            <p class="text-white/50">{{ $t('DiagnosticUser') }}</p>
            <p class="truncate">{{ snapshot?.metadata.userLogin || '-' }}</p>
          </div>
          <div class="min-w-0">
            <p class="text-white/50">{{ $t('DiagnosticRoute') }}</p>
            <p class="truncate">{{ snapshot?.metadata.route || '-' }}</p>
          </div>
          <div class="min-w-0">
            <p class="text-white/50">{{ $t('DiagnosticHostname') }}</p>
            <p class="truncate">{{ snapshot?.metadata.hostname || '-' }}</p>
          </div>
        </div>
      </div>
    </div>

    <main class="grid min-h-0 flex-1 grid-cols-[420px_1fr]">
      <div class="flex min-h-0 flex-col border-r border-black-700">
        <div class="grid grid-cols-[110px_60px_110px_1fr] gap-x-2 border-b border-black-700 px-4 py-2 text-1220 text-white/60">
          <span>{{ $t('DateAndTime') }}</span>
          <span>{{ $t('DiagnosticLevel') }}</span>
          <span>{{ $t('DiagnosticSource') }}</span>
          <span>{{ $t('Title') }}</span>
        </div>
        <div v-if="isLoading" class="flex flex-1 items-center justify-center px-4 text-1320 text-white/60">
          {{ $t('DiagnosticLoading') }}
        </div>
        <div v-else-if="loadError" class="flex flex-1 items-center justify-center px-4 text-center text-1320 text-red-300">
          {{ loadError }}
        </div>
        <div v-else-if="!visibleRecords.length" class="flex flex-1 items-center justify-center px-4 text-1320 text-white/60">
          {{ $t('NoData') }}
        </div>
        <div v-else class="min-h-0 flex-1 overflow-y-auto">
          <button
            v-for="record in visibleRecords"
            :key="record.id"
            type="button"
            class="grid w-full grid-cols-[110px_60px_110px_1fr] gap-x-2 border-b border-black-700 px-4 py-3 text-left transition hover:bg-black-700/60"
            :class="{ 'bg-black-700': selectedRecord?.id === record.id }"
            @click="selectedRecordId = record.id"
          >
            <span class="text-1220 text-white/70">{{ formatTime(record.timestamp) }}</span>
            <span class="text-1220 uppercase text-white/70">{{ record.level }}</span>
            <span class="truncate text-1220 text-white/70">{{ record.source }}</span>
            <span class="truncate text-1320">{{ record.message }}</span>
          </button>
        </div>
      </div>

      <div class="min-h-0 overflow-y-auto px-4 py-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-1220 text-white/50">{{ $t('DiagnosticAppVersion') }}</p>
            <p class="text-1320">{{ snapshot?.metadata.appVersion || '-' }}</p>
          </div>
          <div>
            <p class="text-1220 text-white/50">{{ $t('DiagnosticPlatform') }}</p>
            <p class="text-1320">{{ snapshot?.metadata.platform || '-' }}</p>
          </div>
          <div>
            <p class="text-1220 text-white/50">{{ $t('DiagnosticNetworkState') }}</p>
            <p class="text-1320">{{ snapshot?.metadata.networkState || '-' }}</p>
          </div>
          <div>
            <p class="text-1220 text-white/50">{{ $t('Number') }}</p>
            <p class="text-1320">{{ snapshot?.metadata.userNumber || '-' }}</p>
          </div>
          <div>
            <p class="text-1220 text-white/50">{{ $t('DiagnosticHarEntries') }}</p>
            <p class="text-1320">{{ harEntryCount }}</p>
          </div>
        </div>

        <div class="mt-6">
          <p class="text-1220 text-white/50">{{ $t('DiagnosticRecordDetails') }}</p>
          <div v-if="selectedRecord" class="mt-2 rounded-8 border border-black-700 bg-black-700/40 p-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <p class="text-1220 text-white/50">{{ $t('Category') }}</p>
                <p class="text-1320">{{ getCategoryLabel(selectedRecord.category) }}</p>
              </div>
              <div>
                <p class="text-1220 text-white/50">{{ $t('DiagnosticLevel') }}</p>
                <p class="text-1320 uppercase">{{ selectedRecord.level }}</p>
              </div>
              <div>
                <p class="text-1220 text-white/50">{{ $t('DiagnosticSource') }}</p>
                <p class="text-1320 break-all">{{ selectedRecord.source }}</p>
              </div>
              <div>
                <p class="text-1220 text-white/50">{{ $t('DateAndTime') }}</p>
                <p class="text-1320">{{ formatDateTime(selectedRecord.timestamp) }}</p>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-1220 text-white/50">{{ $t('Title') }}</p>
              <p class="text-1320">{{ selectedRecord.message }}</p>
            </div>
            <div class="mt-4">
              <p class="text-1220 text-white/50">{{ $t('DiagnosticPayload') }}</p>
              <pre class="mt-2 overflow-x-auto rounded-8 bg-black-800 p-3 text-1220 text-white/80">{{ selectedRecordPayload }}</pre>
            </div>
          </div>
          <div v-else class="mt-2 rounded-8 border border-dashed border-black-700 px-4 py-6 text-1320 text-white/60">
            {{ $t('DiagnosticSelectRecord') }}
          </div>
        </div>
      </div>
    </main>

    <footer class="flex items-center justify-between gap-x-4 border-t border-black-700 bg-black-800 px-4 py-4">
      <div class="min-w-0 text-1220" :class="copyStatusClass">
        {{ copyStatusText }}
      </div>
      <div class="flex items-center gap-x-2">
        <wui-btn :disabled="isLoading || !hasHarArtifact" @click="copyHarToClipboard">
          {{ $t('DiagnosticCopyHar') }}
        </wui-btn>
        <wui-btn :disabled="isLoading || !snapshot" @click="copySnapshotToClipboard">
          {{ $t('DiagnosticCopyJson') }}
        </wui-btn>
        <wui-btn @click="close()">
          {{ $t('Cancel') }}
        </wui-btn>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { closeDialogKey, ClickOutside as vClickOutside, safeInject, WuiBtn, WuiSelect } from '@wui/common-library'
import { computed, onMounted, ref, watch } from 'vue'

import {
  createRendererDiagnosticsSnapshot,
  diagnosticCategories,
  diagnosticPeriodPresets,
  mergeDiagnosticSnapshots,
  type DiagnosticCategory,
  type DiagnosticHarLog,
  type DiagnosticLogRecord,
  type DiagnosticPeriodPreset,
  type DiagnosticSnapshot,
  type DiagnosticSnapshotRequest,
} from '@/features/diagnostics/model'

import { useLocalization } from '@/shared/i18n'

type DiagnosticsCategoryOption = DiagnosticCategory | 'all'

const closeDialog = safeInject(closeDialogKey)
const { t } = useLocalization()

const selectedCategory = ref<DiagnosticsCategoryOption>('all')
const selectedPreset = ref<DiagnosticPeriodPreset>(diagnosticPeriodPresets.LAST_HOUR)
const snapshot = ref<DiagnosticSnapshot | null>(null)
const selectedRecordId = ref<string>('')
const visibleRecords = ref<DiagnosticLogRecord[]>([])
const selectedRecord = ref<DiagnosticLogRecord | null>(null)
const selectedRecordPayload = ref('-')
const isLoading = ref(false)
const loadError = ref('')
const copyStatus = ref<'idle' | 'success' | 'error'>('idle')
const copyStatusText = ref('')

const periodDurationMap: Record<DiagnosticPeriodPreset, number> = {
  [diagnosticPeriodPresets.LAST_15_MINUTES]: 15 * 60 * 1000,
  [diagnosticPeriodPresets.LAST_HOUR]: 60 * 60 * 1000,
  [diagnosticPeriodPresets.LAST_24_HOURS]: 24 * 60 * 60 * 1000,
  [diagnosticPeriodPresets.CUSTOM]: 24 * 60 * 60 * 1000,
}

const sortRecordsByTimestampDesc = (left: DiagnosticLogRecord, right: DiagnosticLogRecord) => {
  return Date.parse(right.timestamp) - Date.parse(left.timestamp)
}

const collectVisibleRecords = (
  diagnosticSnapshot: DiagnosticSnapshot,
  category: DiagnosticsCategoryOption,
): DiagnosticLogRecord[] => {
  if (category === 'all') {
    const records: DiagnosticLogRecord[] = []

    diagnosticSnapshot.categories.forEach((item) => {
      records.push(...item.records)
    })

    return records.sort(sortRecordsByTimestampDesc)
  }

  const categorySnapshot = diagnosticSnapshot.categories.find((item) => item.category === category)
  return [...(categorySnapshot?.records ?? [])].sort(sortRecordsByTimestampDesc)
}

const categoryItems = computed(() => {
  return [
    { value: 'all', label: t('DiagnosticCategoryAll') },
    { value: diagnosticCategories.CONSOLE, label: t('DiagnosticCategoryConsole') },
    { value: diagnosticCategories.NETWORK, label: t('DiagnosticCategoryNetwork') },
    { value: diagnosticCategories.WEBSOCKET, label: t('DiagnosticCategoryWebSocket') },
    { value: diagnosticCategories.WEB_RTC, label: t('DiagnosticCategoryWebRTC') },
    { value: diagnosticCategories.SYSTEM, label: t('DiagnosticCategorySystem') },
    { value: diagnosticCategories.APP_METADATA, label: t('DiagnosticCategoryAppMetadata') },
  ]
})

const periodItems = computed(() => {
  return [
    { value: diagnosticPeriodPresets.LAST_15_MINUTES, label: t('DiagnosticPeriodLast15Minutes') },
    { value: diagnosticPeriodPresets.LAST_HOUR, label: t('DiagnosticPeriodLastHour') },
    { value: diagnosticPeriodPresets.LAST_24_HOURS, label: t('DiagnosticPeriodLast24Hours') },
  ]
})

const getFilterRequest = (): DiagnosticSnapshotRequest => {
  const to = new Date()
  const duration = periodDurationMap[selectedPreset.value] ?? periodDurationMap[diagnosticPeriodPresets.LAST_HOUR]
  const from = new Date(to.getTime() - duration)

  return {
    filter: {
      categories: selectedCategory.value === 'all' ? undefined : [selectedCategory.value],
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        preset: selectedPreset.value,
      },
      limit: 500,
    },
  }
}

const getCategoryLabel = (category: DiagnosticCategory) => {
  const item = categoryItems.value.find((option) => option.value === category)
  return item?.label ?? category
}

const getExportSnapshot = (): DiagnosticSnapshot | null => {
  if (!snapshot.value) {
    return null
  }

  const categories = selectedCategory.value === 'all'
    ? snapshot.value.categories
    : snapshot.value.categories.filter((item) => item.category === selectedCategory.value)

  return {
    ...snapshot.value,
    categories,
  }
}

const getExportHarDocument = (): { log: DiagnosticHarLog } | null => {
  const networkHar = snapshot.value?.artifacts.networkHar

  if (!networkHar) {
    return null
  }

  return {
    log: networkHar.log,
  }
}

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

const formatTime = (value: string) => {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

const loadSnapshot = async () => {
  isLoading.value = true
  loadError.value = ''
  copyStatus.value = 'idle'
  copyStatusText.value = ''

  try {
    const request = getFilterRequest()
    const [rendererSnapshot, mainSnapshot] = await Promise.all([
      createRendererDiagnosticsSnapshot(request),
      window.electronAPI.getDiagnosticsSnapshot(request) as Promise<DiagnosticSnapshot>,
    ])

    snapshot.value = mergeDiagnosticSnapshots(rendererSnapshot, mainSnapshot)
    syncVisibleRecords()
  } catch (error) {
    snapshot.value = null
    selectedRecordId.value = ''
    visibleRecords.value = []
    loadError.value = error instanceof Error ? error.message : t('DiagnosticLoadFailed')
  } finally {
    isLoading.value = false
  }
}

const syncVisibleRecords = () => {
  if (!snapshot.value) {
    visibleRecords.value = []
    selectedRecordId.value = ''
    syncSelectedRecord()
    return
  }

  visibleRecords.value = collectVisibleRecords(snapshot.value, selectedCategory.value)

  if (!visibleRecords.value.some((record) => record.id === selectedRecordId.value)) {
    selectedRecordId.value = visibleRecords.value[0]?.id ?? ''
  }

  syncSelectedRecord()
}

const syncSelectedRecord = () => {
  selectedRecord.value = visibleRecords.value.find((record) => record.id === selectedRecordId.value) ?? null
  selectedRecordPayload.value = selectedRecord.value?.payload
    ? JSON.stringify(selectedRecord.value.payload, null, 2)
    : '-'
}

const close = (value?: unknown) => {
  closeDialog(value)
}

const copyStatusClass = computed(() => {
  if (copyStatus.value === 'success') {
    return 'text-green-300'
  }

  if (copyStatus.value === 'error') {
    return 'text-red-300'
  }

  return 'text-white/50'
})

const hasHarArtifact = computed(() => {
  return Boolean(snapshot.value?.artifacts.networkHar)
})

const harEntryCount = computed(() => {
  return snapshot.value?.artifacts.networkHar?.entryCount ?? 0
})

const copySnapshotToClipboard = async () => {
  const exportSnapshot = getExportSnapshot()

  if (!exportSnapshot) {
    copyStatus.value = 'error'
    copyStatusText.value = t('DiagnosticCopyFailed')
    return
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(exportSnapshot, null, 2))
    copyStatus.value = 'success'
    copyStatusText.value = selectedCategory.value === 'all'
      ? t('DiagnosticCopyAllSuccess')
      : t('DiagnosticCopyCategorySuccess')
  } catch (error) {
    console.error(error)
    copyStatus.value = 'error'
    copyStatusText.value = t('DiagnosticCopyFailed')
  }
}

const copyHarToClipboard = async () => {
  const exportHarDocument = getExportHarDocument()

  if (!exportHarDocument) {
    copyStatus.value = 'error'
    copyStatusText.value = t('DiagnosticCopyHarUnavailable')
    return
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(exportHarDocument, null, 2))
    copyStatus.value = 'success'
    copyStatusText.value = t('DiagnosticCopyHarSuccess')
  } catch (error) {
    console.error(error)
    copyStatus.value = 'error'
    copyStatusText.value = t('DiagnosticCopyHarFailed')
  }
}

watch(selectedCategory, async () => {
  await loadSnapshot()
})

watch(selectedPreset, async () => {
  await loadSnapshot()
})

watch(visibleRecords, (records) => {
  if (!records.some((record) => record.id === selectedRecordId.value)) {
    selectedRecordId.value = records[0]?.id ?? ''
  }
})

watch(selectedRecordId, () => {
  syncSelectedRecord()
})

onMounted(async () => {
  await loadSnapshot()
})
</script>
