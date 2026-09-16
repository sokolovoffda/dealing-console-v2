import { MediaConstraints } from '@wui/jssip/lib/RTCSession'
import { RTCSessionEvent } from '@wui/jssip/lib/UA'
import { computed, readonly, shallowRef, triggerRef, watch } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { useCallCardStore } from '@/features/call-card'


import { RTCSessionFacade, STATE, usePinnedCallsStore, useRTCSessionFacade } from '@/entities/call-session'
import { CallStatusState, Contact, useContactStatusState } from '@/entities/contact'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { useAutoAnswer, useDevicesSessionsStore, useDevicesStore } from '@/shared/composables'
import { useController, HubLedCommand } from '@/shared/controller'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

const { checkAutoAnswerAndGetDevice } = useAutoAnswer()

const innerData = shallowRef<Map<string, RTCSessionFacade>>(new Map())

const queueSessions = computed<RTCSessionFacade[]>(() => {
  const { isPinnedPanelSessionId } = usePinnedCallsPanelStore()
  const sessions: RTCSessionFacade[] = []
  for (const [, session] of innerData.value) {
    if (!isPinnedPanelSessionId(session.sessionId)) {
      sessions.push(session)
    }
  }
  return sessions
})

const getSessionById = (id: string): RTCSessionFacade | undefined => {
  return innerData.value.get(id)
}

const getSessionByCallId = (callId: string): RTCSessionFacade | undefined => {
  return Array.from(innerData.value.values()).find(session => session.callId.value === callId)
}

const getSessionsByPServed = (pServed: string): RTCSessionFacade[] => {
  return Array.from(innerData.value.values()).filter(session => session.pServed === pServed)
}
const getQueueSessionsByPServed = (pServed: string): RTCSessionFacade[] => {
  return queueSessions.value.filter((session) => session.pServed === pServed)
}
const getQueueSessionIndex = (sessionId: string): number | null => {
  const session = getSessionById(sessionId)

  if (!session) {
    return null
  }

  const sessionsByPServed = getQueueSessionsByPServed(session.pServed)

  if (sessionsByPServed.length <= 1) {
    return null
  }

  const index = sessionsByPServed.findIndex((item) => item.sessionId === sessionId)

  return index > -1 ? index + 1 : null
}

const getSessionStatePriority = (state: STATE): number => {
  switch (state) {
  case STATE.CONNECTED:
    return 0
  case STATE.ONHOLD:
    return 1
  case STATE.PROGRESS:
    return 2
  case STATE.RINGING:
    return 3
  default:
    return 4
  }
}

const getPreferredSessionByPServed = (pServed: string, preferredSessionId?: string): RTCSessionFacade | undefined => {
  const sessions = getSessionsByPServed(pServed)

  if (!sessions.length) {
    return undefined
  }

  if (preferredSessionId) {
    const preferredSession = sessions.find((session) => session.sessionId === preferredSessionId)

    if (preferredSession) {
      return preferredSession
    }
  }

  return sessions
    .slice()
    .sort((left, right) => {
      const leftPriority = getSessionStatePriority(left.sessionState.value)
      const rightPriority = getSessionStatePriority(right.sessionState.value)

      return leftPriority - rightPriority
    })
    .at(0)
}

