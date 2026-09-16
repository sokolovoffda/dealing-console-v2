<template>
  <div class="flex w-full flex-col gap-6">
    <div
      v-if="!isMainDevice"
      class="media-device-switch w-full"
    >
      <wui-input-switch
        v-model="isEnabled"
        :label="t('DeviceConnected')"
        :size="26"
        data-test="media-device-enabled"
      />
    </div>

    <div class="flex flex-col gap-6">
      <!-- тип | статус -->
      <div class="flex flex-wrap gap-6">
        <div
          class="flex w-95 flex-col gap-2"
          data-test="media-device-field-type"
        >
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ t('DeviceType') }}
            </p>
          </div>
          <wui-input
            :model-value="deviceTypeLabel"
            readonly
            :size="48"
            class="app-input media-device-readonly-input w-full"
            data-test="media-device-value-type"
          />
        </div>
        <div
          class="flex w-95 flex-col gap-2"
          data-test="media-device-field-status"
        >
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ t('Status') }}
            </p>
          </div>
          <wui-input
            :model-value="statusLabel"
            readonly
            :size="48"
            class="app-input media-device-readonly-input w-full"
            :class="statusInputClass"
            data-test="media-device-value-status"
          />
        </div>
      </div>

      <!-- название | модуль -->
      <div class="flex flex-wrap gap-6">
        <div
          class="flex w-95 flex-col gap-2"
          data-test="media-device-field-name"
        >
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ t('DeviceName') }}
            </p>
          </div>
          <wui-input
            :model-value="device.name"
            readonly
            :size="48"
            class="app-input media-device-readonly-input w-full"
            data-test="media-device-value-name"
          />
        </div>
        <div
          class="flex w-95 flex-col gap-2"
          data-test="media-device-field-module"
        >
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ t('Module') }}
            </p>
          </div>
          <wui-input
            :model-value="device.module || '—'"
            readonly
            :size="48"
            class="app-input media-device-readonly-input w-full"
            data-test="media-device-value-module"
          />
        </div>
      </div>

      <!-- вход | VAD -->
      <div
        v-if="device.hasInput"
        class="flex flex-wrap items-end gap-6"
        data-test="media-device-field-audio-input"
      >
        <div class="flex w-95 flex-col gap-2">
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ t('AudioInput') }}
            </p>
          </div>
          <wui-select
            v-if="canEditAudioEndpoints"
            :model-value="device.inputId ?? ''"
            :items="inputSelectItems"
            class="app-select media-device-select w-full"
            :size="48"
            data-test="media-device-value-audio-input"
            @update:model-value="onInputSelect"
          />
          <wui-input
            v-else
            :model-value="device.inputLabel || t('NoDevices')"
            readonly
            :size="48"
            class="app-input media-device-readonly-input w-full"
            data-test="media-device-value-audio-input"
          />
        </div>

        <media-device-vad-indicator :input-id="device.inputId" />
      </div>

      <!-- выход | регулировка -->
      <div
        v-if="device.hasOutput"
        class="flex flex-wrap items-end gap-6"
        data-test="media-device-field-audio-output"
      >
        <div class="flex w-95 flex-col gap-2">
          <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
            <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
              {{ t('AudioOutput') }}
            </p>
          </div>
          <wui-select
            v-if="canEditAudioEndpoints"
            :model-value="device.outputId ?? ''"
            :items="outputSelectItems"
            class="app-select media-device-select w-full"
            :size="48"
            data-test="media-device-value-audio-output"
            @update:model-value="onOutputSelect"
          />
          <wui-input
            v-else
            :model-value="device.outputLabel || t('NoDevices')"
            readonly
            :size="48"
            class="app-input media-device-readonly-input w-full"
            data-test="media-device-value-audio-output"
          />
        </div>

        <div
          class="flex w-95 shrink-0 items-center gap-2.5"
          data-test="media-device-output-controls"
        >
          <div class="media-device-volume-range min-w-0 flex-1">
            <wui-input-range
              v-model="volumePercent"
              orientation="horizontal"
              :min="0"
              :max="100"
              :step="1"
              :size="48"
              data-test="media-device-volume"
            />
          </div>
          <!-- TODO: percent label — temporary until WuiInputRange supports value suffix in common-library -->
          <p
            class="w-12 shrink-0 text-lg leading-6 tabular-nums text-wrkspc-main-cblock-txt-def"
            data-test="media-device-volume-percent"
          >
            {{ volumePercent }}%
          </p>
          <wui-btn
            icon
            variant="brand"
            state="tonal"
            :prepend-icon="isTestingOutput ? 'pauseM' : 'playF'"
            :size="48"
            :disabled="!device.outputId"
            data-test="media-device-play"
            @click="toggleTestOutput"
          />
        </div>
      </div>
    </div>

    <!-- AEC / noise / AGC — только при audio input (не для speakers/Main) -->
    <div
      v-if="device.hasInput"
      class="flex w-full flex-col gap-6"
      data-test="media-device-audio-processing"
    >
      <div class="media-device-switch w-full">
        <wui-input-switch
          v-model="echoCancellation"
          :label="t('EchoCancellation')"
          :size="26"
          data-test="media-device-echo-cancellation"
        />
      </div>
      <div class="media-device-switch w-full">
        <wui-input-switch
          v-model="noiseSuppression"
          :label="t('NoiseSuppression')"
          :size="26"
          data-test="media-device-noise-suppression"
        />
      </div>
      <div class="media-device-switch w-full">
        <wui-input-switch
          v-model="autoGainControl"
          :label="t('AutoGainControl')"
          :size="26"
          data-test="media-device-auto-gain-control"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WuiBtn, WuiInput, WuiInputRange, WuiInputSwitch, WuiSelect } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  LogicalMediaDeviceTypeEnum,
  type LogicalMediaDevice,
  type LogicalMediaDeviceStatus,
  type LogicalMediaDeviceType,
  useDevicesStore,
} from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'

