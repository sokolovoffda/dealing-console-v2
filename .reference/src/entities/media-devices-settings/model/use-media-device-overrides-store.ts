import { defineStore } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'

import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  useDevicesStore,
  useDevicesSessionsStore,
} from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'
import { useTurretAdminWs } from '@/shared/turret-admin-ws'

import { useMediaDeviceOverridesApi } from '../api/media-device-overrides-api'
import {
  mediaDeviceOverrideToUserFields,
  mediaDeviceOverridesMapToUserFields,
} from '../lib/apply-override-to-logical-device'
import {
  createDefaultMediaDeviceOverride,
  createEmptyMediaDeviceOverrides,
} from '../lib/media-device-overrides-api-mapper'
import type {
  MediaDeviceOverride,
  MediaDeviceOverridePatch,
  MediaDeviceOverridesPatchBody,
} from '../types'

/** Logical key Main speaker (controller hub). */
export const MAIN_MEDIA_DEVICE_LOGICAL_KEY = 'hub'

const MAX_VOLUME_PERCENT = 100
const MAIN_VOLUME_PERSIST_DEBOUNCE_MS = 400

const cloneOverride = (value: MediaDeviceOverride): MediaDeviceOverride => ({ ...value })

const overridesToMap = (devices: MediaDeviceOverride[]): Record<string, MediaDeviceOverride> => {
  return devices.reduce<Record<string, MediaDeviceOverride>>((acc, device) => {
    acc[device.logicalKey] = cloneOverride(device)
    return acc
  }, {})
}

const isSameOverride = (left: MediaDeviceOverride, right: MediaDeviceOverride): boolean => {
  return (
    left.logicalKey === right.logicalKey
    && left.enabled === right.enabled
    && left.volume === right.volume
    && left.echoCancellation === right.echoCancellation
    && left.noiseSuppression === right.noiseSuppression
    && left.autoGainControl === right.autoGainControl
  )
}

const volumePercentFromMultiplier = (multiplier: number): number => {
  return Math.min(MAX_VOLUME_PERCENT, Math.max(0, Math.round(multiplier * MAX_VOLUME_PERCENT)))
}

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unknown error'
}

const isSessionLockedMediaPatch = (
  logicalKey: string,
  patch: Omit<MediaDeviceOverridePatch, 'logicalKey'>,
): boolean => {
  if (patch.echoCancellation !== undefined) return true
  if (patch.noiseSuppression !== undefined) return true
  if (patch.autoGainControl !== undefined) return true
  // Main volume is live via footer; handset/goose volume still needs idle device.
  if (patch.volume !== undefined && logicalKey !== MAIN_MEDIA_DEVICE_LOGICAL_KEY) return true
  return false
}

const hasBoundSessionsOnLogicalDevice = (logicalKey: string): boolean => {
  const device = useDevicesStore().getDeviceById(logicalKey)
  if (!device) return false

  const sessionsStore = useDevicesSessionsStore()
  const runtimeKey = sessionsStore.getDeviceSessionKey(device)
  const sessionIds = sessionsStore.devicesSession.get(runtimeKey)

  return Boolean(sessionIds?.length)
}

