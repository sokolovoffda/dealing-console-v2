import { normalizeBaseUrl } from '@/shared/url-helper/normalizeBaseUrl'
import { getViteServerElectron, isElectron } from '@/shared/utils/electron-helpers'

import type { StandConfig } from './types'

let runtimeStandConfig: StandConfig | null = null

export const getStandConfigSnapshot = (): StandConfig | null => runtimeStandConfig

export const applyStandConfig = (config: StandConfig | null): void => {
  runtimeStandConfig = config
}

export const getRtuBaseUrl = (): string | undefined => {
  const fromRuntime = normalizeBaseUrl(runtimeStandConfig?.rtuBaseUrl ?? undefined)
  if (fromRuntime) {
    return fromRuntime
  }

  if (!isElectron()) {
    return undefined
  }

  return normalizeBaseUrl(getViteServerElectron())
}

export const getApsBaseUrl = (): string | undefined => {
  const fromRuntime = normalizeBaseUrl(runtimeStandConfig?.apsBaseUrl ?? undefined)
  if (fromRuntime) {
    return fromRuntime
  }

  return normalizeBaseUrl(import.meta.env.VITE_ADDITIONAL_API_URL)
}

export const loadStandConfigFromElectron = async (): Promise<StandConfig | null> => {
  if (!isElectron() || typeof window.electronAPI?.getStandConfig !== 'function') {
    return runtimeStandConfig
  }

  try {
    const config = await window.electronAPI.getStandConfig()
    runtimeStandConfig = config
    return config
  } catch (error) {
    console.error('[stand-config] failed to load from Electron', error)
    return runtimeStandConfig
  }
}

export const persistStandConfig = async (config: StandConfig): Promise<StandConfig> => {
  if (typeof window.electronAPI?.setStandConfig !== 'function') {
    throw new Error('Stand config IPC is not available')
  }

  const saved = await window.electronAPI.setStandConfig(config)
  runtimeStandConfig = saved
  return saved
}