import {
  setMediaDeviceOutputTestVolume,
  startMediaDeviceOutputTest,
  stopMediaDeviceOutputTest,
} from '../lib/media-device-output-test'
import { useMediaDeviceOverridesStore } from '../model/use-media-device-overrides-store'

import MediaDeviceVadIndicator from './MediaDeviceVadIndicator.vue'

const MAX_VOLUME_PERCENT = 100

const props = defineProps<{
  device: LogicalMediaDevice
}>()

const { t } = useLocalization()
const devicesStore = useDevicesStore()
const overridesStore = useMediaDeviceOverridesStore()
const pinnedCallsPanelStore = usePinnedCallsPanelStore()
const { globalVolumeMultiplier } = storeToRefs(pinnedCallsPanelStore)

const isMainDevice = computed(() => props.device.type === LogicalMediaDeviceTypeEnum.MAIN)
const logicalKey = computed(() => props.device.id)

const resolvedOverride = computed(() => overridesStore.getResolvedOverride(logicalKey.value))

const isEnabled = computed({
  get: () => resolvedOverride.value.enabled,
  set: (value: boolean) => {
    overridesStore.patchDevice(logicalKey.value, { enabled: value })
  },
})

/** Main ↔ footer runtime; other devices — overrides working copy. */
const volumePercent = computed({
  get: () => {
    if (isMainDevice.value) {
      return Math.round(globalVolumeMultiplier.value * MAX_VOLUME_PERCENT)
    }

    return resolvedOverride.value.volume
  },
  set: (value: number) => {
    if (isMainDevice.value) {
      pinnedCallsPanelStore.changeGlobalVolumeMultiplier(value / MAX_VOLUME_PERCENT)
      overridesStore.patchDevice(logicalKey.value, { volume: value })
      return
    }

    overridesStore.patchDevice(logicalKey.value, { volume: value })
  },
})

const echoCancellation = computed({
  get: () => resolvedOverride.value.echoCancellation,
  set: (value: boolean) => {
    overridesStore.patchDevice(logicalKey.value, { echoCancellation: value })
  },
})

const noiseSuppression = computed({
  get: () => resolvedOverride.value.noiseSuppression,
  set: (value: boolean) => {
    overridesStore.patchDevice(logicalKey.value, { noiseSuppression: value })
  },
})

const autoGainControl = computed({
  get: () => resolvedOverride.value.autoGainControl,
  set: (value: boolean) => {
    overridesStore.patchDevice(logicalKey.value, { autoGainControl: value })
  },
})

const isTestingOutput = ref(false)

/** Mock / no real controller: user picks browser audio endpoints. */
const canEditAudioEndpoints = computed(() =>
  Boolean(devicesStore.isMockControllerModules)
  && props.device.origin === 'controller',
)

const inputSelectItems = computed(() =>
  devicesStore.audioInputs.map(device => ({
    value: device.deviceId,
    label: device.label || device.deviceId,
  })),
)

const outputSelectItems = computed(() =>
  devicesStore.audioOutputs.map(device => ({
    value: device.deviceId,
    label: device.label || device.deviceId,
  })),
)

const onInputSelect = (value: string | number) => {
  devicesStore.setDeviceAudioEndpoint(props.device.id, 'input', String(value))
}