const addSession = (e: RTCSessionEvent) => {
  const { setCallManagerState } = useCallManagerState()
  const { bindSessionToDevice, bindSessionDeviceAffinity } = useDevicesSessionsStore()
  const sessionFacade = useRTCSessionFacade(e.session)
  const sessionId = e.session.id
  const callId = e.request.getHeader('Call-ID') ?? ''
  const referCallId: string | undefined = e.request.getHeader('Refer-Call')
  sessionFacade.callId.value = callId
  sessionFacade.setReferCallId(referCallId)
  innerData.value.set(sessionId, sessionFacade)
  const isReplacesSession = 'replaces' in e.request && Boolean(e.request.replaces) // создание конфы из ТаТ, приходит обоим ТаТ контактам
  const pServed = sessionFacade.pServed
  const pServedConf = sessionFacade.conference?.pServed
  // авто ансвер вызывается как в обычных исходящих конфах, так и в созданных с помощью CreateConferenceFromTetATet
  const [isOutgoingConference, savedDeviceForConf] = pServedConf ? checkAutoAnswerAndGetDevice(pServedConf) : [false, null]
  const isOutgoingContact = !isOutgoingConference && e.originator === 'local' // исходящие и перехват вызова

  const queueDevice = useDevicesStore().readyQueueDevices.at(0) // в создании конфы из ТаТ у второго контакта нет autoAnswer и девайс не понятно как определить
  const device = savedDeviceForConf ?? queueDevice

  
  const mediaConstraints = {
    audio: {
      deviceId: normalizeAudioDeviceIdConstraint(device?.inputId),
      echoCancellation: device?.echoCancellation ?? true,
      noiseSuppression: device?.noiseSuppression ?? true,
      autoGainControl: device?.autoGainControl ?? true,
    },
    video: false,
  } as never as MediaConstraints

  // Создание конфы из тет-а-тет
  if (isReplacesSession) {
    if (pServedConf) {
      sessionFacade.answer({ mediaConstraints }, device)
      // После подмены сессии сначала срабатывает addSession для новой сессии, потом removeSession для предыдущей сессии → внутри срабатывает setCallManagerState(CallManagerState.INITIAL)
      setTimeout(() => {
        setCallManagerState(CallManagerState.CONFERENCE_CALL, sessionFacade.conference, {
          sessionId,
          callId,
        })
      }, 1000)
    } else {
      console.warn(`Conference by number: ${sessionFacade.number} not found`)
      sessionFacade.terminate()
    }
  } else if (isOutgoingConference) {
    sessionFacade.answer({ mediaConstraints }, device)

    const pinnedPServed = pServedConf ?? pServed
    const pinnedCallsStore = usePinnedCallsStore()
    if (pinnedCallsStore.isPServedSession(pinnedPServed)) {
      pinnedCallsStore.assignSessionToPinnedCall(sessionId, pinnedPServed)
    }
  } else if (isOutgoingContact) { // исходящие и перехват
    // Устройство уже установлено через bindSessionToDevice в switchToCall, если было передано
    // Переключаем устройство только если оно еще не установлено (перехват вызова)
    if (device && !sessionFacade.currentDevice.value) {
      bindSessionToDevice(sessionId, device.id)
    }

    const pinnedPanelStore = usePinnedCallsPanelStore()
    const pendingPinnedOrder = pinnedPanelStore.consumePendingDialSlotOrder()
    if (pendingPinnedOrder != null) {
      pinnedPanelStore.assignSessionToSlot(pendingPinnedOrder, sessionId)
    }

    // Consultation call с Refer-Call должен оставаться под управлением нового call-card,
    // без открытия legacy call-manager.
    const isConsultationOutgoing = Boolean(referCallId)

    // Dial со слота завешенных и consultation transfer — call-manager не открываем.
    if (
      !pinnedPanelStore.isPinnedPanelSessionId(sessionId)
      && !isConsultationOutgoing
    ) {
      setCallManagerState(CallManagerState.CONTACT_CALL, sessionFacade.contact as Contact, {
        sessionId,
        callId,
      })
    }
  } else { // incoming: affinity сразу, media/hold только на answer
    const devicesStore = useDevicesStore()
    const pinnedPanelStore = usePinnedCallsPanelStore()
    const assignedPinnedSlot = pinnedPanelStore.assignSessionToFreeSlot(sessionId, pServed)

    if (assignedPinnedSlot) {
      const gooseDevice = devicesStore.readyPreferredGoose

      if (gooseDevice) {
        bindSessionDeviceAffinity(sessionId, gooseDevice.id)
      } else {
        console.warn('Incoming pinned affinity: no ready goose device', { pServed, sessionId })
      }
    } else {
      const callCardStore = useCallCardStore()
      const handsetDevice = callCardStore.selectedHandsetSlot?.device
        ?? devicesStore.readyHandsetDevices.at(0)
        ?? devicesStore.readyQueueDevices.at(0)

      if (handsetDevice) {
        bindSessionDeviceAffinity(sessionId, handsetDevice.id)
      } else {
        console.warn('Incoming handset affinity: no ready handset device', { pServed, sessionId })
      }
    }
  }

  triggerRef(innerData)
  console.log(innerData.value)
}

const removeSession = (sessionId: string) => {
  const { updateLocal } = useContactStatusState()
  const { unbindSession } = useDevicesSessionsStore()
  const { selectedSession, setCallManagerState } = useCallManagerState()
  const { clearSessionIdFromPinnedCall } = usePinnedCallsStore()
  const { clearSessionIdFromSlot } = usePinnedCallsPanelStore()

  if (sessionId === selectedSession.value?.sessionId) {
    const internalNumber = selectedSession.value.number
    if (internalNumber) {
      updateLocal({ internalNumber, local: CallStatusState.TERMINATED })
    }

    setCallManagerState(CallManagerState.INITIAL)
  }

  if (innerData.value.has(sessionId)) {
    innerData.value.delete(sessionId)
    triggerRef(innerData)
  }

  clearSessionIdFromSlot(sessionId)
  clearSessionIdFromPinnedCall(sessionId)
  unbindSession(sessionId) // Отменяем привязку сессии к телефонной трубке
}

const ringingSessions = computed(() => {
  return Array.from(innerData.value.values()).filter(session => session.sessionState.value === STATE.RINGING)
})

const getFirstRingingSessionFromQueue = (): RTCSessionFacade | undefined => {
  const { isPinnedPanelSessionId } = usePinnedCallsPanelStore()
  let facade: RTCSessionFacade | undefined
  if (ringingSessions.value.length) {
    for (const session of ringingSessions.value) {
      if (!isPinnedPanelSessionId(session.sessionId)) {
        facade = session
        break
      }
    }
  }
  return facade
}

watch(() => ringingSessions.value.length, (value, oldValue) => {
  const { paintLedHub } = useController()
  if (!oldValue && value) { // Если появилась сессия в состоянии ringing, до этого сессий не было
    paintLedHub({
      index: HubLedCommand.CALL_1,
    })
  } else if (!value && oldValue) { // Если в данный момент сессий в состоянии ringing нет, до этого они были
    paintLedHub({})
  }
})

const outgoingSessions = computed(() => Array.from(innerData.value.values()).filter((session) => session.sessionState.value === STATE.PROGRESS))

const getSessionByPServed = (pServed: string) => {
  return getSessionsByPServed(pServed).at(0)
}

const refreshSessions = () => {
  triggerRef(innerData)
}

export const useSessionStore = () => {
  return {
    sessions: readonly(innerData),
    queueSessions,
    ringingSessions,
    outgoingSessions,
    getSessionById,
    getSessionByCallId,
    getSessionsByPServed,
    getQueueSessionsByPServed,
    getQueueSessionIndex,
    getPreferredSessionByPServed,
    getSessionByPServed,
    getFirstRingingSessionFromQueue,
    addSession,
    removeSession,
    refreshSessions,
  }
}