export const useMediaDeviceOverridesStore = defineStore('media-device-overrides', () => {
  const { fetchMediaDeviceOverrides, patchMediaDeviceOverrides } = useMediaDeviceOverridesApi()
  const turretAdminWs = useTurretAdminWs()

  const loading = ref(false)
  const saving = ref(false)
  const hardwareSerial = ref<string | null>(null)
  const syncedByKey = ref<Record<string, MediaDeviceOverride>>({})
  const workingByKey = ref<Record<string, MediaDeviceOverride>>({})

  let suppressMainVolumeWatch = false
  let mainVolumePersistTimer: ReturnType<typeof setTimeout> | null = null
  let mainVolumePersistPromise: Promise<void> | null = null
  let didBindWatches = false

  const localDeviceKeys = computed(() => {
    return new Set(useDevicesStore().devices.map(device => device.id))
  })

  const orphanLogicalKeys = computed(() => {
    return Object.keys(syncedByKey.value).filter(key => !localDeviceKeys.value.has(key))
  })

  const isDirty = computed(() => {
    const keys = new Set([
      ...Object.keys(syncedByKey.value),
      ...Object.keys(workingByKey.value),
    ])

    for (const key of keys) {
      const working = workingByKey.value[key]
      const synced = syncedByKey.value[key]
      if (!working && !synced) continue
      if (!working || !synced) return true
      if (!isSameOverride(working, synced)) return true
    }

    return false
  })

  const notifySessionLockedChange = () => {
    const { showNotification } = useNotification()
    const { t } = useLocalization()

    showNotification({
      type: 'error',
      message: t('MediaDeviceChangeBlockedWhileInCall'),
    })
  }

  const notifyDisableBlockedWhileInCall = () => {
    const { showNotification } = useNotification()
    const { t } = useLocalization()

    showNotification({
      type: 'error',
      message: t('MediaDeviceDisableBlockedWhileInCall'),
    })
  }

  const notifySaveError = (error: unknown) => {
    const { showNotification } = useNotification()
    const { t } = useLocalization()

    showNotification({
      type: 'error',
      message: t('MediaDeviceOverridesSaveFailed', { error: getErrorMessage(error) }),
    })
  }

  const getResolvedOverride = (logicalKey: string): MediaDeviceOverride => {
    return (
      workingByKey.value[logicalKey]
      ?? syncedByKey.value[logicalKey]
      ?? createDefaultMediaDeviceOverride(logicalKey)
    )
  }

  const applyOverrideToLogicalDevice = (logicalKey: string, override: MediaDeviceOverride) => {
    useDevicesStore().setUserMediaOverride(
      logicalKey,
      mediaDeviceOverrideToUserFields(override),
    )
  }

  const applyAllOverridesToLogicalDevices = (byKey: Record<string, MediaDeviceOverride>) => {
    useDevicesStore().replaceUserMediaOverrides(
      mediaDeviceOverridesMapToUserFields(byKey),
    )
  }

  const applyMainVolumeToRuntime = (volumePercent: number) => {
    usePinnedCallsPanelStore().changeGlobalVolumeMultiplier(volumePercent / MAX_VOLUME_PERCENT)
  }

  const applyFromApiDevices = (serial: string, devices: MediaDeviceOverride[]) => {
    hardwareSerial.value = serial
    const nextMap = overridesToMap(devices)
    syncedByKey.value = nextMap
    workingByKey.value = overridesToMap(devices)
    applyAllOverridesToLogicalDevices(workingByKey.value)

    const mainOverride = nextMap[MAIN_MEDIA_DEVICE_LOGICAL_KEY]
    if (mainOverride && localDeviceKeys.value.has(MAIN_MEDIA_DEVICE_LOGICAL_KEY)) {
      suppressMainVolumeWatch = true
      applyMainVolumeToRuntime(mainOverride.volume)
      void nextTick(() => {
        suppressMainVolumeWatch = false
      })
    }
  }

  const patchDevice = (
    logicalKey: string,
    patch: Omit<MediaDeviceOverridePatch, 'logicalKey'>,
  ): boolean => {
    if (patch.enabled === false && hasBoundSessionsOnLogicalDevice(logicalKey)) {
      notifyDisableBlockedWhileInCall()
      return false
    }

    if (isSessionLockedMediaPatch(logicalKey, patch) && hasBoundSessionsOnLogicalDevice(logicalKey)) {
      notifySessionLockedChange()
      return false
    }

    const current = getResolvedOverride(logicalKey)
    const next: MediaDeviceOverride = {
      ...current,
      ...patch,
      logicalKey,
      volume: patch.volume !== undefined
        ? Math.min(MAX_VOLUME_PERCENT, Math.max(0, Math.round(patch.volume)))
        : current.volume,
    }

    workingByKey.value = {
      ...workingByKey.value,
      [logicalKey]: next,
    }

    applyOverrideToLogicalDevice(logicalKey, next)

    if (logicalKey === MAIN_MEDIA_DEVICE_LOGICAL_KEY && patch.volume !== undefined) {
      applyMainVolumeToRuntime(next.volume)
    }

    return true
  }

  /** Sync Main working volume from footer/header runtime. */
  const syncMainVolumeFromRuntime = () => {
    if (!localDeviceKeys.value.has(MAIN_MEDIA_DEVICE_LOGICAL_KEY)) return

    const volume = volumePercentFromMultiplier(
      usePinnedCallsPanelStore().globalVolumeMultiplier,
    )
    const current = getResolvedOverride(MAIN_MEDIA_DEVICE_LOGICAL_KEY)
    if (current.volume === volume) return

    const next: MediaDeviceOverride = {
      ...current,
      volume,
    }

    workingByKey.value = {
      ...workingByKey.value,
      [MAIN_MEDIA_DEVICE_LOGICAL_KEY]: next,
    }
    applyOverrideToLogicalDevice(MAIN_MEDIA_DEVICE_LOGICAL_KEY, next)
  }

  const getDirtyPatchBody = (options?: { excludeMainVolume?: boolean }): MediaDeviceOverridesPatchBody => {
    const excludeMainVolume = Boolean(options?.excludeMainVolume)
    const keys = new Set([
      ...Object.keys(syncedByKey.value),
      ...Object.keys(workingByKey.value),
    ])
    const devices: MediaDeviceOverridePatch[] = []

    for (const key of keys) {
      const working = workingByKey.value[key]
      const synced = syncedByKey.value[key]
      if (!working) continue

      if (synced && isSameOverride(working, synced)) continue

      if (excludeMainVolume && key === MAIN_MEDIA_DEVICE_LOGICAL_KEY) {
        const withoutVolume: MediaDeviceOverridePatch = { logicalKey: key }
        if (!synced || working.enabled !== synced.enabled) withoutVolume.enabled = working.enabled
        if (!synced || working.echoCancellation !== synced.echoCancellation) {
          withoutVolume.echoCancellation = working.echoCancellation
        }
        if (!synced || working.noiseSuppression !== synced.noiseSuppression) {
          withoutVolume.noiseSuppression = working.noiseSuppression
        }
        if (!synced || working.autoGainControl !== synced.autoGainControl) {
          withoutVolume.autoGainControl = working.autoGainControl
        }
        if (Object.keys(withoutVolume).length > 1) devices.push(withoutVolume)
        continue
      }

      if (!synced) {
        devices.push({ ...working })
        continue
      }

      const patch: MediaDeviceOverridePatch = { logicalKey: key }
      if (working.enabled !== synced.enabled) patch.enabled = working.enabled
      if (working.volume !== synced.volume) patch.volume = working.volume
      if (working.echoCancellation !== synced.echoCancellation) {
        patch.echoCancellation = working.echoCancellation
      }
      if (working.noiseSuppression !== synced.noiseSuppression) {
        patch.noiseSuppression = working.noiseSuppression
      }
      if (working.autoGainControl !== synced.autoGainControl) {
        patch.autoGainControl = working.autoGainControl
      }
      if (Object.keys(patch).length > 1) devices.push(patch)
    }

    return { devices }
  }

  const markSyncedFromWorking = () => {
    syncedByKey.value = Object.fromEntries(
      Object.entries(workingByKey.value).map(([key, value]) => [key, cloneOverride(value)]),
    )
  }

  const rollbackToSynced = () => {
    workingByKey.value = Object.fromEntries(
      Object.entries(syncedByKey.value).map(([key, value]) => [key, cloneOverride(value)]),
    )
    applyAllOverridesToLogicalDevices(workingByKey.value)
    const mainOverride = syncedByKey.value[MAIN_MEDIA_DEVICE_LOGICAL_KEY]
    if (mainOverride && localDeviceKeys.value.has(MAIN_MEDIA_DEVICE_LOGICAL_KEY)) {
      suppressMainVolumeWatch = true
      applyMainVolumeToRuntime(mainOverride.volume)
      void nextTick(() => {
        suppressMainVolumeWatch = false
      })
    }
  }

  const persistMainVolumeNow = async () => {
    const serial = hardwareSerial.value
    if (!serial) return
    if (!localDeviceKeys.value.has(MAIN_MEDIA_DEVICE_LOGICAL_KEY)) return

    syncMainVolumeFromRuntime()
    const working = getResolvedOverride(MAIN_MEDIA_DEVICE_LOGICAL_KEY)
    const synced = syncedByKey.value[MAIN_MEDIA_DEVICE_LOGICAL_KEY]
    if (synced && synced.volume === working.volume) return

    try {
      const { data } = await patchMediaDeviceOverrides(serial, {
        devices: [{ logicalKey: MAIN_MEDIA_DEVICE_LOGICAL_KEY, volume: working.volume }],
      })
      applyFromApiDevices(data.hardwareSerial || serial, data.devices)
    } catch (error) {
      console.error('[media-device-overrides] Failed to persist Main volume:', error)
      notifySaveError(error)
      // Runtime volume stays as user set; synced unchanged until successful save.
      throw error
    }
  }

  const scheduleMainVolumePersist = () => {
    if (!hardwareSerial.value) return
    if (!localDeviceKeys.value.has(MAIN_MEDIA_DEVICE_LOGICAL_KEY)) return

    if (mainVolumePersistTimer) clearTimeout(mainVolumePersistTimer)

    mainVolumePersistTimer = setTimeout(() => {
      mainVolumePersistTimer = null
      mainVolumePersistPromise = persistMainVolumeNow()
        .catch(() => undefined)
        .finally(() => {
          mainVolumePersistPromise = null
        })
    }, MAIN_VOLUME_PERSIST_DEBOUNCE_MS)
  }

  const flushPendingMainVolumePersist = async () => {
    if (mainVolumePersistTimer) {
      clearTimeout(mainVolumePersistTimer)
      mainVolumePersistTimer = null
      await persistMainVolumeNow()
      return
    }

    if (mainVolumePersistPromise) {
      await mainVolumePersistPromise
      return
    }

    // Leave / logout: dirty Main volume even without scheduled debounce.
    await persistMainVolumeNow()
  }

  const saveIfDirty = async () => {
    const serial = hardwareSerial.value
    if (!serial || saving.value) return

    syncMainVolumeFromRuntime()
    const body = getDirtyPatchBody({ excludeMainVolume: true })
    if (body.devices.length === 0) return

    saving.value = true

    try {
      const { data } = await patchMediaDeviceOverrides(serial, body)
      applyFromApiDevices(data.hardwareSerial || serial, data.devices)
    } catch (error) {
      rollbackToSynced()
      notifySaveError(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  const loadForSerial = async (serial: string) => {
    if (!serial) return

    loading.value = true

    try {
      const { data } = await fetchMediaDeviceOverrides(serial)
      applyFromApiDevices(data.hardwareSerial || serial, data.devices)
    } catch (error) {
      console.error('[media-device-overrides] Failed to load overrides:', error)
      applyFromApiDevices(serial, createEmptyMediaDeviceOverrides(serial).devices)
    } finally {
      loading.value = false
    }
  }

  const ensureLoaded = async () => {
    const serial = turretAdminWs.hardwareSerial.value
    if (!serial) return
    if (hardwareSerial.value === serial) return
    await loadForSerial(serial)
  }

  const bindWatches = () => {
    if (didBindWatches) return
    didBindWatches = true

    watch(
      () => turretAdminWs.hardwareSerial.value,
      (serial) => {
        if (!serial) return
        if (serial === hardwareSerial.value) return
        void loadForSerial(serial)
      },
    )

    watch(
      () => usePinnedCallsPanelStore().globalVolumeMultiplier,
      () => {
        if (suppressMainVolumeWatch || loading.value) return
        if (!hardwareSerial.value) return
        if (!localDeviceKeys.value.has(MAIN_MEDIA_DEVICE_LOGICAL_KEY)) return

        syncMainVolumeFromRuntime()
        scheduleMainVolumePersist()
      },
    )
  }

  const init = async () => {
    bindWatches()
    await ensureLoaded()
  }

  const resetStore = () => {
    if (mainVolumePersistTimer) {
      clearTimeout(mainVolumePersistTimer)
      mainVolumePersistTimer = null
    }
    mainVolumePersistPromise = null
    loading.value = false
    saving.value = false
    hardwareSerial.value = null
    syncedByKey.value = {}
    workingByKey.value = {}
    useDevicesStore().clearUserMediaOverrides()
  }

  return {
    loading,
    saving,
    hardwareSerial,
    syncedByKey,
    workingByKey,
    orphanLogicalKeys,
    isDirty,
    getResolvedOverride,
    patchDevice,
    syncMainVolumeFromRuntime,
    getDirtyPatchBody,
    markSyncedFromWorking,
    rollbackToSynced,
    scheduleMainVolumePersist,
    flushPendingMainVolumePersist,
    persistMainVolumeNow,
    saveIfDirty,
    flushPendingSave: saveIfDirty,
    loadForSerial,
    ensureLoaded,
    init,
    resetStore,
  }
})