const onOutputSelect = (value: string | number) => {
  devicesStore.setDeviceAudioEndpoint(props.device.id, 'output', String(value))
}

const deviceTypeLabels = computed<Record<LogicalMediaDeviceType, string>>(() => ({
  [LogicalMediaDeviceTypeEnum.GOOSE]: t('GooseNeck'),
  [LogicalMediaDeviceTypeEnum.HANDSET]: t('Telephone'),
  [LogicalMediaDeviceTypeEnum.HEADSET]: t('Headset'),
  [LogicalMediaDeviceTypeEnum.MAIN]: t('MainSpeaker'),
  [LogicalMediaDeviceTypeEnum.INPUT]: t('AudioInput'),
  [LogicalMediaDeviceTypeEnum.OUTPUT]: t('AudioOutput'),
  [LogicalMediaDeviceTypeEnum.OTHER]: t('Other'),
}))

const deviceTypeLabel = computed(() =>
  deviceTypeLabels.value[props.device.type] ?? props.device.type,
)

const statusLabels = computed<Record<LogicalMediaDeviceStatus, string>>(() => ({
  ready: t('MediaDeviceStatusReady'),
  partial: t('MediaDeviceStatusPartial'),
  missing: t('MediaDeviceStatusMissing'),
}))

const statusLabel = computed(() =>
  statusLabels.value[props.device.status] ?? props.device.status,
)

const statusInputClass = computed(() => {
  if (props.device.status === 'missing') return 'media-device-readonly-input--status-missing'
  if (props.device.status === 'partial') return 'media-device-readonly-input--status-partial'
  return undefined
})

const applyOutputVolume = () => {
  if (isTestingOutput.value) setMediaDeviceOutputTestVolume(volumePercent.value / 100)
}

const stopTestOutput = () => {
  if (!isTestingOutput.value) {
    stopMediaDeviceOutputTest()
    return
  }

  isTestingOutput.value = false
  stopMediaDeviceOutputTest()
}

const startTestOutput = async () => {
  const outputId = props.device.outputId
  if (!outputId) return

  try {
    await startMediaDeviceOutputTest({
      outputId,
      volume: volumePercent.value / 100,
      onStop: () => {
        isTestingOutput.value = false
      },
    })
    isTestingOutput.value = true
  } catch (error) {
    console.error(error)
    isTestingOutput.value = false
  }
}

const toggleTestOutput = () => {
  if (isTestingOutput.value) stopTestOutput()
  else void startTestOutput()
}

watch(volumePercent, applyOutputVolume)

watch(
  () => props.device.outputId,
  (outputId) => {
    if (!isTestingOutput.value) return
    if (!outputId) {
      stopTestOutput()
      return
    }
    void startTestOutput()
  },
)

onBeforeUnmount(() => {
  if (isTestingOutput.value) stopTestOutput()
})
</script>

<style scoped>
/*
 * wui-input-switch — inline-flex; hidden checkbox без containing block даёт focus-scroll.
 * Same pattern as MainSettings.
 */
.media-device-switch :deep(.wui-input-switch) {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
}

.media-device-switch :deep(.wui-input-switch > input[type='checkbox']) {
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
 * Read-only field: looks like cmbBoxBig48 / select, not editable.
 * WUI applies opacity:.6 on [readonly] — reset for Figma (white text).
 * Figma body/r-18-26; wui-input size-48 — 16/22 by default.
 */
.media-device-readonly-input {
  pointer-events: none;
}

.media-device-readonly-input.wui-input--default :deep(.wui-input__field[readonly]) {
  font-size: 18px;
  line-height: 26px;
  cursor: default;
  opacity: 1;
  color: var(--color-wrkspc-main-cblock-txt-def);
}

/* missing — surf/neg/base/def */
.media-device-readonly-input--status-missing.wui-input--default :deep(.wui-input__field[readonly]) {
  color: var(--color-surf-neg-base-def);
}

/* partial — same as incoming-call icon (warncon) */
.media-device-readonly-input--status-partial.wui-input--default :deep(.wui-input__field[readonly]) {
  color: var(--color-pinnedline-btn-warncon-icon-def);
}

/*
 * Figma body/r-18-26 для cmbBoxBig48; wui-select size-48 — 16/22 by default.
 * Same as MainSettings select typography.
 */
.media-device-select :deep(.wui-select__field) {
  font-size: 18px;
  line-height: 26px;
}

/*
 * WuiInputRange кидает class на <input>, не на корень — wrapper как MainSettings.
 */
.media-device-volume-range :deep(.wui-input-range) {
  width: 100%;
}
</style>
