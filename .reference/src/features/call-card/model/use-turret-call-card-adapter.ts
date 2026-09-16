import type {
  CallCardCapabilities,
  CallCardDialChangePayload,
  CallCardDialVm,
  CallCardHistoryItemVm,
  CallCardQueueItemVm,
  CallCardSessionVm,
  CallCardTransferVm,
  TurretCallCardProps,
} from '@rtu-turret-system/turret-lib'
import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'

import { useCallHistoryStore, type CallHistoryItem } from '@/entities/call-history'
import type { RTCSessionFacade } from '@/entities/call-session'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { useAppStore, useDevicesStore, type LogicalMediaDevice } from '@/shared/composables'

import { mapCallHistoryToCallCardEntries } from './call-card-history'
import { getCallCardSessionViewModel } from './call-card-session-view'
import {
  CALL_CARD_HANDSET_IDS,
  CALL_CARD_SESSION_VIEW_STATES,
  type CallCardSessionIconName,
} from './types'
import { useCallCardStore } from './use-call-card-store'

const PINNED_QUEUE_RIGHT_MIC_MIRROR: Record<string, string> = {
  micLeftF: 'micRightF',
  micPauseLeftF: 'micPauseRightF',
  micPauseLeftM: 'micPauseRightM',
}

const DEVICE_SIDE_FROM_MODULE_RE = /(?:^|[_-])([LR])\d*/i

const isGooseDeviceRightSide = (
  device: Pick<LogicalMediaDevice, 'id' | 'module'> | null | undefined,
): boolean => {
  if (!device) return false

  const source = device.module ?? device.id
  if (!source) return false

  const match = source.match(DEVICE_SIDE_FROM_MODULE_RE)

  return match?.[1]?.toUpperCase() === 'R'
}

const mirrorPinnedMicIcon = (icon: string, isRightSide: boolean): string => {
  if (!isRightSide) return icon

  return PINNED_QUEUE_RIGHT_MIC_MIRROR[icon] ?? icon
}

/** Очередь завешенных: mic L/R как ПБВ; mute → micOffM. */
const resolvePinnedQueueIcon = (
  session: RTCSessionFacade,
  viewIcon: CallCardSessionIconName,
  viewState: string,
  getSlotBySessionId: ReturnType<typeof usePinnedCallsPanelStore>['getSlotBySessionId'],
  preferredGoose: LogicalMediaDevice | null | undefined,
): string => {
  const device = session.currentDevice?.value ?? preferredGoose
  const isRightSide = isGooseDeviceRightSide(device)

  if (viewState === CALL_CARD_SESSION_VIEW_STATES.active) {
    const slot = getSlotBySessionId(session.sessionId)
    if (slot && !slot.micState) return 'micOffM'

    return mirrorPinnedMicIcon('micLeftF', isRightSide)
  }

  if (viewState === CALL_CARD_SESSION_VIEW_STATES.hold) {
    const isLocalHold = viewIcon === 'phonePauseF' || viewIcon === 'phonePauseInvF'
    const baseIcon = isLocalHold ? 'micPauseLeftF' : 'micPauseLeftM'

    return mirrorPinnedMicIcon(baseIcon, isRightSide)
  }

  // Базовая session-иконка; зеркало handsetSide делает TurretCallCard.
  return viewIcon
}

/**
 * Presentational adapter: useCallCardStore → TurretCallCardProps + emit handlers.
 */
