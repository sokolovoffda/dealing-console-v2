import type { MediaConstraints } from '@wui/jssip/lib/RTCSession'
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'

import {
  STATE,
  useSessionStore,
  type RTCSessionFacade,
} from '@/entities/call-session'
import {
  getPinnedCallPServedKey,
  PINNED_CALLS_INITIAL_MIC_STATE,
  PINNED_CALLS_INITIAL_VOLUME,
  usePinnedCallsPanelStore,
} from '@/entities/pinned-calls'

import {
  isUsableForMediaDevice,
  notifyMediaDeviceUnavailableForCall,
  type LogicalMediaDevice,
  useAppStore,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'
import { ControllerEvents } from '@/shared/controller/types'
import { ReferResultType } from '@/shared/jssip'
import { useNotification } from '@/shared/notifications'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

import { startCallCardOutgoingCall } from './call-card-actions'
import {
  getCallCardFooterHandsetView,
  getCallCardFooterIndicatorSession,
} from './call-card-footer-view'
import { routeCallCardIncomingSessions } from './call-card-session-routing'
import {
  getCallCardActiveSessionForSlot,
  getCallCardHandsetSlotById,
  getCallCardHandsetSlots,
  getCallCardSelectedSessionForSlot,
  getCallCardSessionsForSlot,
  resolveCallCardHandsetId,
} from './call-card-session-selectors'
import { getCallCardSessionViewModel } from './call-card-session-view'
import {
  clearText,
  insertText,
  setTextSelection,
  type CallCardEditableTextState,
  type CallCardTextSelection,
  type CallCardTextSelectionPayload,
} from './call-card-text-editor'
import {
  CALL_CARD_DEFAULT_HANDSET_ID,
  CALL_CARD_DEFAULT_VOLUME,
  CALL_CARD_HANDSET_IDS,
  CALL_CARD_PANEL_MODES,
  CALL_CARD_SESSION_VIEW_STATES,
  type CallCardFooterHandsetView,
  type CallCardHandsetId,
  type CallCardHandsetSessionQueues,
  type CallCardHandsetSessions,
  type CallCardHandsetSlot,
  type CallCardHandsetState,
  type CallCardPanelMode,
  type CallCardQueueVirtualPosition,
  type CallCardSessionRouting,
  type CallCardSessionViewModel,
  type CallCardTransferState,
} from './types'

const CALL_CARD_HANDSET_ID_LIST: readonly CallCardHandsetId[] = [
  CALL_CARD_HANDSET_IDS.left,
  CALL_CARD_HANDSET_IDS.right,
]

type PendingOutgoingSessionSelection = {
  handsetId: CallCardHandsetId
  knownSessionIds: Set<string>
  number: string
}

const createDefaultTransferState = (): CallCardTransferState => ({
  consultationStage: 'idle',
  sourceSessionId: null,
  targetName: '',
  targetNumber: '',
  targetSelectionStart: null,
  targetSelectionEnd: null,
  targetSessionId: null,
})

const createDefaultHandsetState = (): CallCardHandsetState => ({
  selectedSessionId: null,
  queueVirtualPosition: null,
  panelMode: CALL_CARD_PANEL_MODES.dialpad,
  dialBuffer: '',
  dialContactName: '',
  dialSelectionStart: null,
  dialSelectionEnd: null,
  transferState: createDefaultTransferState(),
  isMuted: false,
  volume: CALL_CARD_DEFAULT_VOLUME,
})

const clampVolume = (value: number): number =>
  Math.min(1, Math.max(0, value))

const isTransferSourceState = (
  state: CallCardSessionViewModel['state'] | undefined,
): boolean =>
  state === CALL_CARD_SESSION_VIEW_STATES.active
  || state === CALL_CARD_SESSION_VIEW_STATES.hold

export const useCallCardStore = defineStore('call-card', () => {
  const devicesStore = useDevicesStore()
  const devicesSessionsStore = useDevicesSessionsStore()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const sessionStore = useSessionStore()

  const isOpen = ref(false)
  const requestedHandsetId = ref<CallCardHandsetId>(CALL_CARD_DEFAULT_HANDSET_ID)
  const routedSessionHandsetIds = ref<CallCardSessionRouting>(new Map())
  const pendingOutgoingSessionSelection = ref<PendingOutgoingSessionSelection | null>(null)
  const pendingHoldSessionIds = new Set<string>()
  /** Presentation mode: карточка завешенной сессии без привязки к трубке. */
  const pinnedPresentationSessionId = ref<string | null>(null)
  const handsetState = reactive<Record<CallCardHandsetId, CallCardHandsetState>>({
    left: createDefaultHandsetState(),
    right: createDefaultHandsetState(),
  })

  const sessionLookup = computed(() => ({
    devicesSession: devicesSessionsStore.devicesSession,
    getSessionById: sessionStore.getSessionById,
    isPinnedSessionId: pinnedCallsPanelStore.isPinnedPanelSessionId,
    queueSessions: sessionStore.queueSessions.value,
    routedSessionHandsetIds: routedSessionHandsetIds.value,
  }))

  const handsetSlots = computed<CallCardHandsetSlot[]>(() =>
    getCallCardHandsetSlots(
      devicesStore.handsetDevices,
      devicesSessionsStore.getDeviceSessionKey,
    ),
  )

  const availableHandsetSlots = computed(() =>
    handsetSlots.value.filter(slot => slot.isAvailable),
  )

  const hasAvailableHandset = computed(() =>
    availableHandsetSlots.value.length > 0,
  )

  const selectedHandsetId = computed<CallCardHandsetId>(() =>
    resolveCallCardHandsetId(handsetSlots.value, requestedHandsetId.value),
  )

  const selectedHandsetSlot = computed(() =>
    getCallCardHandsetSlotById(handsetSlots.value, selectedHandsetId.value),
  )

  const selectedHandsetState = computed(() =>
    handsetState[selectedHandsetId.value],
  )

  const selectedTransferState = computed(() =>
    selectedHandsetState.value.transferState,
  )

  const selectedSessionByHandsetId = computed<CallCardHandsetSessions>(() => ({
    left: getSelectedSessionByHandsetId(CALL_CARD_HANDSET_IDS.left),
    right: getSelectedSessionByHandsetId(CALL_CARD_HANDSET_IDS.right),
  }))

  const sessionQueueByHandsetId = computed<CallCardHandsetSessionQueues>(() => ({
    left: getSessionsByHandsetId(CALL_CARD_HANDSET_IDS.left),
    right: getSessionsByHandsetId(CALL_CARD_HANDSET_IDS.right),
  }))

  const isPinnedPresentation = computed(() => Boolean(pinnedPresentationSessionId.value))

  const clearPinnedPresentation = () => {
    pinnedPresentationSessionId.value = null
  }

  const getPinnedPresentationQueue = (): RTCSessionFacade[] => {
    const sessions: RTCSessionFacade[] = []

    for (const slot of pinnedCallsPanelStore.slots) {
      const sessionId = pinnedCallsPanelStore.slotSessionIds.get(slot.order)
      if (!sessionId) continue

      const session = sessionStore.getSessionById(sessionId)
      if (session) sessions.push(session)
    }

    return sessions
  }

  const getPinnedPresentationSlot = () => {
    const sessionId = pinnedPresentationSessionId.value
    if (!sessionId) return undefined

    return pinnedCallsPanelStore.getSlotBySessionId(sessionId)
  }

  const selectedSession = computed(() => {
    const pinnedSessionId = pinnedPresentationSessionId.value
    if (pinnedSessionId) {
      return sessionStore.getSessionById(pinnedSessionId)
    }

    return selectedSessionByHandsetId.value[selectedHandsetId.value]
  })

  const selectedTransferSourceSession = computed(() =>
    getTransferSourceSessionByHandsetId(selectedHandsetId.value),
  )

  const selectedConsultationSession = computed(() =>
    getConsultationSessionByHandsetId(selectedHandsetId.value),
  )

  const selectedSessionForView = computed(() =>
    selectedConsultationSession.value
    ?? selectedTransferSourceSession.value
    ?? selectedSession.value,
  )

  const selectedSessionForCallActions = computed(() =>
    selectedConsultationSession.value ?? selectedSession.value,
  )

  const selectedSessionView = computed(() =>
    getCallCardSessionViewModel(selectedSessionForView.value),
  )

  const isSelectedTransferModeActive = computed(() =>
    Boolean(selectedTransferSourceSession.value),
  )

  const isSelectedConsultationConnected = computed(() =>
    selectedConsultationSession.value?.sessionState.value === STATE.CONNECTED,
  )

  const selectedHandsetQueue = computed(() => {
    if (pinnedPresentationSessionId.value) {
      return getPinnedPresentationQueue()
    }

    return sessionQueueByHandsetId.value[selectedHandsetId.value]
  })

  const selectedQueueVirtualPosition = computed(() =>
    selectedHandsetState.value.queueVirtualPosition,
  )

  const hasSelectedVirtualQueuePosition = computed(() =>
    Boolean(selectedQueueVirtualPosition.value && selectedHandsetQueue.value.length > 0),
  )

  const selectedDialBuffer = computed(() =>
    selectedHandsetState.value.dialBuffer,
  )

  const selectedDialContactName = computed(() =>
    selectedHandsetState.value.dialContactName,
  )

  const selectedDialSelectionStart = computed(() =>
    selectedHandsetState.value.dialSelectionStart,
  )

  const selectedDialSelectionEnd = computed(() =>
    selectedHandsetState.value.dialSelectionEnd,
  )

  const selectedTransferTargetNumber = computed(() =>
    selectedTransferState.value.targetNumber,
  )

  const selectedPanelMode = computed(() =>
    selectedHandsetState.value.panelMode,
  )

  const selectedVolume = computed(() => {
    if (pinnedPresentationSessionId.value) {
      return getPinnedPresentationSlot()?.volume ?? 1
    }

    return selectedHandsetSlot.value?.device
      ? devicesSessionsStore.getHandsetVolume(selectedHandsetSlot.value.device)
      : selectedHandsetState.value.volume
  })

  const isSelectedMuted = computed(() => {
    if (pinnedPresentationSessionId.value) {
      return !(getPinnedPresentationSlot()?.micState ?? true)
    }

    return selectedHandsetSlot.value?.device
      ? devicesSessionsStore.isHandsetMuted(selectedHandsetSlot.value.device)
      : selectedHandsetState.value.isMuted
  })

  const getFooterSessionForHandset = (
    handsetId: CallCardHandsetId,
  ): RTCSessionFacade | undefined => {
    if (isOpen.value && handsetId === selectedHandsetId.value) {
      if (handsetState[handsetId].queueVirtualPosition) return undefined

      return selectedSessionByHandsetId.value[handsetId]
    }

    return getCallCardFooterIndicatorSession(sessionQueueByHandsetId.value[handsetId])
  }

  const footerHandsetViewByHandsetId = computed<Record<
    CallCardHandsetId,
    CallCardFooterHandsetView
  >>(() => ({
    left: getCallCardFooterHandsetView(
      CALL_CARD_HANDSET_IDS.left,
      getHandsetSlotById(CALL_CARD_HANDSET_IDS.left),
      getFooterSessionForHandset(CALL_CARD_HANDSET_IDS.left),
    ),
    right: getCallCardFooterHandsetView(
      CALL_CARD_HANDSET_IDS.right,
      getHandsetSlotById(CALL_CARD_HANDSET_IDS.right),
      getFooterSessionForHandset(CALL_CARD_HANDSET_IDS.right),
    ),
  }))

  const getHandsetSlotById = (
    handsetId: CallCardHandsetId,
  ): CallCardHandsetSlot | undefined =>
    getCallCardHandsetSlotById(handsetSlots.value, handsetId)

  const getHandsetIdByDevice = (
    device: LogicalMediaDevice | null | undefined,
  ): CallCardHandsetId => {
    if (!device) return selectedHandsetId.value

    return handsetSlots.value.find(slot =>
      slot.device?.id === device.id
      || slot.device?.module === device.module
      || slot.device?.controllerDeviceId === device.controllerDeviceId,
    )?.id ?? selectedHandsetId.value
  }

  const getSessionsByHandsetId = (
    handsetId: CallCardHandsetId,
  ): RTCSessionFacade[] =>
    getCallCardSessionsForSlot(
      getHandsetSlotById(handsetId),
      sessionLookup.value,
    )

  const getSessionIdsByHandsetId = (
    handsetId: CallCardHandsetId,
  ): Set<string> =>
    new Set(getSessionsByHandsetId(handsetId).map(session => session.sessionId))

  function getActiveSessionByHandsetId (
    handsetId: CallCardHandsetId,
  ): RTCSessionFacade | undefined {
    return getCallCardActiveSessionForSlot(
      getHandsetSlotById(handsetId),
      sessionLookup.value,
    )
  }

  function getSelectedSessionByHandsetId (
    handsetId: CallCardHandsetId,
  ): RTCSessionFacade | undefined {
    if (handsetState[handsetId].queueVirtualPosition) return undefined

    return getCallCardSelectedSessionForSlot(
      getHandsetSlotById(handsetId),
      handsetState[handsetId].selectedSessionId,
      sessionLookup.value,
    )
  }

  function getTransferSourceSessionByHandsetId (
    handsetId: CallCardHandsetId,
  ): RTCSessionFacade | undefined {
    const sourceSessionId = handsetState[handsetId].transferState.sourceSessionId

    if (!sourceSessionId) return undefined

    // Сначала ищем на текущей трубке; fallback по id нужен после переброса
    // consultation, когда source A ещё может быть привязан к другой трубке.
    const sourceSession = getSessionsByHandsetId(handsetId).find(session =>
      session.sessionId === sourceSessionId,
    ) ?? sessionStore.getSessionById(sourceSessionId)
    const sourceView = getCallCardSessionViewModel(sourceSession)

    return isTransferSourceState(sourceView?.state)
      ? sourceSession
      : undefined
  }

  function getConsultationSessionByHandsetId (
    handsetId: CallCardHandsetId,
  ): RTCSessionFacade | undefined {
    const sourceSession = getTransferSourceSessionByHandsetId(handsetId)

    if (!sourceSession) return undefined

    return getSessionsByHandsetId(handsetId).find(session =>
      session.sessionId !== sourceSession.sessionId
      && session.referCallId.value === sourceSession.sessionId,
    )
  }

  const isTransferModeActiveByHandsetId = (
    handsetId: CallCardHandsetId,
  ): boolean =>
    Boolean(getTransferSourceSessionByHandsetId(handsetId))

  const hasHandsetFooterActivity = (handsetId: CallCardHandsetId): boolean =>
    Boolean(getCallCardFooterIndicatorSession(sessionQueueByHandsetId.value[handsetId]))

  const selectHandset = (handsetId: CallCardHandsetId): boolean => {
    const slot = getHandsetSlotById(handsetId)

    if (!slot) return false

    // Soft-disable: allow select/open for view when line has activity.
    if (!slot.isAvailable && !hasHandsetFooterActivity(handsetId)) return false

    requestedHandsetId.value = handsetId

    return true
  }

  const open = (): boolean => {
    if (
      !hasAvailableHandset.value
      && !hasHandsetFooterActivity(selectedHandsetId.value)
    ) {
      return false
    }

    clearPinnedPresentation()
    requestedHandsetId.value = selectedHandsetId.value
    isOpen.value = true

    return true
  }

  const hide = () => {
    cancelAllTransferModes()
    clearPinnedPresentation()
    isOpen.value = false
  }

  const openHandset = (handsetId: CallCardHandsetId): boolean => {
    if (!selectHandset(handsetId)) return false

    clearPinnedPresentation()
    requestedHandsetId.value = selectedHandsetId.value
    isOpen.value = true

    return true
  }

  const openHandsetByDevice = (
    device: LogicalMediaDevice | null | undefined,
  ): boolean =>
    openHandset(getHandsetIdByDevice(device))

  const getPanelModeForSessionId = (
    handsetId: CallCardHandsetId,
    sessionId: string,
  ): CallCardPanelMode => {
    const session = getSessionsByHandsetId(handsetId).find(item =>
      item.sessionId === sessionId,
    )
    const sessionView = getCallCardSessionViewModel(session)

    return sessionView?.state === CALL_CARD_SESSION_VIEW_STATES.incoming
      ? CALL_CARD_PANEL_MODES.dialpad
      : CALL_CARD_PANEL_MODES.queue
  }

  const setSelectedSessionId = (
    handsetId: CallCardHandsetId,
    sessionId: string | null,
  ) => {
    handsetState[handsetId].selectedSessionId = sessionId
    handsetState[handsetId].queueVirtualPosition = null

    if (sessionId) {
      setPanelMode(handsetId, getPanelModeForSessionId(handsetId, sessionId))
    }
  }

  const setSelectedHandsetSessionId = (sessionId: string | null) => {
    if (pinnedPresentationSessionId.value) {
      if (sessionId && pinnedCallsPanelStore.isPinnedPanelSessionId(sessionId)) {
        pinnedPresentationSessionId.value = sessionId
        setPanelMode(selectedHandsetId.value, CALL_CARD_PANEL_MODES.queue)
      }
      return
    }

    if (isSelectedTransferModeActive.value) return

    setSelectedSessionId(selectedHandsetId.value, sessionId)
  }

  const setQueueVirtualPosition = (
    handsetId: CallCardHandsetId,
    position: CallCardQueueVirtualPosition,
  ) => {
    handsetState[handsetId].selectedSessionId = null
    handsetState[handsetId].queueVirtualPosition = position
    setPanelMode(handsetId, CALL_CARD_PANEL_MODES.queue)
  }

  const openSession = (
    handsetId: CallCardHandsetId,
    sessionId: string,
  ): boolean => {
    setSelectedSessionId(handsetId, sessionId)
    clearDialBuffer(handsetId)

    return openHandset(handsetId)
  }

  const openSessionInPreferredHandset = (sessionId: string): boolean => {
    const handsetId = CALL_CARD_HANDSET_ID_LIST.find(id =>
      getSessionsByHandsetId(id).some(session => session.sessionId === sessionId),
    ) ?? selectedHandsetId.value
    return openSession(handsetId, sessionId)
  }

  /** Открыть call card для сессии завешенного слота (без handset bind). */
  const openPinnedPanelSession = (sessionId: string): boolean => {
    if (!pinnedCallsPanelStore.isPinnedPanelSessionId(sessionId)) return false
    if (!sessionStore.getSessionById(sessionId)) return false

    const slot = pinnedCallsPanelStore.getSlotBySessionId(sessionId)
    if (slot) pinnedCallsPanelStore.setActiveSlot(slot.order)

    cancelAllTransferModes()
    pinnedPresentationSessionId.value = sessionId
    setPanelMode(selectedHandsetId.value, CALL_CARD_PANEL_MODES.queue)
    isOpen.value = true

    return true
  }

  const getOtherAvailableHandsetId = (
    sourceHandsetId: CallCardHandsetId,
  ): CallCardHandsetId | null =>
    CALL_CARD_HANDSET_ID_LIST.find(id =>
      id !== sourceHandsetId
      && Boolean(getHandsetSlotById(id)?.isAvailable),
    ) ?? null

  const transferSelectedSessionToOtherHandset = (): boolean => {
    const { showNotification } = useNotification()

    if (pinnedPresentationSessionId.value) return false

    const sourceHandsetId = selectedHandsetId.value
    const consultationSession = getConsultationSessionByHandsetId(sourceHandsetId)
    const sourceTransferState = handsetState[sourceHandsetId].transferState
    const transferSourceSession = getTransferSourceSessionByHandsetId(sourceHandsetId)
    const session = consultationSession ?? selectedSession.value
    const targetHandsetId = getOtherAvailableHandsetId(sourceHandsetId)
    const targetSlot = targetHandsetId
      ? getHandsetSlotById(targetHandsetId)
      : undefined

    if (!session || !targetHandsetId || !targetSlot?.device || !targetSlot.isAvailable) return false

    if (isTransferModeActiveByHandsetId(targetHandsetId)) {
      showNotification({
        type: 'error',
        message: 'На другой трубке уже активен перевод вызова',
      })
      return false
    }

    const sessionView = getCallCardSessionViewModel(session)
    const isIncomingRinging = sessionView?.state === CALL_CARD_SESSION_VIEW_STATES.incoming
    const isConsultationTransfer = Boolean(consultationSession)
      || sourceTransferState.consultationStage !== 'idle'
    const shouldMoveTransferState = isConsultationTransfer
      || sourceTransferState.sourceSessionId === session.sessionId

    // Incoming до answer: только affinity (без hold/media). Остальное — полный bind.
    if (isIncomingRinging) {
      devicesSessionsStore.bindSessionDeviceAffinity(session.sessionId, targetSlot.device.id)
    } else {
      devicesSessionsStore.bindSessionToDevice(session.sessionId, targetSlot.device.id)
    }

    // Consultation: source A тоже переносим на целевую трубку, чтобы flow не развалился.
    if (
      isConsultationTransfer
      && transferSourceSession
      && transferSourceSession.sessionId !== session.sessionId
    ) {
      devicesSessionsStore.bindSessionToDevice(
        transferSourceSession.sessionId,
        targetSlot.device.id,
      )
      clearRoutedSessionHandsetId(transferSourceSession.sessionId)
    }

    clearRoutedSessionHandsetId(session.sessionId)
    setSelectedSessionId(sourceHandsetId, null)
    setSelectedSessionId(targetHandsetId, session.sessionId)

    if (shouldMoveTransferState) {
      handsetState[targetHandsetId].transferState = { ...sourceTransferState }
      cancelTransferMode(sourceHandsetId)

      if (isConsultationTransfer) {
        setPanelMode(targetHandsetId, CALL_CARD_PANEL_MODES.dialpad)
      }
    }

    return openHandset(targetHandsetId)
  }


  const toggleSelectedSessionHold = (): boolean => {
    const session = selectedSessionForCallActions.value

    if (!session) return false

    const view = getCallCardSessionViewModel(session)

    if (!view) return false
    if (!view.actions.canHold && !view.actions.canUnhold) return false

    void session.toggleHold()

    return true
  }

  const canMoveSelectedSessionToPinnedPanel = computed(() => {
    if (pinnedPresentationSessionId.value) return false

    const session = selectedSession.value
    if (!session) return false
    if (pinnedCallsPanelStore.isPinnedPanelSessionId(session.sessionId)) return false

    return pinnedCallsPanelStore.hasFreeSlot
  })

  const moveSelectedSessionToPinnedPanel = async (): Promise<boolean> => {
    const { showNotification } = useNotification()

    if (pinnedPresentationSessionId.value) return false

    const session = selectedSession.value
    if (!session) return false

    if (pinnedCallsPanelStore.isPinnedPanelSessionId(session.sessionId)) return false

    const order = pinnedCallsPanelStore.getFirstFreeSlotOrder()
    if (order == null) {
      showNotification({
        type: 'error',
        message: 'Нет свободных слотов завешенных линий',
      })
      return false
    }

    const pServed = session.pServed
    const title = session.contact?.name
      || getPinnedCallPServedKey(pServed)
      || session.number

    try {
      await pinnedCallsPanelStore.upsertSlot(order, {
        pServed,
        slotIndex: pinnedCallsPanelStore.getNextSlotIndex(pServed),
        title,
        volume: PINNED_CALLS_INITIAL_VOLUME,
        prevVolume: PINNED_CALLS_INITIAL_VOLUME,
        micState: PINNED_CALLS_INITIAL_MIC_STATE,
        prevMicState: PINNED_CALLS_INITIAL_MIC_STATE,
      })
    } catch (e) {
      console.error('Failed to upsert pinned slot from call card', e)
      showNotification({
        type: 'error',
        message: 'Не удалось добавить в завешенные линии',
      })
      return false
    }

    pinnedCallsPanelStore.assignSessionToSlot(order, session.sessionId)
    pinnedCallsPanelStore.setActiveSlot(order)

    const goose = useDevicesStore().readyPreferredGoose
    if (goose) {
      try {
        if (session.session?.connection) {
          devicesSessionsStore.bindSessionToDevice(session.sessionId, goose.id, {
            holdOthers: false,
          })
        } else {
          devicesSessionsStore.bindSessionDeviceAffinity(session.sessionId, goose.id)
        }
      } catch (e) {
        console.error('Failed to bind pinned session to goose from call card', e)
      }
    }

    // Сессия ушла из handset queue — сбрасываем выбор на трубке.
    setSelectedSessionId(selectedHandsetId.value, null)
    clearRoutedSessionHandsetId(session.sessionId)

    return true
  }

  const resolvePendingOutgoingSessionSelection = () => {
    const pending = pendingOutgoingSessionSelection.value

    if (!pending) return

    const session = getSessionsByHandsetId(pending.handsetId).find(item =>
      item.direction === 'outgoing'
      && item.number.trim() === pending.number
      && !pending.knownSessionIds.has(item.sessionId),
    )

    if (!session) return

    setSelectedSessionId(pending.handsetId, session.sessionId)
    pendingOutgoingSessionSelection.value = null
  }

  const setPendingOutgoingSessionSelection = (
    handsetId: CallCardHandsetId,
    number: string,
    knownSessionIds: Set<string>,
  ) => {
    pendingOutgoingSessionSelection.value = {
      handsetId,
      knownSessionIds,
      number: number.trim(),
    }

    resolvePendingOutgoingSessionSelection()
  }

  const setPanelMode = (
    handsetId: CallCardHandsetId,
    mode: CallCardPanelMode,
  ) => {
    handsetState[handsetId].panelMode = mode
  }

  const setSelectedPanelMode = (mode: CallCardPanelMode) => {
    // У завешенных нет history.
    if (
      pinnedPresentationSessionId.value
      && mode === CALL_CARD_PANEL_MODES.history
    ) {
      return
    }

    setPanelMode(selectedHandsetId.value, mode)
  }

  const cancelTransferMode = (handsetId: CallCardHandsetId) => {
    handsetState[handsetId].transferState = createDefaultTransferState()
  }

  const cancelSelectedTransferMode = () => {
    cancelTransferMode(selectedHandsetId.value)
  }

  const cancelAllTransferModes = () => {
    CALL_CARD_HANDSET_ID_LIST.forEach(cancelTransferMode)
  }

  const startTransferMode = (handsetId: CallCardHandsetId): boolean => {
    const sourceSession = getSelectedSessionByHandsetId(handsetId)
    const sourceView = getCallCardSessionViewModel(sourceSession)

    if (
      !sourceSession
      || !isTransferSourceState(sourceView?.state)
    ) {
      return false
    }

    handsetState[handsetId].transferState = {
      ...createDefaultTransferState(),
      sourceSessionId: sourceSession.sessionId,
    }
    setPanelMode(handsetId, CALL_CARD_PANEL_MODES.queue)

    return true
  }

  const startSelectedTransferMode = (): boolean => {
    if (pinnedPresentationSessionId.value) return false

    return startTransferMode(selectedHandsetId.value)
  }

  const toggleSelectedTransferMode = (): boolean => {
    if (isSelectedTransferModeActive.value) {
      cancelSelectedTransferMode()
      return true
    }

    return startSelectedTransferMode()
  }

  const getQueuePositionByHandsetId = (handsetId: CallCardHandsetId): number => {
    const queue = sessionQueueByHandsetId.value[handsetId]
    const virtualPosition = handsetState[handsetId].queueVirtualPosition

    if (!queue.length) return 0
    if (virtualPosition === 'before') return 0
    if (virtualPosition === 'after') return queue.length + 1

    const selectedSessionId = selectedSessionByHandsetId.value[handsetId]?.sessionId
    const selectedIndex = queue.findIndex(session =>
      session.sessionId === selectedSessionId,
    )

    return selectedIndex >= 0 ? selectedIndex + 1 : 1
  }

  const getPinnedPresentationQueuePosition = (): number => {
    const queue = getPinnedPresentationQueue()
    const sessionId = pinnedPresentationSessionId.value

    if (!queue.length || !sessionId) return 0

    const selectedIndex = queue.findIndex(session => session.sessionId === sessionId)

    return selectedIndex >= 0 ? selectedIndex + 1 : 1
  }

  const selectPinnedPresentationQueuePosition = (position: number): boolean => {
    const queue = getPinnedPresentationQueue()
    const session = queue[position - 1]

    if (!session) return false

    pinnedPresentationSessionId.value = session.sessionId
    setPanelMode(selectedHandsetId.value, CALL_CARD_PANEL_MODES.queue)

    return true
  }

  const selectQueuePosition = (
    handsetId: CallCardHandsetId,
    position: number,
  ): boolean => {
    if (isTransferModeActiveByHandsetId(handsetId)) return false

    const queue = sessionQueueByHandsetId.value[handsetId]

    if (!queue.length) {
      setSelectedSessionId(handsetId, null)
      setPanelMode(handsetId, CALL_CARD_PANEL_MODES.dialpad)
      return false
    }

    if (position <= 0) {
      setQueueVirtualPosition(handsetId, 'before')
      return true
    }

    if (position > queue.length) {
      setQueueVirtualPosition(handsetId, 'after')
      return true
    }

    const session = queue[position - 1]

    if (!session) return false

    setSelectedSessionId(handsetId, session.sessionId)

    return true
  }

  const selectPreviousQueuePosition = (handsetId: CallCardHandsetId): boolean => {
    const currentPosition = getQueuePositionByHandsetId(handsetId)

    if (currentPosition <= 0) return false

    return selectQueuePosition(handsetId, currentPosition - 1)
  }

  const selectNextQueuePosition = (handsetId: CallCardHandsetId): boolean => {
    const currentPosition = getQueuePositionByHandsetId(handsetId)
    const total = sessionQueueByHandsetId.value[handsetId].length

    if (!total || currentPosition >= total + 1) return false

    return selectQueuePosition(handsetId, currentPosition + 1)
  }

  const selectPreviousSelectedQueuePosition = (): boolean => {
    if (pinnedPresentationSessionId.value) {
      const currentPosition = getPinnedPresentationQueuePosition()
      if (currentPosition <= 1) return false

      return selectPinnedPresentationQueuePosition(currentPosition - 1)
    }

    return selectPreviousQueuePosition(selectedHandsetId.value)
  }

  const selectNextSelectedQueuePosition = (): boolean => {
    if (pinnedPresentationSessionId.value) {
      const currentPosition = getPinnedPresentationQueuePosition()
      const total = getPinnedPresentationQueue().length
      if (!total || currentPosition >= total) return false

      return selectPinnedPresentationQueuePosition(currentPosition + 1)
    }

    return selectNextQueuePosition(selectedHandsetId.value)
  }

  const selectedQueuePosition = computed(() => {
    if (pinnedPresentationSessionId.value) {
      return getPinnedPresentationQueuePosition()
    }

    return getQueuePositionByHandsetId(selectedHandsetId.value)
  })

  const selectedQueueTotal = computed(() =>
    selectedHandsetQueue.value.length,
  )

  const canSelectPreviousQueuePosition = computed(() => {
    if (pinnedPresentationSessionId.value) {
      return selectedQueueTotal.value > 0 && selectedQueuePosition.value > 1
    }

    return selectedQueueTotal.value > 0 && selectedQueuePosition.value > 0
  })

  const canSelectNextQueuePosition = computed(() => {
    if (pinnedPresentationSessionId.value) {
      return selectedQueueTotal.value > 0
        && selectedQueuePosition.value < selectedQueueTotal.value
    }

    return selectedQueueTotal.value > 0
      && selectedQueuePosition.value < selectedQueueTotal.value + 1
  })

  const getDialTextState = (
    handsetId: CallCardHandsetId,
  ): CallCardEditableTextState => ({
    value: handsetState[handsetId].dialBuffer,
    selectionStart: handsetState[handsetId].dialSelectionStart,
    selectionEnd: handsetState[handsetId].dialSelectionEnd,
  })

  const applyDialTextState = (
    handsetId: CallCardHandsetId,
    state: CallCardEditableTextState,
  ) => {
    handsetState[handsetId].dialBuffer = state.value
    handsetState[handsetId].dialSelectionStart = state.selectionStart
    handsetState[handsetId].dialSelectionEnd = state.selectionEnd
  }

  const getTransferTargetTextState = (
    handsetId: CallCardHandsetId,
  ): CallCardEditableTextState => {
    const transferState = handsetState[handsetId].transferState

    return {
      value: transferState.targetNumber,
      selectionStart: transferState.targetSelectionStart,
      selectionEnd: transferState.targetSelectionEnd,
    }
  }

  const applyTransferTargetTextState = (
    handsetId: CallCardHandsetId,
    state: CallCardEditableTextState,
  ) => {
    const transferState = handsetState[handsetId].transferState

    transferState.targetNumber = state.value
    transferState.targetSelectionStart = state.selectionStart
    transferState.targetSelectionEnd = state.selectionEnd
  }

  const setDialBuffer = (
    handsetId: CallCardHandsetId,
    value: string,
  ) => {
    applyDialTextState(handsetId, {
      value,
      selectionStart: value.length,
      selectionEnd: value.length,
    })
  }

  const setSelectedDialBuffer = (value: string) => {
    setDialBuffer(selectedHandsetId.value, value)
  }

  const setDialContactName = (
    handsetId: CallCardHandsetId,
    value: string,
  ) => {
    handsetState[handsetId].dialContactName = value
  }

  const setSelectedDialContactName = (value: string) => {
    setDialContactName(selectedHandsetId.value, value)
  }

  const setDialTarget = (
    handsetId: CallCardHandsetId,
    payload: { number: string, name?: string },
  ) => {
    setDialBuffer(handsetId, payload.number)
    handsetState[handsetId].dialContactName = payload.name ?? ''
  }

  const setSelectedDialTarget = (payload: { number: string, name?: string }) => {
    setDialTarget(selectedHandsetId.value, payload)
  }

  const setDialSelection = (
    handsetId: CallCardHandsetId,
    payload: CallCardTextSelection,
  ) => {
    applyDialTextState(
      handsetId,
      setTextSelection(getDialTextState(handsetId), payload),
    )
  }

  const setSelectedDialSelection = (
    payload: CallCardTextSelection,
  ) => {
    setDialSelection(selectedHandsetId.value, payload)
  }

  const insertDialText = (
    handsetId: CallCardHandsetId,
    value: string,
    payload?: CallCardTextSelectionPayload,
  ) => {
    applyDialTextState(
      handsetId,
      insertText(getDialTextState(handsetId), value, payload),
    )
    handsetState[handsetId].dialContactName = ''
  }

  const insertSelectedDialText = (
    value: string,
    payload?: CallCardTextSelectionPayload,
  ) => {
    insertDialText(selectedHandsetId.value, value, payload)
  }

  const insertDialTextFromHandsetDevice = (
    device: LogicalMediaDevice | null | undefined,
    value: string,
  ): boolean => {
    const handsetId = getHandsetIdByDevice(device)

    setPanelMode(handsetId, CALL_CARD_PANEL_MODES.dialpad)
    if (!openHandset(handsetId)) return false

    insertDialText(handsetId, value)

    return true
  }

  const clearDialBuffer = (handsetId: CallCardHandsetId) => {
    applyDialTextState(handsetId, clearText())
    handsetState[handsetId].dialContactName = ''
  }

  const setTransferTarget = (
    handsetId: CallCardHandsetId,
    payload: { number: string, name?: string, sessionId?: string | null },
  ) => {
    const transferState = handsetState[handsetId].transferState

    applyTransferTargetTextState(handsetId, {
      value: payload.number,
      selectionStart: payload.number.length,
      selectionEnd: payload.number.length,
    })
    transferState.targetName = payload.name ?? ''
    transferState.targetSessionId = payload.sessionId ?? null
  }

  const setSelectedTransferTarget = (
    payload: { number: string, name?: string, sessionId?: string | null },
  ) => {
    setTransferTarget(selectedHandsetId.value, payload)
  }

  const setTransferTargetSession = (
    handsetId: CallCardHandsetId,
    sessionId: string,
  ): boolean => {
    const sourceSessionId = handsetState[handsetId].transferState.sourceSessionId
    const targetSession = getSessionsByHandsetId(handsetId).find(session =>
      session.sessionId === sessionId,
    )
    const targetView = getCallCardSessionViewModel(targetSession)

    if (!targetSession || !targetView || sourceSessionId === sessionId) return false

    setTransferTarget(handsetId, {
      name: targetView.name,
      number: targetView.number,
      sessionId,
    })
    setPanelMode(handsetId, CALL_CARD_PANEL_MODES.dialpad)

    return true
  }

  const setSelectedTransferTargetSession = (sessionId: string): boolean =>
    setTransferTargetSession(selectedHandsetId.value, sessionId)

  const setTransferTargetSelection = (
    handsetId: CallCardHandsetId,
    payload: CallCardTextSelection,
  ) => {
    applyTransferTargetTextState(
      handsetId,
      setTextSelection(getTransferTargetTextState(handsetId), payload),
    )
  }

  const setSelectedTransferTargetSelection = (
    payload: CallCardTextSelection,
  ) => {
    setTransferTargetSelection(selectedHandsetId.value, payload)
  }

  const insertTransferTargetText = (
    handsetId: CallCardHandsetId,
    value: string,
    payload?: CallCardTextSelectionPayload,
  ) => {
    const transferState = handsetState[handsetId].transferState

    applyTransferTargetTextState(
      handsetId,
      insertText(getTransferTargetTextState(handsetId), value, payload),
    )
    transferState.targetName = ''
    transferState.targetSessionId = null
  }

  const insertSelectedTransferTargetText = (
    value: string,
    payload?: CallCardTextSelectionPayload,
  ) => {
    insertTransferTargetText(selectedHandsetId.value, value, payload)
  }

  const executeBlindTransfer = (handsetId: CallCardHandsetId): boolean => {
    const { currentUser } = useAppStore()
    const { showNotification } = useNotification()
    const transferState = handsetState[handsetId].transferState
    const sourceSession = getTransferSourceSessionByHandsetId(handsetId)
    const targetNumber = transferState.targetNumber.trim()

    if (!sourceSession || !targetNumber) return false

    if (currentUser?.internalNumber === targetNumber) {
      showNotification({
        type: 'error',
        message: 'Нельзя перевести на самого себя',
      })
      return false
    }

    const targetSession = transferState.targetSessionId
      ? sessionStore.getSessionById(transferState.targetSessionId)
      : undefined
    const referConfig = targetSession && targetSession.sessionId !== sourceSession.sessionId
      ? { toSession: targetSession }
      : { targetNumber }

    try {
      sourceSession.refer(referConfig, (result) => {
        if (result.type === ReferResultType.SUCCESS) {
          cancelTransferMode(handsetId)
          return
        }

        console.error('Call card blind transfer failed:', result.message)
      })
    } catch (error) {
      console.error('Call card blind transfer failed:', error)
      return false
    }

    return true
  }

  const executeSelectedBlindTransfer = (): boolean =>
    executeBlindTransfer(selectedHandsetId.value)

  const startOutgoingCallFromHandset = (
    handsetId: CallCardHandsetId,
    number: string,
    options: {
      extraHeaders?: string[]
      panelModeOnSuccess?: CallCardPanelMode
    } = {},
  ): boolean => {
    if (!number.trim()) return false

    const knownSessionIds = getSessionIdsByHandsetId(handsetId)
    const result = startCallCardOutgoingCall({
      extraHeaders: options.extraHeaders,
      handsetSlot: getHandsetSlotById(handsetId),
      number,
    })


    if (result) {
      clearDialBuffer(handsetId)
      setPendingOutgoingSessionSelection(handsetId, number, knownSessionIds)
      setPanelMode(
        handsetId,
        options.panelModeOnSuccess ?? CALL_CARD_PANEL_MODES.queue,
      )
    }

    return result
  }

  const startConsultationCallFromHandset = (
    handsetId: CallCardHandsetId,
  ): boolean => {
    const { currentUser } = useAppStore()
    const { showNotification } = useNotification()
    const transferState = handsetState[handsetId].transferState
    const sourceSession = getTransferSourceSessionByHandsetId(handsetId)
    const targetNumber = transferState.targetNumber.trim()

    if (!sourceSession || !targetNumber) return false

    if (transferState.targetSessionId) {
      showNotification({
        type: 'error',
        message: 'Сессия с этим абонентом уже есть. Используйте слепой перевод',
      })
      return false
    }

    if (currentUser?.internalNumber === targetNumber) {
      showNotification({
        type: 'error',
        message: 'Нельзя вызвать самого себя',
      })
      return false
    }

    void sourceSession.toggleHold(true)

    const result = startOutgoingCallFromHandset(handsetId, targetNumber, {
      extraHeaders: [`Refer-Call:${sourceSession.sessionId}`],
      panelModeOnSuccess: CALL_CARD_PANEL_MODES.dialpad,
    })

    if (result) {
      transferState.consultationStage = 'starting'
    }

    return result
  }

  const startSelectedConsultationCall = (): boolean =>
    startConsultationCallFromHandset(selectedHandsetId.value)

  const restoreSourceSessionAfterConsultation = (
    handsetId: CallCardHandsetId,
  ) => {
    const sourceSession = getTransferSourceSessionByHandsetId(handsetId)

    cancelTransferMode(handsetId)

    if (!sourceSession) return

    setSelectedSessionId(handsetId, sourceSession.sessionId)
    setPanelMode(handsetId, CALL_CARD_PANEL_MODES.queue)
  }

  const cancelConsultationCallFromHandset = (
    handsetId: CallCardHandsetId,
  ): boolean => {
    const transferState = handsetState[handsetId].transferState
    const consultationSession = getConsultationSessionByHandsetId(handsetId)

    if (transferState.consultationStage === 'idle') return false

    consultationSession?.terminate()
    restoreSourceSessionAfterConsultation(handsetId)

    return true
  }

  const cancelSelectedConsultationCall = (): boolean =>
    cancelConsultationCallFromHandset(selectedHandsetId.value)

  const executeConsultationMergeFromHandset = (
    handsetId: CallCardHandsetId,
  ): boolean => {
    const sourceSession = getTransferSourceSessionByHandsetId(handsetId)
    const consultationSession = getConsultationSessionByHandsetId(handsetId)

    if (
      !sourceSession
      || !consultationSession
      || consultationSession.sessionState.value !== STATE.CONNECTED
    ) {
      return false
    }

    try {
      consultationSession.refer({ toSession: sourceSession }, (result) => {
        if (result.type === ReferResultType.SUCCESS) {
          cancelTransferMode(handsetId)
          return
        }

        console.error('Call card consultation merge failed:', result.message)
      })
    } catch (error) {
      console.error('Call card consultation merge failed:', error)
      return false
    }

    return true
  }

  const executeSelectedConsultationMerge = (): boolean =>
    executeConsultationMergeFromHandset(selectedHandsetId.value)

  const callSelectedDialNumber = (): boolean => {
    const handsetId = selectedHandsetId.value
    const number = handsetState[handsetId].dialBuffer

    return startOutgoingCallFromHandset(handsetId, number)
  }

  const callNumberFromSelectedHandset = (payload: {
    number: string
    name?: string
  }): boolean => {
    setSelectedPanelMode(CALL_CARD_PANEL_MODES.dialpad)

    if (!open()) return false

    const handsetId = selectedHandsetId.value

    return startOutgoingCallFromHandset(handsetId, payload.number)
  }

  const callDialNumberFromHandsetDevice = (
    device: LogicalMediaDevice | null | undefined,
  ): boolean => {
    const handsetId = getHandsetIdByDevice(device)
    const number = handsetState[handsetId].dialBuffer

    if (!number.trim() || !openHandset(handsetId)) return false

    return startOutgoingCallFromHandset(handsetId, number)
  }

  const answerSelectedSession = (): boolean => {
    const session = selectedSession.value
    const sessionView = selectedSessionView.value
    const device = selectedHandsetSlot.value?.device

    if (
      !session
      || sessionView?.state !== CALL_CARD_SESSION_VIEW_STATES.incoming
      || !device
    ) {
      return false
    }

    if (!isUsableForMediaDevice(device)) {
      notifyMediaDeviceUnavailableForCall()
      return false
    }

    const activeSession = getActiveSessionByHandsetId(selectedHandsetId.value)

    if (activeSession && activeSession.sessionId !== session.sessionId) {
      void activeSession.toggleHold(true)
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

    session.answer({ mediaConstraints }, device)

    return true
  }

  const setHandsetMuted = (
    handsetId: CallCardHandsetId,
    isMuted: boolean,
  ) => {
    handsetState[handsetId].isMuted = isMuted

    const device = getHandsetSlotById(handsetId)?.device

    if (!device) return

    devicesSessionsStore.setHandsetMutedState({
      device,
      state: isMuted ? ControllerEvents.MUTED : ControllerEvents.UNMUTED,
    })
  }

  const setSelectedHandsetMuted = (isMuted: boolean) => {
    if (pinnedPresentationSessionId.value) {
      // WUI-3825: в PTT activePinned mic только через аппаратную speak.
      if (pinnedCallsPanelStore.isActivePinnedPushToTalkMode()) return

      const slot = getPinnedPresentationSlot()
      if (!slot) return

      pinnedCallsPanelStore.patchSlotRuntimeAudio(slot.order, {
        micState: !isMuted,
      })
      return
    }

    setHandsetMuted(selectedHandsetId.value, isMuted)
  }

  const setHandsetVolume = (
    handsetId: CallCardHandsetId,
    value: number,
  ) => {
    const volume = clampVolume(value)

    handsetState[handsetId].volume = volume

    const device = getHandsetSlotById(handsetId)?.device

    if (!device) return

    devicesSessionsStore.setHandsetVolume(device, volume)
  }

  const setSelectedHandsetVolume = (value: number) => {
    if (pinnedPresentationSessionId.value) {
      const slot = getPinnedPresentationSlot()
      if (!slot) return

      pinnedCallsPanelStore.patchSlotRuntimeAudio(slot.order, { volume: value })
      return
    }

    setHandsetVolume(selectedHandsetId.value, value)
  }

  const clearRoutedSessionHandsetId = (sessionId: string) => {
    const nextRouting = new Map(routedSessionHandsetIds.value)

    nextRouting.delete(sessionId)
    routedSessionHandsetIds.value = nextRouting
  }

  const routeIncomingSessions = () => {
    routedSessionHandsetIds.value = routeCallCardIncomingSessions({
      devicesSession: devicesSessionsStore.devicesSession,
      isPinnedSessionId: pinnedCallsPanelStore.isPinnedPanelSessionId,
      queueSessions: sessionStore.queueSessions.value,
      routedSessionHandsetIds: routedSessionHandsetIds.value,
      targetHandsetId: hasAvailableHandset.value ? selectedHandsetId.value : null,
    })
  }

  const getQueueSessionsWatchKey = () =>
    sessionStore.queueSessions.value.map(session => [
      session.sessionId,
      session.direction,
      session.sessionState.value,
      session.currentDevice.value?.id ?? '',
    ].join(':')).join('|')

  const getDevicesSessionWatchKey = () =>
    Array.from(devicesSessionsStore.devicesSession.entries())
      .map(([deviceKey, sessionIds]) => `${deviceKey}:${sessionIds.join(',')}`)
      .join('|')

  const getIncomingSessionForVirtualSlot = (
    sessions: readonly RTCSessionFacade[],
  ): RTCSessionFacade | undefined =>
    sessions.find(session =>
      session.direction === 'incoming'
      && (
        session.sessionState.value === STATE.RINGING
        || session.sessionState.value === STATE.INITIAL
        || session.sessionState.value === STATE.PROGRESS
      ),
    )


  const holdConnectedSession = (session: RTCSessionFacade) => {
    if (
      session.sessionState.value !== STATE.CONNECTED
      || pendingHoldSessionIds.has(session.sessionId)
    ) {
      return
    }

    pendingHoldSessionIds.add(session.sessionId)

    try {
      void Promise
        .resolve(session.toggleHold(true))
        .finally(() => pendingHoldSessionIds.delete(session.sessionId))
    } catch {
      pendingHoldSessionIds.delete(session.sessionId)
    }
  }

  const enforceSingleActiveSessionByHandsetId = (
    handsetId: CallCardHandsetId,
  ) => {
    const connectedSessions = sessionQueueByHandsetId.value[handsetId]
      .filter(session => session.sessionState.value === STATE.CONNECTED)

    if (connectedSessions.length < 2) return

    const selectedSessionId = selectedSessionByHandsetId.value[handsetId]?.sessionId
    const sessionToKeepActive = connectedSessions.find(session =>
      session.sessionId === selectedSessionId,
    ) ?? connectedSessions.at(-1)

    if (!sessionToKeepActive) return

    connectedSessions
      .filter(session => session.sessionId !== sessionToKeepActive.sessionId)
      .forEach(holdConnectedSession)
  }

  const enforceSingleActiveSessionPerHandset = () => {
    CALL_CARD_HANDSET_ID_LIST.forEach(enforceSingleActiveSessionByHandsetId)
  }

  const resetInvalidTransferModes = () => {
    CALL_CARD_HANDSET_ID_LIST.forEach((handsetId) => {
      const transferState = handsetState[handsetId].transferState
      const sourceSessionId = transferState.sourceSessionId

      if (!sourceSessionId) return
      if (getTransferSourceSessionByHandsetId(handsetId)) return

      cancelTransferMode(handsetId)
    })
  }

  watch(
    handsetSlots,
    () => {
      requestedHandsetId.value = selectedHandsetId.value
    },
    { immediate: true },
  )

  watch(
    [
      getQueueSessionsWatchKey,
      getDevicesSessionWatchKey,
      () => selectedHandsetId.value,
      () => hasAvailableHandset.value,
    ],
    routeIncomingSessions,
    { immediate: true },
  )

  watch(
    [
      getQueueSessionsWatchKey,
      getDevicesSessionWatchKey,
    ],
    enforceSingleActiveSessionPerHandset,
    { immediate: true },
  )

  watch(
    [
      getQueueSessionsWatchKey,
      () => selectedHandsetId.value,
    ],
    resetInvalidTransferModes,
    { immediate: true },
  )

  watch(
    sessionQueueByHandsetId,
    (queues) => {
      CALL_CARD_HANDSET_ID_LIST.forEach((handsetId) => {
        const queue = queues[handsetId]
        const virtualPosition = handsetState[handsetId].queueVirtualPosition
        const selectedSessionId = handsetState[handsetId].selectedSessionId
        const transferState = handsetState[handsetId].transferState

        if (virtualPosition && !queue.length) {
          setSelectedSessionId(handsetId, null)
          setPanelMode(handsetId, CALL_CARD_PANEL_MODES.dialpad)
          return
        }

        if (virtualPosition) {
          const incomingSession = getIncomingSessionForVirtualSlot(queue)

          if (incomingSession) {
            setSelectedSessionId(handsetId, incomingSession.sessionId)
          }

          return
        }

        if (
          selectedSessionId
          && !queue.some(session => session.sessionId === selectedSessionId)
        ) {
          setSelectedSessionId(handsetId, null)
        }

        const consultationSession = getConsultationSessionByHandsetId(handsetId)

        if (consultationSession) {
          transferState.consultationStage = 'active'
          return
        }

        if (transferState.consultationStage === 'active') {
          restoreSourceSessionAfterConsultation(handsetId)
        }
      })

      resolvePendingOutgoingSessionSelection()
    },
  )

  watch(
    selectedSessionByHandsetId,
    (sessions, previousSessions) => {
      CALL_CARD_HANDSET_ID_LIST.forEach((handsetId) => {
        if (!sessions[handsetId]) {
          if (handsetState[handsetId].queueVirtualPosition) return

          if (
            previousSessions[handsetId]
            && handsetState[handsetId].panelMode === CALL_CARD_PANEL_MODES.queue
          ) {
            setPanelMode(handsetId, CALL_CARD_PANEL_MODES.dialpad)
          }

          return
        }

        clearDialBuffer(handsetId)
      })

      resolvePendingOutgoingSessionSelection()
    },
  )

  watch(
    () => {
      const sessionId = pinnedPresentationSessionId.value
      if (!sessionId) return false

      return pinnedCallsPanelStore.isPinnedPanelSessionId(sessionId)
        && Boolean(sessionStore.getSessionById(sessionId))
    },
    (isValid) => {
      if (!pinnedPresentationSessionId.value) return
      if (!isValid) hide()
    },
  )

  watch(pinnedPresentationSessionId, (sessionId) => {
    if (!sessionId) return
    if (!pinnedCallsPanelStore.isPinnedPanelSessionId(sessionId)) return

    const slot = pinnedCallsPanelStore.getSlotBySessionId(sessionId)
    if (slot) pinnedCallsPanelStore.setActiveSlot(slot.order)
  })

  return {
    answerSelectedSession,
    availableHandsetSlots,
    callNumberFromSelectedHandset, // Открывает карточку и звонит на переданный номер с выбранной трубки
    callDialNumberFromHandsetDevice, // Звонит по буферу трубки, найденной по device
    callSelectedDialNumber, // Звонит по буферу выбранной трубки
    canSelectNextQueuePosition,
    canSelectPreviousQueuePosition,
    canMoveSelectedSessionToPinnedPanel,
    cancelSelectedConsultationCall,
    executeSelectedConsultationMerge,
    executeSelectedBlindTransfer, // Выполняет слепой перевод выбранной source-сессии на target
    footerHandsetViewByHandsetId, // Возвращает готовую view-model footer-кнопок трубок
    handsetSlots,
    hasAvailableHandset,
    hide, // Скрывает карточку вызова и сбрасывает временный режим перевода
    insertDialTextFromHandsetDevice, // Открывает карточку нужной трубки и вставляет символ с контроллера
    insertSelectedDialText, // Вставляет текст в буфер выбранной трубки с учетом курсора
    insertSelectedTransferTargetText, // Вставляет текст в цель перевода выбранной трубки
    isOpen,
    isPinnedPresentation,
    isSelectedMuted,
    hasSelectedVirtualQueuePosition,
    isSelectedTransferModeActive,
    moveSelectedSessionToPinnedPanel, // Переносит выбранную сессию трубки в свободный слот завешенных
    open, // Открывает карточку для текущей доступной трубки
    openHandset, // Выбирает трубку и открывает ее карточку
    openHandsetByDevice, // Открывает карточку трубки, найденной по device
    openPinnedPanelSession, // Открывает карточку завешенной сессии без handset bind
    openSessionInPreferredHandset, // Находит трубку сессии и открывает ее карточку
    selectNextSelectedQueuePosition, // Выбирает следующую позицию очереди выбранной трубки
    selectPreviousSelectedQueuePosition, // Выбирает предыдущую позицию очереди выбранной трубки
    selectedDialBuffer,
    selectedDialContactName,
    selectedDialSelectionEnd,
    selectedDialSelectionStart,
    selectedHandsetId,
    selectedHandsetSlot,
    selectedHandsetQueue,
    selectedConsultationSession,
    selectedPanelMode,
    selectedQueuePosition,
    selectedQueueTotal,
    selectedSession,
    selectedTransferSourceSession,
    selectedSessionView,
    selectedTransferState,
    selectedTransferTargetNumber,
    selectedVolume,
    startSelectedConsultationCall,
    isSelectedConsultationConnected,
    setSelectedDialBuffer, // Устанавливает буфер набора выбранной трубки
    setSelectedDialContactName, // Устанавливает имя контакта для выбранной трубки
    setSelectedDialSelection, // Сохраняет позицию курсора в буфере выбранной трубки
    setSelectedHandsetMuted, // Меняет mute-состояние выбранной трубки
    setSelectedHandsetSessionId, // Выбирает сессию в очереди выбранной трубки
    setSelectedHandsetVolume, // Меняет громкость выбранной трубки
    setSelectedDialTarget, // Устанавливает номер и имя контакта для выбранной трубки
    setSelectedPanelMode, // Меняет правую панель выбранной трубки
    setSelectedTransferTarget, // Устанавливает цель перевода выбранной трубки
    setSelectedTransferTargetSelection, // Сохраняет позицию курсора в цели перевода выбранной трубки
    setSelectedTransferTargetSession, // Устанавливает сессию из очереди как цель перевода выбранной трубки
    toggleSelectedSessionHold,
    toggleSelectedTransferMode, // Переключает режим перевода выбранной трубки
    transferSelectedSessionToOtherHandset, // Переносит выбранную сессию на другую доступную трубку
  }
})
