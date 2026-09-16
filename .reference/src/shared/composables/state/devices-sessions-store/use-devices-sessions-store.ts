import { RTCSession } from '@wui/jssip/lib/RTCSession'
import { defineStore, storeToRefs } from 'pinia'
import { readonly, ref, watch } from 'vue'

import { RTCSessionFacade, STATE, useSessionStore } from '@/entities/call-session'

import {
  LogicalMediaDeviceTypeEnum,
  useDevicesStore,
  type LogicalMediaDevice,
} from '@/shared/composables'
import { ControllerEvents } from '@/shared/controller/types'
import { debounce } from '@/shared/utils/debounce'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

type SessionId = string
type DeviceSessionKey = string
type DeviceSessionTarget = LogicalMediaDevice | DeviceSessionKey
type HandsetDevice = string
type GooseDevice = string
type HandsetState = ControllerEvents.PICKUP | ControllerEvents.HANGUP
type HandsetMuteState = ControllerEvents.UNMUTED | ControllerEvents.MUTED

/** Режим привязки сессии к устройству. Affinity = без hold и без media. */
export type BindSessionToDeviceOptions = {
  /** Hold других CONNECTED-сессий на трубке. Default: true (activation). */
  holdOthers?: boolean
  /** getUserMedia / replaceTrack. Default: true. Affinity: false — только currentDevice. */
  applyMedia?: boolean
}

type SessionCurrentDevice = {
  autoGainControl?: boolean
  controllerDeviceId?: string
  echoCancellation?: boolean
  id?: string
  inputId?: string
  mode?: LogicalMediaDevice['mode']
  module?: string
  name?: string
  noiseSuppression?: boolean
  outputId?: string
  status?: string
  type?: string
} | null | undefined

const getDeviceSessionKey = (
  device: Pick<LogicalMediaDevice, 'id'> & Partial<Pick<LogicalMediaDevice, 'controllerDeviceId' | 'module'>>,
): DeviceSessionKey =>
  device.module ?? device.controllerDeviceId ?? device.id

const hasDeviceSessionPayloadChanged = (
  previousDevice: LogicalMediaDevice,
  nextDevice: LogicalMediaDevice,
): boolean =>
  previousDevice.inputId !== nextDevice.inputId
  || previousDevice.outputId !== nextDevice.outputId
  || previousDevice.echoCancellation !== nextDevice.echoCancellation
  || previousDevice.noiseSuppression !== nextDevice.noiseSuppression
  || previousDevice.autoGainControl !== nextDevice.autoGainControl
  || previousDevice.status !== nextDevice.status
  || getDeviceSessionKey(previousDevice) !== getDeviceSessionKey(nextDevice)

const getSessionDebugPayload = (session: RTCSessionFacade) => ({
  sessionId: session.sessionId,
  number: session.number,
  pServed: session.pServed,
})

const DEFAULT_HANDSET_VOLUME = 1

const clampVolume = (value: number): number =>
  Math.min(1, Math.max(0, value))

const getDeviceDebugPayload = (
  device: SessionCurrentDevice,
) => device ? {
  autoGainControl: device.autoGainControl,
  echoCancellation: device.echoCancellation,
  id: device.id,
  inputId: device.inputId,
  module: device.module,
  name: device.name,
  noiseSuppression: device.noiseSuppression,
  outputId: device.outputId,
  status: device.status,
  type: device.type,
} : null

const isSameSessionDevice = (
  currentDevice: SessionCurrentDevice,
  nextDevice: LogicalMediaDevice,
): boolean => {
  if (!currentDevice) return false

  return currentDevice.id === nextDevice.id
    && currentDevice.module === nextDevice.module
    && currentDevice.inputId === nextDevice.inputId
    && currentDevice.outputId === nextDevice.outputId
    && currentDevice.echoCancellation === nextDevice.echoCancellation
    && currentDevice.noiseSuppression === nextDevice.noiseSuppression
    && currentDevice.autoGainControl === nextDevice.autoGainControl
}

