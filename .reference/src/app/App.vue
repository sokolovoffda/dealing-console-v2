<template>
  <router-view
    @click="() => {
      playTone()
    }"
  />
  <wui-chain-tooltip-wrapper
    :scenario="scenario"
    @viewed="finishScenario"
    @skip="skipScenarios"
    @close="stopScenario"
  />
  <wui-dialog-wrapper />
  <notification-wrapper />
</template>

<script lang="ts" setup>
import { WuiChainTooltipWrapper, WuiDialogWrapper } from '@wui/common-library'
import { useIM } from '@wui/im'
import axios from 'axios'
import { storeToRefs } from 'pinia'

import { version } from '@/../package.json'
import { router } from '@/app'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import {
  collectWebRtcStatsRecords,
  diagnosticCategories,
  diagnosticLogLevels,
  initializeRendererDiagnostics,
  registerRendererDiagnosticDynamicRecordsProvider,
  registerRendererDiagnosticMetadataProvider,
  startDiagnosticsAdminCollect,
  trackRendererDiagnosticEvent,
} from '@/features/diagnostics'

import { useBindingControllerButtonsStore } from '@/entities/binding-contacts'
import { useCallHistoryStore } from '@/entities/call-history'
import { usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import {
  useContactCachedStore,
  useContactStatusState,
  useContactStore,
} from '@/entities/contact'
import { useFastDialStore } from '@/entities/fast-dial'
import { useGroupContactsStore } from '@/entities/group-contacts'
import {
  useCustomizeStore,
  useMainSettingsStore,
  useRingtonesStore,
} from '@/entities/main-settings'
import {
  useGooseSettingsStore,
  useMediaDeviceOverridesStore,
} from '@/entities/media-devices-settings'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'
import { usePreferencesStore } from '@/entities/preference'
import { useContactTabs } from '@/entities/settings'
import { useTooltip } from '@/entities/tooltips'
import { useWorkspaceStore } from '@/entities/workspace'



import { useAuth } from '@/shared/auth'
import {
  useAppStore,
  useDevicesSessionsStore,
  useDevicesStore,
  useStatusSubscribe,
} from '@/shared/composables'
import {
  applyMockControllerModules,
  syncAllGooseMicrophoneHardware,
  useController,
} from '@/shared/controller'
import { useWebRTC } from '@/shared/jssip'
import { NotificationWrapper, useNotification } from '@/shared/notifications'
import { emitter, EmitterEvents } from '@/shared/services/emitter'
import { useTurretAdminWs } from '@/shared/turret-admin-ws'

const TURRET_ADMIN_CONNECT_PARAMS = {
  clientVersion: version,
} as const

const { init: initController, playTone } = useController()
const {
  clearSessionUpgradeToken,
  close: closeTurretAdminWs,
  connect: connectTurretAdminWs,
  sendControllerOfflineStage,
  sendSessionUpgrade,
} = useTurretAdminWs()
const { scenario, finishScenario, skipScenarios, stopScenario } = useTooltip()
const appStore = useAppStore()
const devicesStore = useDevicesStore()
const { sessions } = useSessionStore()
const { unregisterSIP } = useWebRTC()
const { clearAllSubscribers, stopSubscribeHandler } = useStatusSubscribe()
const { showNotification } = useNotification()
const shouldMockControllerModules = import.meta.env.DEV && import.meta.env.VITE_MOCK_CONTROLLER_MODULES === 'true'
const { currentUser, hostname } = storeToRefs(appStore)

const updateAxiosToken = (token: string | null) => {
  axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : ''
}

const connectAndUpgradeTurretAdminWs = () => {
  connectTurretAdminWs(TURRET_ADMIN_CONNECT_PARAMS)
  const token = useAuth.getAccessToken()
  if (token) {
    sendSessionUpgrade(token)
  }
}

initializeRendererDiagnostics()
startDiagnosticsAdminCollect()
registerRendererDiagnosticMetadataProvider(() => ({
  appVersion: version,
  route: router.currentRoute.value.fullPath,
  hostname: hostname.value || window.location.hostname,
  userLogin: currentUser.value?.imLogin ?? currentUser.value?.name,
  userNumber: currentUser.value?.internalNumber,
  networkState: navigator.onLine ? 'online' : 'offline',
}))
registerRendererDiagnosticDynamicRecordsProvider(diagnosticCategories.WEB_RTC, async () => {
  return collectWebRtcStatsRecords(Array.from(sessions.value.values()).map((session) => ({
    sessionId: session.sessionId,
    callId: session.callId.value,
    pServed: session.pServed,
    connection: session.session.connection ?? null,
  })))
})

if (!shouldMockControllerModules) {
  initController()
}
void devicesStore.init()
connectTurretAdminWs(TURRET_ADMIN_CONNECT_PARAMS)
trackRendererDiagnosticEvent({
  category: diagnosticCategories.SYSTEM,
  level: diagnosticLogLevels.INFO,
  source: 'app',
  message: 'Application bootstrap completed in renderer',
  tags: ['app-bootstrap'],
})

if (shouldMockControllerModules) {
  void applyMockControllerModules()
}

emitter.on(EmitterEvents.CONTROLLER_CONNECTED, () => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.WEBSOCKET,
    level: diagnosticLogLevels.INFO,
    source: 'controller-emitter',
    message: 'Controller connected event received',
    tags: ['controller-connected'],
  })
  syncAllGooseMicrophoneHardware()
})
emitter.on(EmitterEvents.CONTROLLER_UNAVAILABLE, () => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.WEBSOCKET,
    level: diagnosticLogLevels.WARN,
    source: 'controller-emitter',
    message: 'Controller unavailable — using mock modules',
    tags: ['controller-unavailable'],
  })
  void applyMockControllerModules().then((applied) => {
    if (!applied) return
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.SYSTEM,
      level: diagnosticLogLevels.INFO,
      source: 'app',
      message: 'Mock controller modules applied (hardware controller unavailable)',
      tags: ['controller-mock'],
    })
  })
})
emitter.on(EmitterEvents.CONTROLLER_DISCONNECTED, () => {

  trackRendererDiagnosticEvent({
    category: diagnosticCategories.WEBSOCKET,
    level: diagnosticLogLevels.WARN,
    source: 'controller-emitter',
    message: 'Controller disconnected event received',
    tags: ['controller-disconnected'],
  })
  sendControllerOfflineStage()
  if (import.meta.env.MODE === 'production' && useAuth.isAuthenticated()) {
    void useAuth.logout()
  }
})

