<template>
  <div class="mb-4 w-120 text-white text-2440">
    <div v-if="showAddressField" class="flex flex-col gap-y-2">
      <div
        class="relative top-0 left-0 rounded-8"
        :class="{ 'border border-red-tints-900': Boolean(errorKey) }"
      >
        <input
          v-model="hostInput"
          type="text"
          :placeholder="$t('StandAddress')"
          :disabled="isChecking || isInitializing"
          autocomplete="off"
          class="login-input w-full bg-black-865 rounded-8 text-2440 py-4 pl-4 focus:outline-none disabled:opacity-50"
          name="stand-address"
          @keydown.enter.prevent="onCheckConnection"
        >
      </div>

      <wui-btn
        type="button"
        :size="48"
        state="tonal"
        variant="neut"
        class="w-full"
        :disabled="isChecking || isInitializing || isManualModalOpen"
        @click="onCheckConnection"
      >
        <wui-icon
          v-if="isChecking"
          name="animatedLoaderWheel"
          class="mr-2 text-white"
        />
        <span>{{ $t('StandCheckConnection') }}</span>
      </wui-btn>

      <p v-if="isChecking || isInitializing" class="text-1316 text-white/60 px-4">
        {{ $t('StandChecking') }}
      </p>
      <p v-else-if="errorKey" class="text-1316 text-red-tints-800 px-4">
        {{ $t(errorKey) }}
      </p>

      <button
        type="button"
        class="px-4 text-left text-1316 text-white/60 underline underline-offset-2 hover:text-white disabled:opacity-50"
        :disabled="isChecking || isInitializing || isManualModalOpen"
        @click="onOpenManualUrls"
      >
        {{ $t('StandManualUrlsLink') }}
      </button>
    </div>

    <div v-else class="flex items-center justify-between gap-x-4">
      <p class="text-1624 text-green-300">
        {{ $t('StandConnected') }}
      </p>
      <wui-btn
        type="button"
        :size="48"
        state="tonal"
        variant="neut"
        @click="onChangeAddress"
      >
        {{ $t('ChangeStandAddress') }}
      </wui-btn>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useDialog, WuiBtn, WuiIcon } from '@wui/common-library'
import { ref, watch, type ComponentOptions } from 'vue'

import { getStandConfigSnapshot, type StandPingResult } from '@/shared/stand-config'

import { useElectronStandSetup } from '../model/use-electron-stand-setup'

import ManualStandUrlsModal from './ManualStandUrlsModal.vue'

const emit = defineEmits<{
  'connection-change': [connected: boolean]
}>()

const {
  hostInput,
  isConnected,
  isChecking,
  isInitializing,
  errorKey,
  showAddressField,
  credentialsEnabled,
  manualModalRequest,
  checkByHost,
  onChangeAddress,
  clearManualModalRequest,
  applyManualPingResult,
} = useElectronStandSetup()

const { showDialog } = useDialog<StandPingResult | undefined>()
const isManualModalOpen = ref(false)

const openManualUrlsModal = async (showUnavailableHint = false): Promise<void> => {
  if (isManualModalOpen.value || isChecking.value) {
    return
  }

  const config = getStandConfigSnapshot()
  isManualModalOpen.value = true
  clearManualModalRequest()

  try {
    const result = await showDialog(ManualStandUrlsModal as ComponentOptions, {
      initialRtuBaseUrl: config?.rtuBaseUrl ?? '',
      initialApsBaseUrl: config?.apsBaseUrl ?? '',
      showUnavailableHint,
    })

    if (!result?.ok) {
      return
    }

    await applyManualPingResult(result)
  } finally {
    isManualModalOpen.value = false
  }
}

const onCheckConnection = (): void => {
  void checkByHost()
}

const onOpenManualUrls = (): void => {
  void openManualUrlsModal(false)
}

watch(manualModalRequest, (request) => {
  if (!request || isManualModalOpen.value) {
    return
  }

  void openManualUrlsModal(request.showUnavailableHint)
})

watch(
  [isConnected, credentialsEnabled],
  () => {
    emit('connection-change', credentialsEnabled.value)
  },
  { immediate: true },
)
</script>
