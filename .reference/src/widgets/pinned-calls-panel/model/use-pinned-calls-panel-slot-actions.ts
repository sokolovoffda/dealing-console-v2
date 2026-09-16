import { useDialog } from '@wui/common-library'
import type { MediaConstraints } from '@wui/jssip/lib/RTCSession'
import { storeToRefs } from 'pinia'
import { computed, ref, watch, type ComponentOptions } from 'vue'

import { useCallCardStore } from '@/features/call-card'

import { useSessionStore } from '@/entities/call-session'
import { useContactCachedStore } from '@/entities/contact'
import type { Contact } from '@/entities/contact'
import {
  getPinnedCallPServedKey,
  PINNED_CALLS_INITIAL_MIC_STATE,
  PINNED_CALLS_INITIAL_VOLUME,
  usePinnedCallsPanelStore,
} from '@/entities/pinned-calls'
import type { PinnedCallGridCell, PinnedCallSlotOrder } from '@/entities/pinned-calls'

import {
  notifyMediaDeviceUnavailableForCall,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'
import { contactPServedToNumber } from '@/shared/services'
import { ChangeContactsModal, useContextMenu } from '@/shared/ui'
import type { ContextMenuItem } from '@/shared/ui'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

import {
  PINNED_CALL_SLOT_VIEW_STATE,
  resolvePinnedSlotViewState,
} from './pinned-call-slot-card-view'
import { usePinnedCallsPanelMoveState } from './use-pinned-calls-panel-move-state'

type PinnedCallSource = {
  name?: string
  pServed: string
  sessionId?: string
}

const toPinnedCallSlotDraft = (
  source: PinnedCallSource,
  slotIndex: number,
) => ({
  pServed: source.pServed,
  slotIndex,
  title: source.name || getPinnedCallPServedKey(source.pServed),
  volume: PINNED_CALLS_INITIAL_VOLUME,
  prevVolume: PINNED_CALLS_INITIAL_VOLUME,
  micState: PINNED_CALLS_INITIAL_MIC_STATE,
  prevMicState: PINNED_CALLS_INITIAL_MIC_STATE,
})

export const usePinnedCallsPanelSlotActions = () => {
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const { isEditMode, saving } = storeToRefs(pinnedCallsPanelStore)
  const contactCachedStore = useContactCachedStore()
  const { queueSessions } = useSessionStore()
  const { showDialog } = useDialog<Contact[] | undefined>()
  const { switchToCall } = useWebRTC()
  const {
    cancelMove,
    isMoveMode,
    isMovingSourceOrder,
    movingSlot,
    startMove,
  } = usePinnedCallsPanelMoveState()

  const menuTargetCell = ref<PinnedCallGridCell | null>(null)

  const resolveSlotDialNumber = (pServed: string): string | undefined => {
    const contact = contactCachedStore.getLocalByPServed(pServed)
    const fromContact = contact?.internalNumber || contact?.mobilePhone
    if (fromContact) return fromContact

    const fromPServed = contactPServedToNumber(pServed) || getPinnedCallPServedKey(pServed)
    return fromPServed || undefined
  }

  const queueMenuSources = computed(() => {
    const seen = new Set<string>()
    const sources: PinnedCallSource[] = []

    queueSessions.value.forEach((session) => {
      const key = getPinnedCallPServedKey(session.pServed)
      if (!key || seen.has(key)) return

      seen.add(key)

      const cachedName = contactCachedStore.getLocalByPServed(session.pServed)?.name
      sources.push({
        pServed: session.pServed,
        name: session.contact?.name || cachedName || session.number || key,
        sessionId: session.sessionId,
      })
    })

    return sources
  })

  const upsertSourceToSlot = async (
    order: PinnedCallSlotOrder,
    source: PinnedCallSource,
  ) => {
    const previousSessionId = pinnedCallsPanelStore.slotSessionIds.get(order)

    await pinnedCallsPanelStore.upsertSlot(
      order,
      toPinnedCallSlotDraft(
        source,
        pinnedCallsPanelStore.getNextSlotIndex(source.pServed),
      ),
    )

    // Привязка сессии к слоту убирает её из очереди трубки (queueSessions).
    if (source.sessionId) {
      pinnedCallsPanelStore.assignSessionToSlot(order, source.sessionId)

      const goose = useDevicesStore().readyPreferredGoose
      const session = useSessionStore().getSessionById(source.sessionId)
      if (goose && session) {
        try {
          // Без peerconnection полный bind падает на getSenders — для очереди хватает affinity.
          if (session.session?.connection) {
            useDevicesSessionsStore().bindSessionToDevice(source.sessionId, goose.id, {
              holdOthers: false,
            })
          } else {
            useDevicesSessionsStore().bindSessionDeviceAffinity(source.sessionId, goose.id)
          }
        } catch (e) {
          console.error('Failed to bind queued session to goose', e)
        }
      }
    }

    // Замена: предыдущая активная сессия слота возвращается на трубку.
    if (
      previousSessionId
      && previousSessionId !== source.sessionId
      && useSessionStore().getSessionById(previousSessionId)
    ) {
      try {
        const handset = useDevicesStore().readyHandsetDevices.at(0)
        const previousSession = useSessionStore().getSessionById(previousSessionId)
        if (handset && previousSession) {
          // Connected → полный bind (mic track); иначе affinity.
          if (previousSession.session?.connection) {
            useDevicesSessionsStore().bindSessionToDevice(previousSessionId, handset.id, {
              holdOthers: false,
            })
          } else {
            useDevicesSessionsStore().bindSessionDeviceAffinity(previousSessionId, handset.id)
          }
        }
      } catch (e) {
        console.error('Failed to release previous pinned session to handset', e)
      }
    }
  }

  const addContactToSlot = async (order: PinnedCallSlotOrder, contact: Contact) => {
    contactCachedStore.setContactIfDoesNotExists(contact)
    await upsertSourceToSlot(order, contact)
  }

  const addContactToSlotViaDialog = async (order: PinnedCallSlotOrder) => {
    const contacts = await showDialog(ChangeContactsModal as ComponentOptions, {
      title: menuTargetCell.value?.slot ? 'Заменить контакт' : 'Добавить контакт',
      contactsPServed: [],
      isOnce: true,
      hasOverlay: false,
    })

    const contact = contacts?.at(0)
    if (!contact) return

    await addContactToSlot(order, contact)
  }

  const finishMoveTo = async (order: PinnedCallSlotOrder): Promise<boolean> => {
    const sourceOrder = movingSlot.value?.sourceOrder
    if (sourceOrder === undefined) return false

    if (sourceOrder === order) {
      cancelMove()
      return true
    }

    await pinnedCallsPanelStore.reorderSlots(sourceOrder, order)
    cancelMove()
    return true
  }

  const buildMenuItems = (cell: PinnedCallGridCell): ContextMenuItem[] => {
    const items: ContextMenuItem[] = queueMenuSources.value.map((source) => ({
      label: source.name || getPinnedCallPServedKey(source.pServed),
      icon: 'userM',
      dataTest: 'pinned-slot-menu-queue-item',
      onClick: () => {
        void upsertSourceToSlot(cell.order, source)
      },
    }))

    items.push({
      label: 'Добавить из справочника',
      icon: 'userAddM',
      border: items.length ? 'top' : undefined,
      dataTest: 'pinned-slot-menu-from-directory',
      onClick: () => {
        void addContactToSlotViaDialog(cell.order)
      },
    })

    if (cell.slot) {
      items.push(
        {
          label: 'Переместить',
          icon: 'chevronRightLgM',
          dataTest: 'pinned-slot-menu-move',
          onClick: () => {
            startMove(cell.order)
          },
        },
        {
          label: 'Удалить',
          icon: 'trashM',
          iconClass: 'text-comp-menu-item-icon-base-neg',
          border: 'top',
          dataTest: 'pinned-slot-menu-delete',
          onClick: () => {
            void pinnedCallsPanelStore.clearSlot(cell.order)
          },
        },
      )
    }

    return items
  }

  const menuItems = computed<ContextMenuItem[]>(() => {
    const cell = menuTargetCell.value
    if (!cell) return []
    return buildMenuItems(cell)
  })

  const {
    menuProps,
    open: openMenu,
    close: closeMenu,
  } = useContextMenu({
    items: menuItems,
    anchorMode: 'cursor',
  })

  watch(isEditMode, (editMode) => {
    if (!editMode) {
      cancelMove()
      closeMenu()
      menuTargetCell.value = null
    }
  })

  const openSlotMenu = (cell: PinnedCallGridCell, event?: MouseEvent) => {
    menuTargetCell.value = cell
    openMenu(event)
  }

  const handleSlotClick = async (cell: PinnedCallGridCell, event?: MouseEvent) => {
    if (saving.value) return

    if (!isEditMode.value) {
      if (cell.slot) pinnedCallsPanelStore.setActiveSlot(cell.order)
      return
    }

    if (isMoveMode.value) {
      await finishMoveTo(cell.order)
      return
    }

    openSlotMenu(cell, event)
  }

  const handleSlotMicClick = (order: PinnedCallSlotOrder) => {
    if (saving.value || isEditMode.value) return
    // WUI-3825: в PTT activePinned mic только через аппаратную speak, не через UI линии.
    if (pinnedCallsPanelStore.isActivePinnedPushToTalkMode()) return

    const slot = pinnedCallsPanelStore.getSlotByOrder(order)
    if (!slot) return

    pinnedCallsPanelStore.patchSlotRuntimeAudio(order, {
      micState: !slot.micState,
    })
  }

  const handleSlotVolumeChange = (order: PinnedCallSlotOrder, volume: number) => {
    if (saving.value || isEditMode.value) return

    pinnedCallsPanelStore.patchSlotRuntimeAudio(order, { volume })
  }

  const dialFromSlot = (order: PinnedCallSlotOrder) => {
    const slot = pinnedCallsPanelStore.getSlotByOrder(order)
    if (!slot) return

    const goose = useDevicesStore().readyPreferredGoose
    if (!goose) {
      notifyMediaDeviceUnavailableForCall()
      return
    }

    const number = resolveSlotDialNumber(slot.pServed)
    if (!number) return

    pinnedCallsPanelStore.setActiveSlot(order)
    switchToCall(number, goose, undefined, undefined, order)
  }

  const answerPinnedSession = (order: PinnedCallSlotOrder) => {
    const slot = pinnedCallsPanelStore.getSlotByOrder(order)
    if (!slot) return

    const session = pinnedCallsPanelStore.getSessionForSlot(slot)
    if (!session) return

    const goose = useDevicesStore().readyPreferredGoose
    if (!goose) {
      notifyMediaDeviceUnavailableForCall()
      return
    }

    const mediaConstraints = {
      audio: {
        deviceId: normalizeAudioDeviceIdConstraint(goose.inputId),
        echoCancellation: goose.echoCancellation ?? true,
        noiseSuppression: goose.noiseSuppression ?? true,
        autoGainControl: goose.autoGainControl ?? true,
      },
      video: false,
    } as never as MediaConstraints

    pinnedCallsPanelStore.setActiveSlot(order)
    session.answer({ mediaConstraints }, goose)
  }

  const handleSlotStatusClick = (order: PinnedCallSlotOrder) => {
    if (saving.value || isEditMode.value) return

    const slot = pinnedCallsPanelStore.getSlotByOrder(order)
    if (!slot) return

    const session = pinnedCallsPanelStore.getSessionForSlot(slot)
    const viewState = resolvePinnedSlotViewState(session)

    if (viewState === PINNED_CALL_SLOT_VIEW_STATE.idle) {
      dialFromSlot(order)
      return
    }

    if (viewState === PINNED_CALL_SLOT_VIEW_STATE.outgoing) {
      session?.terminate()
      return
    }

    if (viewState === PINNED_CALL_SLOT_VIEW_STATE.incoming) {
      answerPinnedSession(order)
      return
    }

    if (viewState === PINNED_CALL_SLOT_VIEW_STATE.hold) {
      pinnedCallsPanelStore.setActiveSlot(order)
      // Hold только из call card (шаг 6); с сетки — только снять.
      void session?.toggleHold(false)
      return
    }

    if (viewState === PINNED_CALL_SLOT_VIEW_STATE.active) {
      pinnedCallsPanelStore.setActiveSlot(order)
      pinnedCallsPanelStore.toggleSlotLineAudible(order)
      return
    }

    pinnedCallsPanelStore.setActiveSlot(order)
  }

  const handleSlotCenterClick = async (order: PinnedCallSlotOrder, event?: MouseEvent) => {
    const cell = pinnedCallsPanelStore.gridCells.find(item => item.order === order)
    if (!cell) return

    if (!isEditMode.value && cell.slot) {
      // Любой клик по центру вне edit делает слот активным.
      pinnedCallsPanelStore.setActiveSlot(order)

      const session = pinnedCallsPanelStore.getSessionForSlot(cell.slot)
      const viewState = resolvePinnedSlotViewState(session)

      if (
        session
        && (
          viewState === PINNED_CALL_SLOT_VIEW_STATE.active
          || viewState === PINNED_CALL_SLOT_VIEW_STATE.hold
        )
      ) {
        useCallCardStore().openPinnedPanelSession(session.sessionId)
        return
      }
    }

    await handleSlotClick(cell, event)
  }

  return {
    closeMenu,
    handleSlotCenterClick,
    handleSlotClick,
    handleSlotMicClick,
    handleSlotStatusClick,
    handleSlotVolumeChange,
    isMoveMode,
    isMovingSourceOrder,
    menuProps,
  }
}
