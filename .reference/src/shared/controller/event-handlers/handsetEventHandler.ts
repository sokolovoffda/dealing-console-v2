import { MediaConstraints } from '@wui/jssip/lib/RTCSession'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { useCallCardStore } from '@/features/call-card'
import { useReferCallState } from '@/features/refer-call'

import { STATE, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { useMainSettingsStore } from '@/entities/main-settings'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  type LogicalMediaDevice,
  isUsableForMediaDevice,
  notifyMediaDeviceUnavailableForCall,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'
import { HandsetButtonValue, useHandsetPickupHangupHandler } from '@/shared/controller'
import type { IncomingControllerEvent } from '@/shared/controller/types'
import { ControllerEvents, handsetButtons } from '@/shared/controller/types'
import { useWebRTC } from '@/shared/jssip'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

const _checkModule = (module: string | undefined, handset: string) => {
  if (!module) return false

  const [, moduleCode] = module.split('_')
  const [, handsetCode] = handset.split('_')
  return moduleCode === handsetCode
}

const _getHandsetDevice = (handset: string): LogicalMediaDevice | undefined => {
  const devicesStore = useDevicesStore()

  return devicesStore.getDeviceByModule(handset)
    ?? devicesStore.getDeviceById(handset)
    ?? devicesStore.handsetDevices.find(device =>
      device.controllerDeviceId === handset || _checkModule(device.module, handset),
    )
}

const _bindHandsetToActivePinnedCall = (handset: string): boolean => {
  const { activePinnedCallSession } = usePinnedCallsStore()
  const { bindSessionToDevice } = useDevicesSessionsStore()
  const device = _getHandsetDevice(handset)
  const facade = activePinnedCallSession

  if (!facade || !isUsableForMediaDevice(device)) {
    return false
  }

  bindSessionToDevice(facade.sessionId, device.id)
  facade.unmute()

  return true
}

const _bindHandset = (handset: string, autoAnswerOnPickup: boolean) => {
  if (_bindHandsetToActivePinnedCall(handset)) {
    return
  }

  if (!autoAnswerOnPickup) {
    return
  }

  const { getFirstRingingSessionFromQueue } = useSessionStore()
  const facade = getFirstRingingSessionFromQueue()
  if (!facade) return

  const device = _getHandsetDevice(handset)
  if (!isUsableForMediaDevice(device)) {
    notifyMediaDeviceUnavailableForCall()
    return
  }

  const mediaConstraints = {
    audio: {
      deviceId: normalizeAudioDeviceIdConstraint(device.inputId),
      echoCancellation: device.echoCancellation ?? true,
      noiseSuppression: device.noiseSuppression ?? true,
      autoGainControl: device.autoGainControl ?? true,
    },
    video: false,
  } as never as MediaConstraints

  facade.answer({ mediaConstraints }, device)
}

const _unbindHandset = (handset: string) => {
  const devicesSessionsStore = useDevicesSessionsStore()
  const devicesStore = useDevicesStore()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const { getSessionById } = useSessionStore()
  const device = _getHandsetDevice(handset)
  const runtimeKey = device
    ? devicesSessionsStore.getDeviceSessionKey(device)
    : handset
  const sessions = devicesSessionsStore.devicesSession.get(runtimeKey)

  if (!sessions) {
    console.warn(`not found sessions on handset: ${handset} to unbind`)
    return
  }

  for (const id of sessions) {
    const RTCSessionFacade = getSessionById(id)
    if (!RTCSessionFacade) continue

    if (
      RTCSessionFacade.sessionState.value === STATE.CONNECTED ||
      RTCSessionFacade.sessionState.value === STATE.PROGRESS ||
      RTCSessionFacade.sessionState.value === STATE.RINGING
    ) {
      // Pin-path: при hangup трубки не terminate — вернуть на goose.
      // Connected → полный bind (mic track); иначе affinity (без peerconnection).
      if (pinnedCallsPanelStore.isPinnedPanelSessionId(id)) {
        const gooseDevice = devicesStore.readyPreferredGoose

        if (gooseDevice) {
          if (RTCSessionFacade.session?.connection) {
            devicesSessionsStore.bindSessionToDevice(id, gooseDevice.id, {
              holdOthers: false,
            })
          } else {
            devicesSessionsStore.bindSessionDeviceAffinity(id, gooseDevice.id)
          }
        } else {
          console.warn(`not found pinned goose device for session: ${id}`)
        }
        continue
      }

      devicesSessionsStore.unbindSession(id)
      RTCSessionFacade.terminate()
    }
  }
}

const _handleHandsetButtonAction = (payload: { button: HandsetButtonValue, handset: string }) => {
  const { button, handset } = payload
  const devicesSessionsStore = useDevicesSessionsStore()
  const { getFirstRingingSessionFromQueue } = useSessionStore()
  const { callManagerState, selectedSession, setCallManagerState } = useCallManagerState()
  const { selectedReferType, executeRefer, finishProcess } = useReferCallState()
  const { switchToCall } = useWebRTC()
  const callCardStore = useCallCardStore()
  const {
    hangupHandsetHandler,
    pickupHandsetHandler,
    telephoneNumber,
  } = useHandsetPickupHangupHandler()
  const handsetState = devicesSessionsStore.getHandsetStateByDevice(handset)
  const device = _getHandsetDevice(handset)

  if (!handsetState || handsetState === ControllerEvents.HANGUP) {
    return
  }

  const firstRingingSessionFacade = getFirstRingingSessionFromQueue()
  const isTransferMode = selectedReferType.value === 'consultation' || selectedReferType.value === 'blind'

  if (button === 'answer') {
    if (device && !isUsableForMediaDevice(device)) {
      notifyMediaDeviceUnavailableForCall()
      hangupHandsetHandler()
      return
    }

    if (isTransferMode && telephoneNumber.value) {
      if (selectedReferType.value === 'consultation' && selectedSession.value) {
        switchToCall(
          telephoneNumber.value,
          device,
          [`Refer-Call:${selectedSession.value.sessionId}`],
        )
        finishProcess()
      } else if (selectedReferType.value === 'blind') {
        executeRefer(telephoneNumber.value)
      } else {
        switchToCall(telephoneNumber.value, device)
      }

      hangupHandsetHandler()
    } else if (callCardStore.callDialNumberFromHandsetDevice(device)) {
      hangupHandsetHandler()
    } else if (firstRingingSessionFacade) {
      const mediaConstraints = {
        audio: {
          deviceId: normalizeAudioDeviceIdConstraint(device?.inputId),
          echoCancellation: device?.echoCancellation ?? true,
          noiseSuppression: device?.noiseSuppression ?? true,
          autoGainControl: device?.autoGainControl ?? true,
        },
        video: false,
      } as never as MediaConstraints

      firstRingingSessionFacade.answer({ mediaConstraints }, device)
    }

    return
  }

  const activeSession = devicesSessionsStore.getActiveSessionOnDevice(handset)

  if (button === 'decline') {
    if (activeSession) {
      activeSession.terminate()
    } else if (firstRingingSessionFacade) {
      firstRingingSessionFacade.terminate()
    }

    if (telephoneNumber.value) {
      hangupHandsetHandler()
    }

    return
  }

  if (isTransferMode) {
    pickupHandsetHandler(button)
    return
  }

  if (activeSession) {
    activeSession.sendDtmf(button)
    return
  }

  if (callCardStore.insertDialTextFromHandsetDevice(device, button)) {
    return
  }

  if (
    callManagerState.value !== CallManagerState.INITIAL
    && callManagerState.value !== CallManagerState.CONTACT_CALL
  ) {
    setCallManagerState(CallManagerState.INITIAL)
  }

  pickupHandsetHandler(button, (number) => {
    switchToCall(number, device)
  })
}

export const handsetEventHandler = (e: IncomingControllerEvent<'handset'>) => {
  const devicesSessionsStore = useDevicesSessionsStore()
  const { hangupHandsetHandler } = useHandsetPickupHangupHandler()
  const callCardStore = useCallCardStore()

  const HANDSET = e.sender // Имя такого вида handset_L2 handset_L1 и т.д.
  const BUTTONS = handsetButtons.transformValues(HANDSET)
  const handleHandsetAction = _handleHandsetButtonAction
  const {
    setHandsetState,
    toggleMuteAllSessionsOnDevice,
  } = devicesSessionsStore

  if (e.name === ControllerEvents.RELEASED) {
    switch (e.target) {
    case BUTTONS.ONE: {
      const event = {
        button: '1' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.TWO: {
      const event = {
        button: '2' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.THREE: {
      const event = {
        button: '3' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.FOUR: {
      const event = {
        button: '4' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.FIVE: {
      const event = {
        button: '5' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.SIX: {
      const event = {
        button: '6' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.SEVEN: {
      const event = {
        button: '7' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.EIGHT: {
      const event = {
        button: '8' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.NINE: {
      const event = {
        button: '9' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.ZERO: {
      const event = {
        button: '0' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.GRID: {
      const event = {
        button: '#' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.STAR: {
      const event = {
        button: '*' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.ANSWER: {
      const event = {
        button: 'answer' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.DECLINE: {
      const event = {
        button: 'decline' as HandsetButtonValue,
        handset: HANDSET,
      }
      handleHandsetAction(event)
      break
    }
    case BUTTONS.MUTE: {
      toggleMuteAllSessionsOnDevice(HANDSET)
      break
    }
    default:
      console.warn('Unknown handset button: ', e.target)
    }
  } else if (e.name === ControllerEvents.PICKUP) {
    switch (e.target) {
    case BUTTONS.HANDSET: {
      const mainSettings = useMainSettingsStore().settings

      _bindHandset(HANDSET, mainSettings.autoAnswerOnHandsetPickup)

      if (mainSettings.openCallCardOnHandsetPickup) {
        callCardStore.openHandsetByDevice(_getHandsetDevice(HANDSET))
      }

      setHandsetState({
        device: HANDSET,
        state: ControllerEvents.PICKUP,
      })
      break
    }
    default: {
      console.warn(`Unknown target: ${e.target}`)
    }
    }
  } else if (e.name === ControllerEvents.HANGUP) {
    switch (e.target) {
    case BUTTONS.HANDSET: {
      _unbindHandset(HANDSET)
      setHandsetState({
        device: HANDSET,
        state: ControllerEvents.HANGUP,
      })
      hangupHandsetHandler()
      break
    }
    default: {
      console.warn(`Unknown target: ${e.target}`)
    }
    }
  } else if (e.name === ControllerEvents.MUTED) {
    switch (e.target) {
    case BUTTONS.HANDSET: {
      // TODO Нет реализации на сервере пульта
      break
    }
    default: {
      console.debug('Unknown target: ', e.target)
    }
    }
  } else if (e.name === ControllerEvents.UNMUTED) {
    switch (e.target) {
    case BUTTONS.HANDSET: {
      // TODO Нет реализации на сервере пульта
      break
    }
    default: {
      console.debug('Unknown target: ', e.target)
    }
    }
  }
}