export const useTurretCallCardAdapter = () => {
  const callCardStore = useCallCardStore()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const devicesStore = useDevicesStore()
  const { calls } = storeToRefs(useCallHistoryStore())
  const { currentUser } = storeToRefs(useAppStore())

  const {
    availableHandsetSlots,
    canMoveSelectedSessionToPinnedPanel,
    isPinnedPresentation,
    isSelectedConsultationConnected,
    isSelectedMuted,
    isSelectedTransferModeActive,
    selectedConsultationSession,
    selectedDialBuffer,
    selectedDialContactName,
    selectedDialSelectionEnd,
    selectedDialSelectionStart,
    selectedHandsetId,
    selectedHandsetQueue,
    selectedHandsetSlot,
    selectedPanelMode,
    selectedQueuePosition,
    selectedQueueTotal,
    canSelectNextQueuePosition,
    canSelectPreviousQueuePosition,
    selectedSession,
    selectedSessionView,
    selectedTransferSourceSession,
    selectedTransferState,
    selectedVolume,
  } = storeToRefs(callCardStore)

  const handsetSide = computed(() =>
    selectedHandsetSlot.value?.id === CALL_CARD_HANDSET_IDS.right ? 'right' : 'left',
  )

  const canHandsetSwap = computed(() =>
    Boolean(
      selectedSession.value
      && availableHandsetSlots.value.some(slot => slot.id !== selectedHandsetId.value),
    ),
  )

  const capabilities = computed<CallCardCapabilities>(() => {
    if (isPinnedPresentation.value) {
      return {
        pin: false,
        handsetSwap: false,
        transfer: false,
        history: false,
        queue: true,
      }
    }

    return {
      pin: true,
      handsetSwap: true,
      transfer: true,
      history: true,
      queue: true,
    }
  })

  const session = computed<CallCardSessionVm | null>(() => {
    const view = selectedSessionView.value
    if (!view) return null

    return {
      sessionId: view.sessionId,
      name: view.name,
      number: view.number,
      duration: view.duration,
      state: view.state,
      tone: view.tone,
      direction: view.direction,
      icon: view.icon,
      controlLayout: view.controlLayout,
      isHighPriority: view.isHighPriority,
      actions: {
        ...view.actions,
        canPin: canMoveSelectedSessionToPinnedPanel.value,
        canHandsetSwap: canHandsetSwap.value,
      },
    }
  })

  const queue = computed<CallCardQueueItemVm[]>(() =>
    selectedHandsetQueue.value
      .map((queueSession) => {
        const view = getCallCardSessionViewModel(queueSession)
        if (!view) return null

        const icon = isPinnedPresentation.value
          ? resolvePinnedQueueIcon(
            queueSession,
            view.icon,
            view.state,
            pinnedCallsPanelStore.getSlotBySessionId,
            unref(devicesStore.readyPreferredGoose),
          )
          : view.icon

        return {
          sessionId: view.sessionId,
          name: view.name,
          number: view.number,
          state: view.state,
          tone: view.tone,
          icon,
          isSelected: selectedSession.value?.sessionId === view.sessionId,
          isHighPriority: view.isHighPriority,
        }
      })
      .filter((entry): entry is CallCardQueueItemVm => Boolean(entry)),
  )

  const dial = computed<CallCardDialVm>(() => {
    if (isSelectedTransferModeActive.value) {
      const transferState = selectedTransferState.value

      return {
        buffer: transferState.targetNumber,
        contactName: transferState.targetName,
        selectionStart: transferState.targetSelectionStart,
        selectionEnd: transferState.targetSelectionEnd,
      }
    }

    // Empty title: dial contact или «Левая трубка»/«Правая трубка» (как старый CallCardEmptyState).
    const emptyHandsetTitle = selectedSessionView.value
      ? ''
      : (selectedHandsetSlot.value?.title
        ? `${selectedHandsetSlot.value.title} трубка`
        : '')

    return {
      buffer: selectedDialBuffer.value,
      contactName: selectedDialContactName.value || emptyHandsetTitle,
      selectionStart: selectedDialSelectionStart.value,
      selectionEnd: selectedDialSelectionEnd.value,
    }
  })

  const historyItems = computed<CallCardHistoryItemVm[]>(() => {
    if (isPinnedPresentation.value) return []

    return mapCallHistoryToCallCardEntries(
      calls.value as CallHistoryItem[],
      currentUser.value,
      5,
    )
  })

  const transfer = computed<CallCardTransferVm | null>(() => {
    if (isPinnedPresentation.value || !isSelectedTransferModeActive.value) {
      return null
    }

    const state = selectedTransferState.value
    const isConsultation =
      state.consultationStage === 'starting'
      || state.consultationStage === 'active'
    // Consultation chrome: имя source (как старый transferMergeTarget), не dial-target.
    const mergeTargetName = isConsultation
      ? getCallCardSessionViewModel(selectedTransferSourceSession.value)?.name
        || state.targetName
      : state.targetName

    return {
      stage: state.consultationStage,
      targetName: mergeTargetName,
      targetNumber: state.targetNumber,
      canBlind: Boolean(state.targetNumber.trim()),
      canConsult: Boolean(state.targetNumber.trim()),
      canMerge: isSelectedConsultationConnected.value,
      canCancel: true,
    }
  })


  const openPanelMode = (mode: 'dialpad' | 'history' | 'queue') => {
    if (selectedPanelMode.value === mode) return
    callCardStore.setSelectedPanelMode(mode)
  }

  const onAnswer = () => {
    callCardStore.answerSelectedSession()
  }

  const onHangup = () => {
    selectedSession.value?.terminate()
  }

  const onHold = () => {
    callCardStore.toggleSelectedSessionHold()
  }

  const onUnhold = () => {
    callCardStore.toggleSelectedSessionHold()
  }

  const onOpenDialpad = () => {
    openPanelMode('dialpad')
  }

  const onOpenQueue = () => {
    if (selectedConsultationSession.value) return
    openPanelMode('queue')
  }

  const onOpenHistory = () => {
    if (isPinnedPresentation.value) return
    openPanelMode('history')
  }

  const onClosePanel = () => {
    callCardStore.hide()
  }

  const onSelectQueuePrev = () => {
    callCardStore.selectPreviousSelectedQueuePosition()
  }

  const onSelectQueueNext = () => {
    callCardStore.selectNextSelectedQueuePosition()
  }

  const onSelectQueueItem = (sessionId: string) => {
    if (isSelectedTransferModeActive.value) {
      callCardStore.setSelectedTransferTargetSession(sessionId)
      return
    }

    callCardStore.setSelectedHandsetSessionId(sessionId)
  }

  const onDialChange = (payload: CallCardDialChangePayload) => {
    if (isSelectedTransferModeActive.value) {
      callCardStore.setSelectedTransferTarget({ number: payload.buffer })
      callCardStore.setSelectedTransferTargetSelection({
        selectionStart: payload.selectionStart,
        selectionEnd: payload.selectionEnd,
      })
      return
    }

    callCardStore.setSelectedDialBuffer(payload.buffer)
    callCardStore.setSelectedDialContactName('')
    callCardStore.setSelectedDialSelection({
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd,
    })
  }

  const onDialCall = () => {
    callCardStore.callSelectedDialNumber()
  }

  const onDtmf = (digit: string) => {
    const sessionForDtmf = selectedConsultationSession.value ?? selectedSession.value
    sessionForDtmf?.sendDtmf(digit)
  }

  const onHistorySelect = (item: CallCardHistoryItemVm) => {
    callCardStore.setSelectedDialTarget({
      name: item.name,
      number: item.number,
    })
    callCardStore.setSelectedPanelMode('dialpad')
  }

  const onMuteToggle = () => {
    callCardStore.setSelectedHandsetMuted(!isSelectedMuted.value)
  }

  const onVolumeChange = (volume: number) => {
    callCardStore.setSelectedHandsetVolume(volume)
  }

  const onTransferBlind = () => {
    callCardStore.executeSelectedBlindTransfer()
  }

  const onTransferConsult = () => {
    callCardStore.startSelectedConsultationCall()
  }

  const onTransferMerge = () => {
    callCardStore.executeSelectedConsultationMerge()
  }

  const onTransferCancel = () => {
    callCardStore.cancelSelectedConsultationCall()
  }

  const onTransferToggle = () => {
    if (isPinnedPresentation.value) return
    callCardStore.toggleSelectedTransferMode()
  }

  const onPin = () => {
    if (isPinnedPresentation.value) return
    void callCardStore.moveSelectedSessionToPinnedPanel()
  }

  const onHandsetSwap = () => {
    if (isPinnedPresentation.value) return
    callCardStore.transferSelectedSessionToOtherHandset()
  }

  const cardProps = computed<TurretCallCardProps>(() => ({
    session: session.value,
    panelMode: selectedPanelMode.value,
    queue: queue.value,
    queuePosition: selectedQueuePosition.value,
    queueTotal: selectedQueueTotal.value,
    canSelectQueuePrevious: canSelectPreviousQueuePosition.value,
    canSelectQueueNext: canSelectNextQueuePosition.value,
    dial: dial.value,
    historyItems: historyItems.value,
    capabilities: capabilities.value,
    handsetSide: handsetSide.value,
    muted: isSelectedMuted.value,
    volume: selectedVolume.value,
    transfer: transfer.value,
  }))

  return {
    cardProps,
    onAnswer,
    onHangup,
    onHold,
    onUnhold,
    onOpenDialpad,
    onOpenQueue,
    onOpenHistory,
    onClosePanel,
    onSelectQueuePrev,
    onSelectQueueNext,
    onSelectQueueItem,
    onDialChange,
    onDialCall,
    onDtmf,
    onHistorySelect,
    onMuteToggle,
    onVolumeChange,
    onTransferBlind,
    onTransferConsult,
    onTransferMerge,
    onTransferCancel,
    onTransferToggle,
    onPin,
    onHandsetSwap,
  }
}
