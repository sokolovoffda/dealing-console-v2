<template>
  <!--
    WUI-5527: Main Settings wired to useMainSettingsStore (step 2.2).
    Ringtones CRUD — step 2.3; REST persist — step 2.5.
  -->
  <section class="flex min-w-0 flex-col">
    <section class="flex flex-col">
      <settings-cblock-title>
        {{ $t('TrainingSettings') }}
      </settings-cblock-title>
      <div
        class="flex flex-col items-start gap-6 border-b border-wrkspc-main-cblock-brd-def p-8"
      >
        <div class="flex flex-wrap items-end gap-6">
          <div class="flex w-95 flex-col gap-2">
            <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
              <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
                {{ $t('ShowTraining') }}
              </p>
            </div>
            <wui-select
              v-model="settings.showTraining"
              :items="trainingModeItems"
              class="app-select main-settings-select w-full"
              :size="48"
            />
          </div>
          <div class="flex w-95 items-end">
            <!-- TODO(WUI-5527): сброс прогресса тултипов — пока без callback -->
            <wui-btn
              variant="brand"
              state="tonal"
              prepend-icon="refreshM"
              :size="48"
            >
              {{ $t('ResetProgress') }}
            </wui-btn>
          </div>
        </div>
      </div>
    </section>

    <!-- Настройка локализации -->
    <section class="flex flex-col">
      <settings-cblock-title>
        {{ $t('LocalizationSettings') }}
      </settings-cblock-title>
      <div
        class="flex flex-col items-start gap-6 border-b border-wrkspc-main-cblock-brd-def p-8"
      >
        <div class="flex w-95 flex-col gap-2">
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ $t('SelectLocalization') }}
            </p>
          </div>
          <wui-select
            v-model="localeModel"
            :items="localeItems"
            class="app-select main-settings-select w-full"
            :size="48"
          />
        </div>
      </div>
    </section>

    <!-- Групповые вызовы -->
    <section class="flex flex-col">
      <settings-cblock-title>
        {{ $t('GroupCalls') }}
      </settings-cblock-title>
      <div
        class="main-settings-cblock flex flex-col items-start gap-6 border-b border-wrkspc-main-cblock-brd-def p-8"
      >
        <div class="main-settings-switch w-full">
          <wui-input-switch
            v-model="settings.isAutomaticallyConferenceRecordEnabled"
            :label="$t('AutomaticallyRecordGroupCalls')"
            :size="26"
          />
        </div>
      </div>
    </section>

    <!-- При снятии трубки -->
    <section class="flex flex-col">
      <settings-cblock-title>
        {{ $t('HandsetPickupSettings') }}
      </settings-cblock-title>
      <div
        class="main-settings-cblock flex flex-col items-start gap-6 border-b border-wrkspc-main-cblock-brd-def p-8"
      >
        <div class="main-settings-switch w-full">
          <wui-input-switch
            v-model="settings.openCallCardOnHandsetPickup"
            :label="$t('OpenCallCardOnHandsetPickup')"
            :size="26"
          />
        </div>
        <div class="main-settings-switch w-full">
          <wui-input-switch
            v-model="settings.autoAnswerOnHandsetPickup"
            :label="$t('AutoAnswerOnHandsetPickup')"
            :size="26"
          />
        </div>
      </div>
    </section>

    <!-- Настройка уведомлений -->
    <section class="flex flex-col">
      <settings-cblock-title>
        {{ $t('NotificationSettings') }}
      </settings-cblock-title>
      <div
        class="main-settings-cblock flex flex-col items-start gap-6 border-b border-wrkspc-main-cblock-brd-def p-8"
      >
        <div class="main-settings-switch w-full">
          <wui-input-switch
            v-model="settings.isIncomingCallSoundEnabled"
            :label="$t('PlayIncomingCallRingtone')"
            :size="26"
          />
        </div>
        <div class="flex w-95 flex-col gap-2">
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ $t('SelectARingtoneForIncomingCalls') }}
            </p>
          </div>
          <wui-select
            v-model="incomingRingtoneModel"
            :items="ringtoneSelectItems"
            :placeholder="$t('ByDefault')"
            class="app-select main-settings-select w-full"
            :size="48"
          />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ $t('SelectVolumeForIncomingCalls') }}
            </p>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="main-settings-volume-range w-95 shrink-0">
              <wui-input-range
                v-model="settings.incomingCallVolume"
                orientation="horizontal"
                :min="0"
                :max="100"
                :step="1"
                :size="48"
                btn
                btn-icon="volumeOnF"
                btn-off-icon="volumeOffF"
              />
            </div>
            <!-- TODO: percent label — temporary until WuiInputRange supports value suffix in common-library -->
            <p
              class="w-12 shrink-0 text-lg leading-6 tabular-nums text-wrkspc-main-cblock-txt-def"
              data-test="main-settings-volume-percent"
            >
              {{ settings.incomingCallVolume }}%
            </p>
          </div>
        </div>
        <div class="flex w-full min-w-0 flex-col gap-4">
          <div class="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 self-stretch">
            <p class="min-w-0 text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ $t('UploadedAudioFiles') }}
            </p>
            <div class="ml-auto flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
              <p class="shrink-0 text-lg leading-6 text-fg-base-fg35 pt-1">
                {{ audioFilesUsedSpaceLabel }}
              </p>
              <div
                class="h-6 w-50 shrink-0 overflow-hidden rounded-6 bg-bg-base-bg8"
                role="progressbar"
                :aria-valuenow="usedSpace.usedSpace"
                :aria-valuemin="0"
                :aria-valuemax="usedSpace.allSpace"
                :aria-label="audioFilesUsedSpaceLabel"
              >
                <div
                  class="h-full rounded-6 bg-surf-brand-basedarkblue-def"
                  :style="{ width: `${audioFilesUsedSpacePercent}%` }"
                />
              </div>
            </div>
          </div>
          <div class="min-w-0 w-full overflow-x-auto">
            <ringtones-table />
          </div>
          <ringtone-upload />
        </div>
      </div>
    </section>

    <!-- Сбросить настройки -->
    <section class="flex flex-col">
      <settings-cblock-title>
        {{ $t('ResetSettings') }}
      </settings-cblock-title>
      <div class="flex flex-col items-start p-8">
        <div class="flex flex-wrap items-center gap-6">
          <div class="flex-1 items-center">
            <p class="text-lg leading-6 text-wrkspc-main-cblock-txt-def">
              {{ $t('ResetSettingsDescription') }}
            </p>
          </div>
          <div class="flex">
            <wui-btn
              variant="brand"
              state="tonal"
              prepend-icon="refreshM"
              :size="48"
              :disabled="saving"
              @click="handleResetSettings"
            >
              {{ $t('ResetSettings') }}
            </wui-btn>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { WuiBtn, WuiInputRange, WuiInputSwitch, WuiSelect, useDialog } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, watch, type ComponentOptions } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import { RingtonesTable } from '@/widgets/ringtones-table'