// === Обработка события login ===
useAuth.on('login', async (user) => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.SYSTEM,
    level: diagnosticLogLevels.INFO,
    source: 'auth',
    message: 'User login event received',
    payload: {
      name: user.name,
      internalNumber: user.internalNumber,
      imLogin: user.imLogin ?? null,
    },
    tags: ['auth-login'],
  })
  updateAxiosToken(useAuth.getAccessToken())
  appStore.setCurrentUser(user)
  connectAndUpgradeTurretAdminWs()
  await router.push({ name: 'Main' })
})
useAuth.on('restore', async (user) => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.SYSTEM,
    level: diagnosticLogLevels.INFO,
    source: 'auth',
    message: 'User session restored',
    payload: {
      name: user.name,
      internalNumber: user.internalNumber,
      imLogin: user.imLogin ?? null,
    },
    tags: ['auth-restore'],
  })
  updateAxiosToken(useAuth.getAccessToken())
  appStore.setCurrentUser(user)
  connectAndUpgradeTurretAdminWs()
})
// === Обработка события logout ===
useAuth.on('logout', async () => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.SYSTEM,
    level: diagnosticLogLevels.INFO,
    source: 'auth',
    message: 'User logout event received',
    tags: ['auth-logout'],
  })
  try {
    try {
      await useMainSettingsStore().flushPendingSave()
    } catch (e) {
      console.error(e)
    }

    try {
      await useGooseSettingsStore().flushPendingSave()
    } catch (e) {
      console.error(e)
    }

    try {
      const overridesStore = useMediaDeviceOverridesStore()
      await overridesStore.flushPendingMainVolumePersist()
      await overridesStore.flushPendingSave()
    } catch (e) {
      console.error(e)
    }

    sessions.value.forEach(session => session.terminate())
    unregisterSIP()
    stopSubscribeHandler()
    clearAllSubscribers()
    useIM().close().catch()
    clearSessionUpgradeToken()
    appStore.clearCurrentUser()
    updateAxiosToken(null)

    useCallManagerState().setCallManagerState(CallManagerState.INITIAL)
    useDevicesSessionsStore().clearAllSessionBindings()

    usePinnedCallsStore().$reset()
    usePinnedCallsPanelStore().reset()
    useFastDialStore().reset()
    useGroupContactsStore().$reset()
    useContactTabs().$reset()
    useContactStore().$reset()
    useContactCachedStore().$reset()
    useContactStatusState().$reset()
    useCallHistoryStore().$reset()
    useWorkspaceStore().$reset()
    useBindingControllerButtonsStore().$reset()
    useCustomizeStore().$reset()
    useRingtonesStore().$reset()
    useMainSettingsStore().resetStore()
    useGooseSettingsStore().resetStore()
    useMediaDeviceOverridesStore().resetStore()
    usePreferencesStore().$reset()
  } catch (e) {
    console.error('Logout cleanup failed:', e)
  } finally {
    await router.push({ name: 'Login' })
  }
})
// === Обработка события обновления токена ===
useAuth.on('token_refreshed', (token) => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.SYSTEM,
    level: diagnosticLogLevels.INFO,
    source: 'auth',
    message: 'Access token refreshed',
    payload: {
      tokenLength: token.length,
    },
    tags: ['auth-token-refreshed'],
  })
  updateAxiosToken(token)
  sendSessionUpgrade(token)
})
// === Обработка различных ошибок ===
useAuth.on('error', (error) => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.SYSTEM,
    level: diagnosticLogLevels.ERROR,
    source: 'auth',
    message: 'Auth error event received',
    payload: error,
    tags: ['auth-error'],
  })
  showNotification({
    message: error.message,
    type: 'error',
  })
  console.error('Auth error:', error)
})
// Обязательно после подписок на события !!!
useAuth.init()
// === При закрытии вкладки сессии автоматом не закрываются ===
window.onbeforeunload = () => {
  trackRendererDiagnosticEvent({
    category: diagnosticCategories.SYSTEM,
    level: diagnosticLogLevels.WARN,
    source: 'window',
    message: 'Window beforeunload handler triggered',
    tags: ['beforeunload'],
  })
  sessions.value.forEach(session => session.terminate())
  devicesStore.dispose()
  useIM().close()
  unregisterSIP()
  closeTurretAdminWs()
}
</script>
