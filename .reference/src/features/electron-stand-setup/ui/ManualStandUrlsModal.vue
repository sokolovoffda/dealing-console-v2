<template>
  <app-modal
    :title="$t('StandManualUrlsTitle')"
    :cancel-text="$t('Cancel')"
    :confirm-text="$t('StandManualConfirm')"
    :confirm-disabled="!canSubmit"
    :loading="isSubmitting"
    :auto-close-on-confirm="false"
    @confirm="handleConfirm"
  >
    <p v-if="showUnavailableHint" class="text-1624 text-white/70">
      {{ $t('StandServicesUnavailableHint') }}
    </p>

    <div class="flex flex-col gap-4">
      <div>
        <p class="mb-1 text-1316 text-white/60">{{ $t('StandRtuAddress') }}</p>
        <wui-input
          v-model="rtuBaseUrl"
          :placeholder="$t('StandRtuAddressPlaceholder')"
          with-clear
          :with-label="false"
          :size="48"
          :disabled="isSubmitting"
          data-test="manual-stand-rtu-url"
        />
      </div>

      <div>
        <p class="mb-1 text-1316 text-white/60">{{ $t('StandApsAddress') }}</p>
        <wui-input
          v-model="apsBaseUrl"
          :placeholder="$t('StandApsAddressPlaceholder')"
          with-clear
          :with-label="false"
          :size="48"
          :disabled="isSubmitting"
          data-test="manual-stand-aps-url"
        />
      </div>

      <p v-if="errorKey" class="text-1316 text-red-tints-800">
        {{ $t(errorKey) }}
      </p>
    </div>
  </app-modal>
</template>

<script lang="ts" setup>
import { closeDialogKey, WuiInput } from '@wui/common-library'
import { computed, ref } from 'vue'

import type { StandPingResult } from '@/shared/stand-config'
import { AppModal } from '@/shared/ui'
import { safeInject } from '@/shared/utils/safeInject'

import { mapStandPingFailureToKey } from '../model/map-stand-ping-failure'
import { pingStand } from '../model/ping-stand'

type ManualStandUrlsModalProps = {
  initialRtuBaseUrl?: string | null
  initialApsBaseUrl?: string | null
  showUnavailableHint?: boolean
}

const props = withDefaults(defineProps<ManualStandUrlsModalProps>(), {
  initialRtuBaseUrl: null,
  initialApsBaseUrl: null,
  showUnavailableHint: false,
})

const closeDialog = safeInject<(value?: StandPingResult) => void>(closeDialogKey)

const rtuBaseUrl = ref(props.initialRtuBaseUrl ?? '')
const apsBaseUrl = ref(props.initialApsBaseUrl ?? '')
const isSubmitting = ref(false)
const errorKey = ref<string | null>(null)

const canSubmit = computed(() => {
  return Boolean(rtuBaseUrl.value.trim() && apsBaseUrl.value.trim()) && !isSubmitting.value
})

const handleConfirm = async (): Promise<void> => {
  if (!canSubmit.value) {
    return
  }

  isSubmitting.value = true
  errorKey.value = null

  try {
    const result = await pingStand({
      rtuBaseUrl: rtuBaseUrl.value.trim(),
      apsBaseUrl: apsBaseUrl.value.trim(),
    })

    if (!result.ok) {
      errorKey.value = mapStandPingFailureToKey(result)
      return
    }

    closeDialog(result)
  } catch (error) {
    console.error('[electron-stand-setup] manual urls ping failed', error)
    errorKey.value = 'StandPingFailed'
  } finally {
    isSubmitting.value = false
  }
}
</script>