import { RingtoneUpload } from '@/features/ringtone-upload'

import { findRingtoneByGuid, useMainSettingsStore, useRingtonesStore } from '@/entities/main-settings'

import { Locales, useLocalization } from '@/shared/i18n'

import SettingsCblockTitle from '../../ui/SettingsCblockTitle.vue'

import ResetMainSettingsConfirmModal from './ResetMainSettingsConfirmModal.vue'

const mainSettingsStore = useMainSettingsStore()
const { settings, saving } = storeToRefs(mainSettingsStore)
const { applyLocale, patchSettings, resetToDefaultsAndSave, saveIfDirty } = mainSettingsStore
const { showDialog } = useDialog<boolean | undefined>()

const ringtonesStore = useRingtonesStore()
void ringtonesStore.loadStore()
const { ringtonesList, usedSpace } = storeToRefs(ringtonesStore)

const { t, getLocales } = useLocalization()

const handleResetSettings = async () => {
  const isConfirmed = await showDialog(ResetMainSettingsConfirmModal as ComponentOptions)

  if (!isConfirmed) {
    return
  }

  void resetToDefaultsAndSave().catch(console.error)
}

onBeforeRouteLeave(() => {
  return saveIfDirty()
})

const incomingRingtoneModel = computed({
  get: () => settings.value.incomingRingtoneGuid,
  set: (guid: string) => {
    const ringtone = guid ? findRingtoneByGuid(ringtonesList.value.values(), guid) : undefined
    patchSettings({ incomingRingtoneGuid: ringtone?.guid ?? guid })
  },
})

watch(
  ringtonesList,
  (list) => {
    const guid = settings.value.incomingRingtoneGuid
    if (guid && !findRingtoneByGuid(list.values(), guid)) {
      patchSettings({ incomingRingtoneGuid: '' })
    }
  },
  { deep: true },
)

const localeModel = computed({
  get: () => settings.value.locale,
  set: (locale: Locales) => {
    void applyLocale(locale)
  },
})

const audioFilesUsedSpaceLabel = computed(
  () => `${t('Used')}: ${usedSpace.value.usedSpace} ${t('OutOf')} ${usedSpace.value.allSpace} ${t('KbUnit')}.`,
)

const audioFilesUsedSpacePercent = computed(() => {
  const { usedSpace: used, allSpace } = usedSpace.value
  if (!allSpace) return 0

  return Math.min(100, Math.round((used / allSpace) * 100))
})

const trainingModeItems = computed(() => [
  { value: 'first-launch', label: t('TrainingShowOnFirstLaunch') },
  { value: 'always', label: t('TrainingShowAlways') },
  { value: 'never', label: t('TrainingShowNever') },
])

const localeItems = computed(() =>
  getLocales().map(({ key, value }) => ({ value: key, label: value })),
)

const ringtoneSelectItems = computed(() => {
  const items = [{ value: '', label: `- ${t('ByDefault')} -` }]
  Array.from(ringtonesList.value.values()).forEach((item) => {
    items.push({ value: item.guid, label: item.name })
  })
  return items
})
</script>

<style scoped>
/*
 * wui-input-switch — inline-flex; hidden checkbox без containing block даёт focus-scroll по всему документу.
 */
.main-settings-switch :deep(.wui-input-switch) {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
}

.main-settings-switch :deep(.wui-input-switch > input[type='checkbox']) {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border-width: 0;
}

/*
 * Figma body/r-18-26 для cmbBoxBig48; wui-select size-48 — 16/22, placeholder — 13/18.
 * TODO(WUI-5527): убрать после фикса typography size-48 в common-library.
 */
.main-settings-select :deep(.wui-select__field) {
  font-size: 18px;
  line-height: 26px;
}

/*
 * WuiInputRange кидает class на <input>, не на корень — wrapper как в footer/call-card.
 * TODO(WUI-5527): убрать после фикса inheritAttrs у WuiInputRange в common-library.
 */
.main-settings-volume-range :deep(.wui-input-range) {
  width: 100%;
}
</style>
