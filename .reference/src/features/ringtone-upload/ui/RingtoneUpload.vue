<template>
  <div class="flex w-95 flex-col gap-2">
    <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
      <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
        {{ $t('DownloadNewRingtone') }}
      </p>
    </div>
    <div class="ringtone-upload__field w-full">
      <input
        ref="fileInputRef"
        type="file"
        accept="audio/*"
        class="hidden"
        @change="onFileSelected"
      >
      <wui-combobox
        v-model="selectedFileIds"
        :is-multiple="true"
        :items="fileItems"
        :placeholder="$t('SelectAudioFile')"
        :size="48"
        :allow-custom-value="false"
        chip-prepend-icon="playF"
        class="ringtone-upload__combobox w-full"
        @update:model-value="onSelectedChange"
      />
      <wui-btn
        icon
        variant="neut"
        state="alpha"
        prepend-icon="uploadM"
        :size="48"
        class="ringtone-upload__upload-btn"
        :disabled="isUploading"
        @click.stop="openFilePicker"
      />
    </div>
    <p class="text-sm leading-4 text-fg-base-fg35">
      {{ $t('RingtoneUploadFormatHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { WuiBtn, WuiCombobox } from '@wui/common-library'
import type { SelectItem } from '@wui/common-library'
import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import { type NewAudioFile, useRingtonesStore } from '@/entities/main-settings'

import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'

const { t } = useLocalization()
const ringtonesStore = useRingtonesStore()
const { customRingtone } = storeToRefs(ringtonesStore)

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFileIds = ref<string[]>([])
const fileItems = ref<SelectItem<string>[]>([])
const isUploading = ref(false)

const resetSelection = () => {
  fileItems.value = []
  selectedFileIds.value = []
}

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const uploadFile = async (file: File) => {
  const promptName = file.name.split('.')[0]?.trim() ?? ''
  if (!promptName) {
    const { showNotification } = useNotification()
    showNotification({ type: 'error', message: t('FileNotAttached') })
    resetSelection()
    return
  }

  const payload: NewAudioFile = {
    lang: 'ru-RU',
    categoryName: customRingtone.value.categoryName,
    categoryGuid: customRingtone.value.categoryGuid,
    promptName,
    promptDescription: `Загружен: ${dayjs().format('DD.MM.YYYY HH:mm')}`,
  }

  isUploading.value = true
  const { showNotification } = useNotification()

  try {
    await ringtonesStore.saveNewRingtone(file, payload)
    showNotification({ type: 'success', message: t('FileUploadSuccessfully') })
  } catch (err) {
    showNotification({ type: 'error', message: (err as Error).message })
  } finally {
    isUploading.value = false
    resetSelection()
  }
}

const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  input.value = ''

  if (!file) return

  const fileId = `ringtone-${Date.now()}`

  fileItems.value = [{ value: fileId, label: file.name }]
  selectedFileIds.value = [fileId]

  await uploadFile(file)
}

const onSelectedChange = (value: (string | number)[]) => {
  const nextIds = value.map(String)

  if (nextIds.length > 1) {
    selectedFileIds.value = [nextIds[nextIds.length - 1]!]
    return
  }

  if (nextIds.length === 0) {
    resetSelection()
    return
  }

  selectedFileIds.value = nextIds
}
</script>

<style scoped>
.ringtone-upload__field {
  position: relative;
}

.ringtone-upload__combobox :deep(.wui-combobox__inner) {
  position: relative;
}

.ringtone-upload__combobox :deep(.wui-combobox__expand) {
  visibility: hidden;
  pointer-events: none;
}

.ringtone-upload__combobox :deep(.wui-combobox__list) {
  display: none;
}

.ringtone-upload__combobox :deep(.wui-combobox__input) {
  pointer-events: none;
  caret-color: transparent;
}

.ringtone-upload__upload-btn {
  position: absolute;
  right: 4px;
  bottom: 0;
  z-index: 1;
}
</style>
