import { computed, onMounted, ref } from 'vue'

import {
  getStandConfigSnapshot,
  loadStandConfigFromElectron,
  persistStandConfig,
  type StandConfig,
  type StandPingResult,
} from '@/shared/stand-config'
import { isElectron } from '@/shared/utils/electron-helpers'

import { mapStandPingFailureToKey } from './map-stand-ping-failure'
import { pingStand } from './ping-stand'

export type ManualModalRequest = {
  showUnavailableHint: boolean
}

export const useElectronStandSetup = () => {
  const hostInput = ref('')
  const isConnected = ref(false)
  const isChecking = ref(false)
  const isInitializing = ref(true)
  const errorKey = ref<string | null>(null)
  const manualModalRequest = ref<ManualModalRequest | null>(null)

  const showAddressField = computed(() => !isConnected.value)
  const credentialsEnabled = computed(() => isConnected.value && !isChecking.value)

  const applySuccess = async (result: StandPingResult, fallbackHost: string | null = null) => {
    const config: StandConfig = {
      host: result.host ?? fallbackHost ?? (hostInput.value.trim() || null),
      rtuBaseUrl: result.rtuBaseUrl,
      apsBaseUrl: result.apsBaseUrl,
      mode: result.mode,
    }

    await persistStandConfig(config)

    if (config.host) {
      hostInput.value = config.host
    }

    isConnected.value = true
    errorKey.value = null
    manualModalRequest.value = null
  }

  const applyManualPingResult = async (result: StandPingResult): Promise<void> => {
    if (!result.ok) {
      return
    }

    await applySuccess(result, hostInput.value.trim() || null)
  }

  const requestManualUrlsModal = (showUnavailableHint = false): void => {
    manualModalRequest.value = { showUnavailableHint }
  }

  const clearManualModalRequest = (): void => {
    manualModalRequest.value = null
  }

  const checkByHost = async (): Promise<void> => {
    const value = hostInput.value.trim()
    if (!value) {
      errorKey.value = 'StandAddressRequired'
      return
    }

    if (isChecking.value) {
      return
    }

    isChecking.value = true
    errorKey.value = null

    try {
      const result = await pingStand({ host: value })
      if (result.ok) {
        await applySuccess(result, value)
        return
      }

      isConnected.value = false
      errorKey.value = mapStandPingFailureToKey(result)
      requestManualUrlsModal(true)
    } catch (error) {
      console.error('[electron-stand-setup] ping by host failed', error)
      isConnected.value = false
      errorKey.value = 'StandPingFailed'
    } finally {
      isChecking.value = false
    }
  }

  const restoreFromSaved = async (): Promise<void> => {
    const config = getStandConfigSnapshot() ?? await loadStandConfigFromElectron()
    if (!config) {
      return
    }

    if (config.host) {
      hostInput.value = config.host
    }

    const canPingManual = Boolean(config.rtuBaseUrl && config.apsBaseUrl)
    const canPingHost = Boolean(config.host)
    if (!canPingManual && !canPingHost) {
      return
    }

    isChecking.value = true
    errorKey.value = null

    try {
      const result = canPingManual
        ? await pingStand({
          rtuBaseUrl: config.rtuBaseUrl,
          apsBaseUrl: config.apsBaseUrl,
        })
        : await pingStand({ host: config.host })

      if (result.ok) {
        await applySuccess(result, config.host)
        return
      }

      isConnected.value = false
      errorKey.value = mapStandPingFailureToKey(result)

      if (!canPingManual) {
        requestManualUrlsModal(true)
      }
    } catch (error) {
      console.error('[electron-stand-setup] restore ping failed', error)
      isConnected.value = false
      errorKey.value = 'StandPingFailed'
    } finally {
      isChecking.value = false
    }
  }

  const onChangeAddress = (): void => {
    if (!isConnected.value) {
      return
    }

    // Админ-гейт (шаг 6) пока не включаем — разрешаем сменить адрес сразу.
    isConnected.value = false
    errorKey.value = null
  }

  onMounted(async () => {
    if (!isElectron()) {
      isInitializing.value = false
      return
    }

    try {
      await restoreFromSaved()
    } finally {
      isInitializing.value = false
    }
  })

  return {
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
    requestManualUrlsModal,
    clearManualModalRequest,
    applyManualPingResult,
  }
}
