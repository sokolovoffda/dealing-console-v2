/// <reference types="vite/client" />

import type { StandConfig, StandPingRequest, StandPingResult } from '@/shared/stand-config'

export {}

declare global {
  interface ImportMetaEnv {
    readonly VITE_ADDITIONAL_API_URL?: string
    readonly VITE_API_DEV_SERVER?: string
    readonly VITE_ELECTRON?: string
    readonly VITE_MOCK_CONTROLLER_MODULES?: string
    readonly VITE_SERVER_ELECTRON?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface ElectronAPI {
    onNetworkError: (callback: (event: unknown, error: unknown) => void) => void
    removeAllNetworkErrorListeners: () => void
    onCertificateError: (callback: (event: unknown, error: unknown) => void) => void
    relaunch: () => Promise<void>
    getDiagnosticsSnapshot: (request: unknown) => Promise<unknown>
    getStandConfig: () => Promise<StandConfig | null>
    setStandConfig: (config: StandConfig) => Promise<StandConfig>
    pingStandConfig: (request: StandPingRequest) => Promise<StandPingResult>
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const vue: DefineComponent<object, object, never>
  export default vue
}