export const useDevicesSessionsStore = defineStore(
  'devices-sessions-store',
  () => {
    const { getSessionById } = useSessionStore()
    const devicesStore = useDevicesStore()
    const { devices, isMockControllerModules } = storeToRefs(devicesStore)

    const devicesSession = ref(new Map<DeviceSessionKey, SessionId[]>())
    const handsetsState = ref(new Map<HandsetDevice, HandsetState>())
    const handsetMutedState = ref(new Map<DeviceSessionKey, HandsetMuteState>())
    const handsetVolumeState = ref(new Map<DeviceSessionKey, number>())
    const goosePushToTalkState = ref(new Map<GooseDevice, boolean>())

    const getDeviceByRuntimeKey = (
      key: DeviceSessionKey,
    ): LogicalMediaDevice | undefined =>
      devicesStore.getDeviceById(key)
      ?? devicesStore.getDeviceByModule(key)
      ?? devices.value.find(device => device.controllerDeviceId === key)

    const getRuntimeKey = (deviceOrKey: DeviceSessionTarget) => {
      if (typeof deviceOrKey === 'string') {
        const device = getDeviceByRuntimeKey(deviceOrKey)

        return device
          ? getDeviceSessionKey(device)
          : deviceOrKey
      }

      return getDeviceSessionKey(deviceOrKey)
    }

    const resolveHandsetStateKey = (
      deviceOrKey: DeviceSessionTarget,
    ): HandsetDevice | undefined => {
      if (typeof deviceOrKey === 'string') {
        const device = getDeviceByRuntimeKey(deviceOrKey)

        if (device?.type === LogicalMediaDeviceTypeEnum.HANDSET) {
          return getDeviceSessionKey(device)
        }

        // События контроллера приходят как handset_L2 и т.п.
        return deviceOrKey
      }

      if (deviceOrKey.type !== LogicalMediaDeviceTypeEnum.HANDSET) {
        return undefined
      }

      return getDeviceSessionKey(deviceOrKey)
    }

    const getHandsetStateByDevice = (
      device: HandsetDevice,
    ): HandsetState | undefined => handsetsState.value.get(device)

    /** Звук in/out в трубке только когда она снята (pickup). */
    const isHandsetOffHook = (deviceOrKey: DeviceSessionTarget): boolean => {
      const logicalDevice = typeof deviceOrKey === 'string'
        ? getDeviceByRuntimeKey(deviceOrKey)
        : deviceOrKey

      if (logicalDevice && logicalDevice.type !== LogicalMediaDeviceTypeEnum.HANDSET) {
        return true
      }

      const handsetKey = resolveHandsetStateKey(deviceOrKey)

      if (!handsetKey) return true

      const state = getHandsetStateByDevice(handsetKey)

      // Soft/без рычага: cradle ещё не инициализирован — не блокируем звук.
      if (state === undefined) return true

      return state === ControllerEvents.PICKUP
    }

    const applyHandsetCradleAudioToSessions = (handsetKey: HandsetDevice) => {
      const runtimeKey = getRuntimeKey(handsetKey)
      const sessionIds = devicesSession.value.get(runtimeKey)

      sessionIds?.forEach((id) => {
        const session = getSessionById(id)

        if (!session) return

        applyStoredHandsetAudioStateToSession(session, { device: handsetKey })
      })
    }

    const setHandsetState = (
      payload: { device: HandsetDevice, state: HandsetState },
    ) => {
      handsetsState.value.set(payload.device, payload.state)
      applyHandsetCradleAudioToSessions(payload.device)
    }

    const applyHandsetMuteStateToSessions = (
      runtimeKey: DeviceSessionKey,
      state: HandsetMuteState,
    ) => {
      const sessionIds = devicesSession.value.get(runtimeKey)

      sessionIds?.forEach(id => {
        const session = getSessionById(id)

        if (!session) return

        if (!isHandsetOffHook(runtimeKey)) {
          session.mute()

          return
        }

        if (state === ControllerEvents.MUTED) {
          session.mute()
        } else {
          session.unmute()
        }
      })
    }

    const applyHandsetVolumeToSessions = (
      runtimeKey: DeviceSessionKey,
      volume: number,
    ) => {
      const sessionIds = devicesSession.value.get(runtimeKey)

      sessionIds?.forEach(id => {
        const session = getSessionById(id)

        if (!session) return

        if (!isHandsetOffHook(runtimeKey)) {
          session.setAudioPlayerVolume(0)

          return
        }

        session.setAudioPlayerVolume(volume)
      })
    }

    const setHandsetMutedState = (
      payload: { device: DeviceSessionTarget, state: HandsetMuteState },
    ) => {
      const runtimeKey = getRuntimeKey(payload.device)

      handsetMutedState.value.set(runtimeKey, payload.state)
      applyHandsetMuteStateToSessions(runtimeKey, payload.state)
    }

    const getHandsetMutedState = (
      deviceOrKey: DeviceSessionTarget,
    ): HandsetMuteState =>
      handsetMutedState.value.get(getRuntimeKey(deviceOrKey)) ?? ControllerEvents.UNMUTED

    const isHandsetMuted = (deviceOrKey: DeviceSessionTarget): boolean =>
      getHandsetMutedState(deviceOrKey) === ControllerEvents.MUTED

    const setHandsetVolume = (
      deviceOrKey: DeviceSessionTarget,
      value: number,
    ) => {
      const runtimeKey = getRuntimeKey(deviceOrKey)
      const volume = clampVolume(value)

      handsetVolumeState.value.set(runtimeKey, volume)
      applyHandsetVolumeToSessions(runtimeKey, volume)
    }

    const getHandsetVolume = (deviceOrKey: DeviceSessionTarget): number =>
      handsetVolumeState.value.get(getRuntimeKey(deviceOrKey)) ?? DEFAULT_HANDSET_VOLUME

    const applyStoredHandsetAudioStateToSession = (
      session: RTCSessionFacade,
      config: { applyVolume?: boolean, device?: DeviceSessionTarget } = {},
    ) => {
      const device = config.device ?? session.currentDevice.value

      if (!device) return

      const { applyVolume = true } = config
      const runtimeKey = getRuntimeKey(device)
      const logicalDevice = typeof device === 'string'
        ? getDeviceByRuntimeKey(device)
        : device
      const isHandset = logicalDevice?.type === LogicalMediaDeviceTypeEnum.HANDSET
        || (typeof device === 'string' && device.startsWith('handset'))

      // Лежачая трубка: ни mic (in), ни playback (out) до pickup.
      if (isHandset && !isHandsetOffHook(device)) {
        session.mute()
        session.setAudioPlayerVolume(0)

        return
      }

      const muteState = handsetMutedState.value.get(runtimeKey)
      const volume = handsetVolumeState.value.get(runtimeKey)

      if (muteState === ControllerEvents.MUTED) {
        session.mute()
      } else if (muteState === ControllerEvents.UNMUTED) {
        session.unmute()
      } else if (isHandset) {
        // После снятия трубки без явного mute-state — открыть mic.
        session.unmute()
      }

      if (applyVolume) {
        session.setAudioPlayerVolume(volume ?? DEFAULT_HANDSET_VOLUME)
      }
    }

    const setGoosePushToTalkState = (
      payload: { device: GooseDevice, state: boolean },
    ) => {
      goosePushToTalkState.value.set(payload.device, payload.state)
    }

    const getGoosePushToTalkState = (
      device: GooseDevice,
    ): boolean | undefined => goosePushToTalkState.value.get(device)

    const isGooseMicGloballyEnabled = (
      device?: SessionCurrentDevice,
    ): boolean => {
      if (!device || device.type !== LogicalMediaDeviceTypeEnum.GOOSE) return true

      if (!device.id) return true

      const storedState = getGoosePushToTalkState(getDeviceSessionKey({
        controllerDeviceId: device.controllerDeviceId,
        id: device.id,
        module: device.module,
      }))

      if (storedState !== undefined) return storedState

      return device.mode !== 'pushToTalk'
    }

    const getActiveSessionOnDevice = (
      deviceOrKey: LogicalMediaDevice | DeviceSessionKey,
    ): RTCSessionFacade | undefined => {
      const sessions = devicesSession.value.get(getRuntimeKey(deviceOrKey))

      if (!sessions) return undefined

      for (const id of sessions) {
        const session = getSessionById(id)

        if (
          session?.sessionState.value === STATE.CONNECTED
          || session?.sessionState.value === STATE.PROGRESS
        ) {
          return session
        }
      }

      return undefined
    }

    const closeStream = (stream: MediaStream) => {
      stream.getTracks().forEach(track => {
        track.stop()
      })
    }

    const replaceMediaDeviceOnSession = async (
      session: RTCSession,
      device: LogicalMediaDevice,
      sessionId: SessionId,
    ): Promise<MediaStream | null> => {
      if (!device.hasInput || !device.inputId) {
        console.warn('Device has no ready audio input for session', {
          device: getDeviceDebugPayload(device),
          sessionId,
        })

        return null
      }

      const browserMediaDevices = typeof navigator === 'undefined'
        ? undefined
        : navigator.mediaDevices

      if (!browserMediaDevices?.getUserMedia) {
        console.warn('MediaDevices API is unavailable')

        return null
      }

      const stream = await browserMediaDevices.getUserMedia({
        audio: {
          autoGainControl: device.autoGainControl,
          deviceId: normalizeAudioDeviceIdConstraint(device.inputId),
          echoCancellation: device.echoCancellation,
          noiseSuppression: device.noiseSuppression,
        },
        video: false,
      })
      const track = stream.getAudioTracks()[0]
      const connection = session.connection

      if (!track || !connection || connection.connectionState === 'closed') {
        closeStream(stream)

        return null
      }

      track.enabled = !session.isMuted().audio && !session.isOnHold().local

      const audioSenders = connection.getSenders?.()
        ?.filter(sender => sender.track?.kind === track.kind) ?? []

      if (!audioSenders.length) {
        closeStream(stream)

        return null
      }

      await Promise.all(
        audioSenders.map(sender => sender.replaceTrack(track)),
      )

      console.debug('Session audio input track replaced', {
        device: getDeviceDebugPayload(device),
        sessionId,
      })

      return stream
    }

    const updateSessionDevice = async (
      sessionId: SessionId,
      device: LogicalMediaDevice,
    ) => {
      const session = getSessionById(sessionId)

      if (!session) {
        console.warn(`UpdateSessionDevice: session (${sessionId}) not found`)

        return
      }

      if (device.status !== 'ready') {
        console.warn('UpdateSessionDevice: device is not ready', {
          device: getDeviceDebugPayload(device),
          session: getSessionDebugPayload(session),
        })

        return
      }

      const currentDevice = session.currentDevice.value as SessionCurrentDevice

      if (isSameSessionDevice(currentDevice, device)) {
        console.debug('Session already uses audio device', {
          device: getDeviceDebugPayload(device),
          session: getSessionDebugPayload(session),
        })

        return
      }

      try {
        console.debug('Session audio device changed', {
          from: getDeviceDebugPayload(currentDevice),
          session: getSessionDebugPayload(session),
          to: getDeviceDebugPayload(device),
        })

        session.setCurrentDevice(device as never)

        const stream = await replaceMediaDeviceOnSession(
          session.session,
          device,
          session.sessionId,
        )

        if (stream) {
          if (session.localStream.value) closeStream(session.localStream.value)

          session.localStream.value = stream
        }
      } catch (e) {
        console.error(e)
      }
    }

    const updateAllSessionsOnDevice = async (device: LogicalMediaDevice) => {
      const sessionIds = devicesSession.value.get(getDeviceSessionKey(device))

      if (!sessionIds?.length) return

      for (const sessionId of sessionIds) {
        await updateSessionDevice(sessionId, device)
      }
    }

    const holdOtherSessionsOnDevice = (
      sessionId: SessionId,
      deviceId: string,
    ) => {
      const device = getDeviceByRuntimeKey(deviceId)

      if (!device) {
        console.warn('Device not found by id: ', deviceId)

        return
      }

      if (device.type === LogicalMediaDeviceTypeEnum.GOOSE) return

      const sessionsOnDevice = devicesSession.value.get(getDeviceSessionKey(device))

      if (!sessionsOnDevice) return

      sessionsOnDevice
        .filter(id => id !== sessionId)
        .forEach(id => {
          const session = getSessionById(id)

          if (session?.sessionState.value === STATE.CONNECTED) {
            void session.toggleHold(true)
          }
        })
    }

    const unbindSession = (sessionId: SessionId) => {
      for (const [deviceKey, sessionIds] of devicesSession.value) {
        const nextSessionIds = sessionIds.filter(id => id !== sessionId)

        if (nextSessionIds.length) {
          devicesSession.value.set(deviceKey, nextSessionIds)
        } else {
          devicesSession.value.delete(deviceKey)
        }
      }
    }

    const clearAllSessionBindings = () => {
      devicesSession.value.clear()
    }

    const isBindSession = (sessionId: SessionId): boolean => {
      for (const sessionIds of devicesSession.value.values()) {
        if (sessionIds.includes(sessionId)) return true
      }

      return false
    }

    const bindSessionToDevice = (
      sessionId: SessionId,
      deviceId: string,
      options: BindSessionToDeviceOptions = {},
    ) => {
      const {
        holdOthers = true,
        applyMedia = true,
      } = options

      const device = getDeviceByRuntimeKey(deviceId)

      if (!device) {
        console.warn('Device not found by id: ', deviceId)

        return
      }

      if (device.status !== 'ready') {
        console.warn('Session cannot be bound to unavailable device', {
          device: getDeviceDebugPayload(device),
          sessionId,
        })

        return
      }

      if (holdOthers) {
        holdOtherSessionsOnDevice(sessionId, device.id)
      }

      if (isBindSession(sessionId)) unbindSession(sessionId)

      const deviceKey = getDeviceSessionKey(device)
      const sessionIds = devicesSession.value.get(deviceKey) ?? []

      if (!sessionIds.includes(sessionId)) {
        devicesSession.value.set(deviceKey, [...sessionIds, sessionId])
      }

      const session = getSessionById(sessionId)

      if (!session) return

      if (applyMedia) {
        applyStoredHandsetAudioStateToSession(session, {
          applyVolume: false,
          device,
        })
        void updateSessionDevice(sessionId, device)

        return
      }

      // Affinity: только currentDevice + devicesSession, без media/mute side-effects.
      session.setCurrentDevice(device as never)
    }

    /** Incoming/ringing: привязать устройство без hold и без getUserMedia. */
    const bindSessionDeviceAffinity = (
      sessionId: SessionId,
      deviceId: string,
    ) => bindSessionToDevice(sessionId, deviceId, {
      applyMedia: false,
      holdOthers: false,
    })

    const toggleMuteAllSessionsOnDevice = (deviceKey: DeviceSessionKey) => {
      const runtimeKey = getRuntimeKey(deviceKey)
      const sessionIds = devicesSession.value.get(runtimeKey)

      console.debug('Toggle mute all sessions on device', {
        device: runtimeKey,
        sessionIds,
      })

      const currentMuteState = handsetMutedState.value.get(runtimeKey)
      const nextMuteState = currentMuteState === ControllerEvents.MUTED
        ? ControllerEvents.UNMUTED
        : ControllerEvents.MUTED

      setHandsetMutedState({ device: runtimeKey, state: nextMuteState })
    }

    const syncDeviceSessionKey = (
      previousDevice: LogicalMediaDevice,
      nextDevice: LogicalMediaDevice,
    ) => {
      const previousKey = getDeviceSessionKey(previousDevice)
      const nextKey = getDeviceSessionKey(nextDevice)

      if (previousKey === nextKey || !devicesSession.value.has(previousKey)) return

      const previousSessionIds = devicesSession.value.get(previousKey) ?? []
      const nextSessionIds = devicesSession.value.get(nextKey) ?? []

      devicesSession.value.set(
        nextKey,
        Array.from(new Set([...nextSessionIds, ...previousSessionIds])),
      )
      devicesSession.value.delete(previousKey)
    }

    const devicesToUpdate = new Map<DeviceSessionKey, LogicalMediaDevice>()

    const debouncedUpdateDevices = debounce(() => {
      for (const device of devicesToUpdate.values()) {
        void updateAllSessionsOnDevice(device)
      }

      devicesToUpdate.clear()
    }, 300)

    watch(
      devices,
      (nextDevices) => {
        // Controller-трубки по умолчанию на рычаге, пока не пришёл pickup.
        // Mock без железа: сразу PICKUP, иначе mic/playback всегда mute.
        const defaultCradleState = isMockControllerModules.value
          ? ControllerEvents.PICKUP
          : ControllerEvents.HANGUP

        nextDevices.forEach((device) => {
          if (device.type !== LogicalMediaDeviceTypeEnum.HANDSET) return
          if (device.origin !== 'controller') return

          const handsetKey = getDeviceSessionKey(device)

          if (!handsetsState.value.has(handsetKey)) {
            handsetsState.value.set(handsetKey, defaultCradleState)
          }
        })
      },
      { deep: true, flush: 'sync', immediate: true },
    )

    watch(
      devices,
      (nextDevices, previousDevices = []) => {
        const previousDevicesById = new Map(
          previousDevices.map(device => [device.id, device]),
        )

        nextDevices.forEach(nextDevice => {
          const previousDevice = previousDevicesById.get(nextDevice.id)

          if (!previousDevice) return

          syncDeviceSessionKey(previousDevice, nextDevice)

          if (!hasDeviceSessionPayloadChanged(previousDevice, nextDevice)) return
          if (nextDevice.status !== 'ready') return

          devicesToUpdate.set(getDeviceSessionKey(nextDevice), nextDevice)
        })

        if (devicesToUpdate.size) debouncedUpdateDevices()
      },
      { deep: true },
    )

    return {
      applyStoredHandsetAudioStateToSession,
      bindSessionDeviceAffinity,
      bindSessionToDevice,
      clearAllSessionBindings,
      closeStream,
      devicesSession: readonly(devicesSession),
      getActiveSessionOnDevice,
      getDeviceSessionKey,
      getGoosePushToTalkState,
      getHandsetMutedState,
      getHandsetVolume,
      getHandsetStateByDevice,
      goosePushToTalkState: readonly(goosePushToTalkState),
      handsetMutedState: readonly(handsetMutedState),
      handsetVolumeState: readonly(handsetVolumeState),
      handsetsState: readonly(handsetsState),
      holdOtherSessionsOnDevice,
      isBindSession,
      isGooseMicGloballyEnabled,
      isHandsetMuted,
      isHandsetOffHook,
      replaceMediaDeviceOnSession,
      setGoosePushToTalkState,
      setHandsetMutedState,
      setHandsetVolume,
      setHandsetState,
      toggleMuteAllSessionsOnDevice,
      unbindSession,
      updateAllSessionsOnDevice,
      updateSessionDevice,
    }
  },
)
