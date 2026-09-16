import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useSessionStore } from '@/entities/call-session'

import {
  LogicalMediaDeviceTypeEnum,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'

import { usePinnedCallsApi } from '../api/use-pinned-calls-api'

import {
  buildPinnedCallGridCells,
  buildPinnedCallGroupCells,
  clampPinnedCallVolume,
  getPinnedCallGroupMemberKey,
  getPinnedCallPServedKey,
  inferPinnedCallsGroupsLayout,
  isValidPinnedCallGroupIndex,
  normalizePinnedCallGroup,
  normalizePinnedCallPanel,
  normalizePinnedCallSlot,
  toPinnedCallGroupMemberBody,
  toPinnedCallGroupUpdateBody,
  toPinnedCallGroupsReorderBody,
  toPinnedCallSlotsReorderBody,
  toPinnedCallSlotUpsertBody,
} from './normalizers'
import {
  PINNED_CALLS_INITIAL_MIC_STATE,
  PINNED_CALLS_INITIAL_VOLUME,
  PINNED_CALLS_SCHEMA_VERSION,
} from './types'
import type {
  PinnedCallGroup,
  PinnedCallGroupIndex,
  PinnedCallGroupMember,
  PinnedCallPanel,
  PinnedCallSlot,
  PinnedCallSlotOrder,
  PinnedCallsGroupsLayout,
} from './types'

type SlotSessionMap = Map<PinnedCallSlotOrder, string>
type SlotDraft = Omit<PinnedCallSlot, 'order'>
type GroupPayload = Omit<PinnedCallGroup, 'index'>

const INITIAL_GLOBAL_VOLUME = 1

const EMPTY_GROUP_PAYLOAD: GroupPayload = {
  micState: PINNED_CALLS_INITIAL_MIC_STATE,
  volumeState: true,
  members: [],
}

const areGroupPayloadsEqual = (left: GroupPayload, right: GroupPayload): boolean => {
  if (left.micState !== right.micState || left.volumeState !== right.volumeState) {
    return false
  }

  if (left.members.length !== right.members.length) {
    return false
  }

  const leftKeys = left.members.map(getPinnedCallGroupMemberKey).sort()
  const rightKeys = right.members.map(getPinnedCallGroupMemberKey).sort()

  return leftKeys.every((key, index) => key === rightKeys[index])
}

const createEmptyPinnedCallPanel = (): PinnedCallPanel => ({
  schemaVersion: PINNED_CALLS_SCHEMA_VERSION,
  slots: [],
  groups: [],
  groupsLayout: null,
})

const requirePinnedCallSlot = (slot: PinnedCallSlot | null): PinnedCallSlot => {
  if (!slot) {
    throw new Error('Invalid pinned call slot response')
  }

  return slot
}

const requirePinnedCallGroup = (group: PinnedCallGroup | null): PinnedCallGroup => {
  if (!group) {
    throw new Error('Invalid pinned call group response')
  }

  return group
}

export const usePinnedCallsPanelStore = defineStore('pinned-calls-panel', () => {
  const panel = ref<PinnedCallPanel | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const activeSlotOrder = ref<PinnedCallSlotOrder | null>(null)
  const isEditMode = ref(false)
  const slotSessionIds = ref<SlotSessionMap>(new Map())
  /**
   * Runtime-раскладка 4|8 до фиксации на API (первая группа с members).
   * Не localStorage.
   */
  const draftGroupsLayout = ref<PinnedCallsGroupsLayout | null>(null)
  /**
   * Исходящий dial со слота: order до прихода sessionId в addSession
   * (newRTCSession срабатывает синхронно внутри ua.call, до assignSessionToSlot).
   */
  const pendingDialSlotOrder = ref<PinnedCallSlotOrder | null>(null)
  /** Master-громкость для playback завешенных / Main speaker (footer volume). */
  const globalVolumeMultiplier = ref(INITIAL_GLOBAL_VOLUME)
  /**
   * Последний ненулевой volume группы (runtime, last-action).
   * Mute (0) map не затирает — нужен для restore при unmute.
   */
  const groupPlaybackVolumeByIndex = ref(new Map<PinnedCallGroupIndex, number>())
  /**
   * PTT activePinned override:
   * - `undefined` — speak не нажат, все линии mute (WUI-3825);
   * - `null` — speak нажат, активный слот не выбран;
   * - `order` — speak нажат, unmute только этот слот.
   */
  const activePinnedPushToTalkTargetOrder = ref<PinnedCallSlotOrder | null | undefined>(undefined)

  const preserveSlotRuntimeAudio = (
    nextSlot: PinnedCallSlot,
    previousSlot?: PinnedCallSlot,
  ): PinnedCallSlot => {
    if (!previousSlot) return nextSlot

    return {
      ...nextSlot,
      micState: previousSlot.micState,
      prevMicState: previousSlot.prevMicState,
      volume: previousSlot.volume,
      prevVolume: previousSlot.prevVolume,
    }
  }

  const slots = computed(() => panel.value?.slots ?? [])
  const groups = computed(() => panel.value?.groups ?? [])
  const gridCells = computed(() => buildPinnedCallGridCells(slots.value))
  const groupCells = computed(() => buildPinnedCallGroupCells(groups.value))

  /** Layout с backend (`null` = ещё не зафиксирован). */
  const persistedGroupsLayout = computed(() => panel.value?.groupsLayout ?? null)

  const hasAnyGroupMembers = computed(() => {
    return groups.value.some(group => group.members.length > 0)
  })

  /**
   * Effective UI: API → draft → infer из groups (legacy: members есть, layout null).
   */
  const groupsLayout = computed(() => {
    if (persistedGroupsLayout.value != null) return persistedGroupsLayout.value
    if (draftGroupsLayout.value != null) return draftGroupsLayout.value
    if (!hasAnyGroupMembers.value) return null

    return inferPinnedCallsGroupsLayout(groups.value)
  })

  const slotsByOrder = computed(() => {
    return new Map(slots.value.map(slot => [slot.order, slot]))
  })

  const groupsByIndex = computed(() => {
    return new Map(groups.value.map(group => [group.index, group]))
  })

  const activeSlot = computed(() => {
    if (activeSlotOrder.value === null) return null

    return slotsByOrder.value.get(activeSlotOrder.value) ?? null
  })

  const activeSlotSession = computed(() => {
    if (!activeSlot.value) return undefined

    return getSessionForSlot(activeSlot.value)
  })

  const setPanel = (nextPanel: PinnedCallPanel) => {
    const previousSlotsByOrder = new Map(
      (panel.value?.slots ?? []).map(slot => [slot.order, slot]),
    )

    // REST не источник истины для mic/volume на этом этапе — сохраняем runtime.
    panel.value = {
      ...nextPanel,
      slots: nextPanel.slots.map(slot => (
        preserveSlotRuntimeAudio(slot, previousSlotsByOrder.get(slot.order))
      )),
    }

    // После фиксации layout на API draft больше не нужен.
    if (nextPanel.groupsLayout != null) {
      draftGroupsLayout.value = null
    }

    const nextOrders = new Set(nextPanel.slots.map(slot => slot.order))
    slotSessionIds.value = new Map(
      Array.from(slotSessionIds.value.entries()).filter(([order]) => nextOrders.has(order)),
    )

    if (activeSlotOrder.value !== null && !nextOrders.has(activeSlotOrder.value)) {
      activeSlotOrder.value = null
    }
  }

  const setDraftGroupsLayout = (layout: PinnedCallsGroupsLayout) => {
    draftGroupsLayout.value = layout
  }

  const clearDraftGroupsLayout = () => {
    draftGroupsLayout.value = null
  }

  /**
   * PUT groupsLayout, если ещё не persisted.
   * Нужен effective layout (draft). При 409 — error + throw.
   */
  const commitGroupsLayoutIfNeeded = async (): Promise<void> => {
    if (persistedGroupsLayout.value != null) return

    const layoutToCommit = groupsLayout.value
    if (layoutToCommit == null) {
      throw new Error('Сначала выберите раскладку групп (4 или 8)')
    }

    const { updatePinnedCallsGroupsLayout } = usePinnedCallsApi()
    const { data } = await updatePinnedCallsGroupsLayout({ groupsLayout: layoutToCommit })
    setPanel(normalizePinnedCallPanel(data))
  }

  /** Явный PUT layout (смена/сброс при пустых группах — шаг 3 UI). */
  const updateGroupsLayout = async (
    layout: PinnedCallsGroupsLayout | null,
  ): Promise<PinnedCallPanel> => {
    const { updatePinnedCallsGroupsLayout } = usePinnedCallsApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await updatePinnedCallsGroupsLayout({ groupsLayout: layout })
      const nextPanel = normalizePinnedCallPanel(data)
      setPanel(nextPanel)

      if (layout == null) {
        draftGroupsLayout.value = null
      }

      return nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update groups layout'
      throw e
    } finally {
      saving.value = false
    }
  }

  /**
   * Перед записью members: зафиксировать layout на API, если ещё null.
   * Также лечит legacy (members уже есть, groupsLayout не сохранён).
   */
  const ensureGroupsLayoutCommittedForFirstMembers = async (
    nextMembersCount: number,
  ): Promise<void> => {
    if (persistedGroupsLayout.value != null) return
    if (!hasAnyGroupMembers.value && nextMembersCount <= 0) return

    await commitGroupsLayoutIfNeeded()
  }

  const upsertLocalSlot = (slot: PinnedCallSlot) => {
    const currentPanel = panel.value ?? createEmptyPinnedCallPanel()
    const nextSlots = currentPanel.slots.filter(item => item.order !== slot.order)

    panel.value = {
      ...currentPanel,
      slots: [...nextSlots, slot].sort((left, right) => left.order - right.order),
    }
  }

  const removeLocalSlot = (order: PinnedCallSlotOrder) => {
    if (!panel.value) return

    panel.value = {
      ...panel.value,
      slots: panel.value.slots.filter(slot => slot.order !== order),
    }

    const nextSessionIds = new Map(slotSessionIds.value)
    nextSessionIds.delete(order)
    slotSessionIds.value = nextSessionIds

    if (activeSlotOrder.value === order) {
      activeSlotOrder.value = null
    }
  }

  const upsertLocalGroup = (group: PinnedCallGroup) => {
    const currentPanel = panel.value ?? createEmptyPinnedCallPanel()
    const nextGroups = currentPanel.groups.filter(item => item.index !== group.index)

    panel.value = {
      ...currentPanel,
      groups: [...nextGroups, group].sort((left, right) => left.index - right.index),
    }
  }

  const removeLocalGroupMember = (
    index: PinnedCallGroupIndex,
    member: PinnedCallGroupMember,
  ) => {
    const group = groupsByIndex.value.get(index)
    if (!group) return

    const targetKey = getPinnedCallGroupMemberKey(member)

    upsertLocalGroup({
      ...group,
      members: group.members.filter(item => getPinnedCallGroupMemberKey(item) !== targetKey),
    })
  }

  const getSlotByOrder = (order: PinnedCallSlotOrder): PinnedCallSlot | undefined => {
    return slotsByOrder.value.get(order)
  }

  const getGroupByIndex = (index: PinnedCallGroupIndex): PinnedCallGroup | undefined => {
    return groupsByIndex.value.get(index)
  }

  const getSlotsByPServed = (pServed: string): PinnedCallSlot[] => {
    const key = getPinnedCallPServedKey(pServed)

    return slots.value.filter(slot =>
      slot.pServed === pServed
      || getPinnedCallPServedKey(slot.pServed) === key,
    )
  }

  const getNextSlotIndex = (pServed: string): number => {
    return getSlotsByPServed(pServed)
      .reduce((maxIndex, slot) => Math.max(maxIndex, slot.slotIndex), 0) + 1
  }

  const getSlotByGroupMember = (
    member: PinnedCallGroupMember,
  ): PinnedCallSlot | undefined => {
    return getSlotsByPServed(member.pServed)
      .find(slot => slot.slotIndex === member.slotIndex)
  }

  const getGroupSlots = (index: PinnedCallGroupIndex): PinnedCallSlot[] => {
    const group = getGroupByIndex(index)
    if (!group) return []

    return group.members
      .map(getSlotByGroupMember)
      .filter((slot): slot is PinnedCallSlot => Boolean(slot))
  }

  const getGroupsBySlot = (slot: PinnedCallSlot): PinnedCallGroup[] => {
    const memberKey = getPinnedCallGroupMemberKey(slot)

    return groups.value.filter(group => {
      return group.members.some(member => getPinnedCallGroupMemberKey(member) === memberKey)
    })
  }

  const hasGroupMember = (
    index: PinnedCallGroupIndex,
    member: PinnedCallGroupMember,
  ): boolean => {
    const group = getGroupByIndex(index)
    if (!group) return false

    const targetKey = getPinnedCallGroupMemberKey(member)

    return group.members.some(item => getPinnedCallGroupMemberKey(item) === targetKey)
  }

  const setActiveSlot = (order: PinnedCallSlotOrder | null) => {
    activeSlotOrder.value = order

    // PTT activePinned: при удержании speak передача следует за новым active слотом.
    if (
      isActivePinnedPushToTalkMode()
      && activePinnedPushToTalkTargetOrder.value !== undefined
    ) {
      activePinnedPushToTalkTargetOrder.value = order
      applyGooseMicToPanelSessions()
    }
  }

  const setEditMode = (value: boolean) => {
    isEditMode.value = value
  }

  const setPendingDialSlotOrder = (order: PinnedCallSlotOrder | null) => {
    pendingDialSlotOrder.value = order
  }

  const consumePendingDialSlotOrder = (): PinnedCallSlotOrder | null => {
    const order = pendingDialSlotOrder.value
    pendingDialSlotOrder.value = null
    return order
  }

  const assignSessionToSlot = (
    order: PinnedCallSlotOrder,
    sessionId: string,
  ): PinnedCallSlot | undefined => {
    const slot = getSlotByOrder(order)
    if (!slot) return undefined

    // WUI-5615: слот в группе мог остаться с default mic/volume (reload) —
    // перед apply к сессии выровнять под intent групп.
    applyGroupsIntentToSlot(order)
    const syncedSlot = getSlotByOrder(order) ?? slot

    slotSessionIds.value = new Map(slotSessionIds.value).set(order, sessionId)
    if (pendingDialSlotOrder.value === order) {
      pendingDialSlotOrder.value = null
    }
    applySlotAudioState(syncedSlot)

    return syncedSlot
  }

  const assignSessionToFreeSlot = (
    sessionId: string,
    pServed: string,
  ): PinnedCallSlot | undefined => {
    const slot = getSlotsByPServed(pServed)
      .filter(item => !slotSessionIds.value.has(item.order))
      .sort((left, right) => left.slotIndex - right.slotIndex)
      .at(0)

    if (!slot) return undefined

    return assignSessionToSlot(slot.order, sessionId)
  }

  const clearSessionIdFromSlot = (sessionId: string): PinnedCallSlot | undefined => {
    const entry = Array.from(slotSessionIds.value.entries())
      .find(([, storedSessionId]) => storedSessionId === sessionId)

    if (!entry) return undefined

    const [order] = entry
    const slot = getSlotByOrder(order)
    const nextSessionIds = new Map(slotSessionIds.value)
    nextSessionIds.delete(order)
    slotSessionIds.value = nextSessionIds

    return slot
  }

  /** Сессия привязана к слоту panel (pin-path) — не в call-card / очереди трубки. */
  const isPinnedPanelSessionId = (sessionId: string): boolean => {
    for (const boundSessionId of slotSessionIds.value.values()) {
      if (boundSessionId === sessionId) return true
    }

    return false
  }

  const getSlotBySessionId = (sessionId: string): PinnedCallSlot | undefined => {
    for (const [order, boundSessionId] of slotSessionIds.value.entries()) {
      if (boundSessionId === sessionId) {
        return getSlotByOrder(order)
      }
    }

    return undefined
  }

  const getFirstFreeSlotOrder = (): PinnedCallSlotOrder | undefined =>
    gridCells.value.find(cell => !cell.slot)?.order

  const hasFreeSlot = computed(() => getFirstFreeSlotOrder() !== undefined)

  const hasFreeSlotByPServed = (pServed: string): boolean => {
    return getSlotsByPServed(pServed).some(slot => !slotSessionIds.value.has(slot.order))
  }

  function getSessionForSlot (slot: PinnedCallSlot) {
    const sessionId = slotSessionIds.value.get(slot.order)
    if (!sessionId) return undefined

    return useSessionStore().getSessionById(sessionId)
  }

  const isGooseMicEnabledForPinned = (): boolean => {
    const gooseDevice = useDevicesStore().readyPreferredGoose

    if (!gooseDevice || gooseDevice.type !== LogicalMediaDeviceTypeEnum.GOOSE) {
      return true
    }

    return useDevicesSessionsStore().isGooseMicGloballyEnabled(gooseDevice)
  }

  const isActivePinnedPushToTalkMode = (): boolean => {
    const gooseDevice = useDevicesStore().readyPreferredGoose

    return gooseDevice?.type === LogicalMediaDeviceTypeEnum.GOOSE
      && gooseDevice.mode === 'pushToTalk'
      && gooseDevice.pttScope === 'activePinned'
  }

  /** Effective mic transmission for a slot (goose global × mode/scope × slot). */
  const isSlotMicTransmissionEnabled = (slot: PinnedCallSlot): boolean => {
    if (isActivePinnedPushToTalkMode()) {
      // Без press speak — mute всем; с press — только зафиксированный active slot.
      if (activePinnedPushToTalkTargetOrder.value === undefined) return false

      return isGooseMicEnabledForPinned()
        && activePinnedPushToTalkTargetOrder.value === slot.order
    }

    return isGooseMicEnabledForPinned() && slot.micState
  }

  const startActivePinnedPushToTalkOverride = (): void => {
    if (!isActivePinnedPushToTalkMode()) return

    activePinnedPushToTalkTargetOrder.value = activeSlotOrder.value
  }

  const stopActivePinnedPushToTalkOverride = (): void => {
    activePinnedPushToTalkTargetOrder.value = undefined
  }

  function applySlotAudioState (slot: PinnedCallSlot): void {
    const session = getSessionForSlot(slot)
    if (!session) return

    session.setAudioPlayerVolume(
      clampPinnedCallVolume(slot.volume) * globalVolumeMultiplier.value,
    )

    const gooseDevice = useDevicesStore().readyPreferredGoose
    const currentSessionDevice = session.currentDevice?.value

    // Сессия на другом устройстве (трубка) — не трогаем mic через goose-глобал.
    if (
      currentSessionDevice?.id
      && gooseDevice?.id
      && currentSessionDevice.id !== gooseDevice.id
    ) {
      return
    }

    if (isSlotMicTransmissionEnabled(slot)) {
      session.unmute()
    } else {
      session.mute()
    }
  }

  /** Применить глобальный mute Goose ко всем panel-сессиям на goose. */
  const applyGooseMicToPanelSessions = (): void => {
    for (const order of slotSessionIds.value.keys()) {
      const slot = getSlotByOrder(order)
      if (!slot) continue

      applySlotAudioState(slot)
    }
  }

  /**
   * После смены preferred Goose: перепривязать panel-сессии со старого goose
   * на новый (сессии на трубке не трогаем).
   */
  const rebindPanelSessionsToPreferredGoose = (): void => {
    const goose = useDevicesStore().readyPreferredGoose
    if (!goose) return

    const devicesSessionsStore = useDevicesSessionsStore()

    for (const order of slotSessionIds.value.keys()) {
      const slot = getSlotByOrder(order)
      const session = slot ? getSessionForSlot(slot) : undefined
      if (!session) continue

      const currentDevice = session.currentDevice?.value
      if (
        currentDevice
        && currentDevice.type !== LogicalMediaDeviceTypeEnum.GOOSE
      ) {
        continue
      }

      if (currentDevice?.id === goose.id) continue

      try {
        if (session.session?.connection) {
          devicesSessionsStore.bindSessionToDevice(session.sessionId, goose.id, {
            holdOthers: false,
          })
        } else {
          devicesSessionsStore.bindSessionDeviceAffinity(session.sessionId, goose.id)
        }
      } catch (e) {
        console.error('Failed to rebind pinned session to preferred goose', e)
      }
    }

    applyGooseMicToPanelSessions()
  }

  const applyGlobalVolumeToPanelSessions = (): void => {
    for (const order of slotSessionIds.value.keys()) {
      const slot = getSlotByOrder(order)
      const session = slot ? getSessionForSlot(slot) : undefined
      if (!slot || !session) continue

      session.setAudioPlayerVolume(
        clampPinnedCallVolume(slot.volume) * globalVolumeMultiplier.value,
      )
    }
  }

  const changeGlobalVolumeMultiplier = (volume: number) => {
    globalVolumeMultiplier.value = volume
    applyGlobalVolumeToPanelSessions()
  }

  const fetchPanel = async (force = false): Promise<PinnedCallPanel> => {
    if (panel.value && !force) return panel.value

    const { fetchPinnedCallsPanel } = usePinnedCallsApi()

    try {
      loading.value = true
      error.value = null

      const { data } = await fetchPinnedCallsPanel()
      const nextPanel = normalizePinnedCallPanel(data)
      setPanel(nextPanel)

      // Legacy: groups с members, а groupsLayout null — дописать layout на API.
      if (
        nextPanel.groupsLayout == null
        && nextPanel.groups.some(group => group.members.length > 0)
      ) {
        try {
          await updateGroupsLayout(inferPinnedCallsGroupsLayout(nextPanel.groups))
        } catch (healError) {
          console.warn('Failed to heal missing groupsLayout for legacy panel', healError)
        }
      }

      // WUI-5615: после normalize слоты с default mic — выровнять под intent групп.
      syncAllGroupsAudioToMembers()

      return panel.value ?? nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load pinned calls panel'
      throw e
    } finally {
      loading.value = false
    }
  }

  const upsertSlot = async (
    order: PinnedCallSlotOrder,
    slot: SlotDraft,
  ): Promise<PinnedCallSlot> => {
    const { upsertPinnedCallSlot } = usePinnedCallsApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await upsertPinnedCallSlot(order, toPinnedCallSlotUpsertBody(slot))
      const nextSlot = requirePinnedCallSlot(normalizePinnedCallSlot(data))
      const mergedSlot = preserveSlotRuntimeAudio(nextSlot, getSlotByOrder(order))
      upsertLocalSlot(mergedSlot)
      applySlotAudioState(mergedSlot)

      return mergedSlot
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save pinned call slot'
      throw e
    } finally {
      saving.value = false
    }
  }

  const releaseSessionToHandset = (sessionId: string) => {
    const session = useSessionStore().getSessionById(sessionId)
    if (!session) return

    const handset = useDevicesStore().readyHandsetDevices.at(0)
    if (!handset) return

    try {
      // Connected (после clear pinned): нужен полный bind — иначе playback/affinity
      // на трубке, а mic track остаётся от goose до ручного transfer между трубками.
      // Incoming/ringing без peerconnection — только affinity (полный bind падает на getSenders).
      if (session.session?.connection) {
        useDevicesSessionsStore().bindSessionToDevice(sessionId, handset.id, {
          holdOthers: false,
        })
      } else {
        useDevicesSessionsStore().bindSessionDeviceAffinity(sessionId, handset.id)
      }
    } catch (e) {
      console.error('Failed to release pinned session to handset', e)
    }
  }

  const clearSlot = async (order: PinnedCallSlotOrder): Promise<void> => {
    const { clearPinnedCallSlot } = usePinnedCallsApi()
    const boundSessionId = slotSessionIds.value.get(order)
    const slot = getSlotByOrder(order)

    try {
      saving.value = true
      error.value = null

      await clearPinnedCallSlot(order)

      // Backend уже убирает member из groups; UI — локально, без DELETE (иначе 404).
      if (slot) {
        const member = {
          pServed: slot.pServed,
          slotIndex: slot.slotIndex,
        }
        for (const group of getGroupsBySlot(slot)) {
          removeLocalGroupMember(group.index, member)
        }
      }

      removeLocalSlot(order)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to clear pinned call slot'
      throw e
    } finally {
      saving.value = false
    }

    // После успешного clear — вернуть сессию в очередь трубки, не ломая clear ошибкой media.
    if (boundSessionId) {
      releaseSessionToHandset(boundSessionId)
    }
  }

  const reorderSlots = async (
    fromOrder: PinnedCallSlotOrder,
    toOrder: PinnedCallSlotOrder,
  ): Promise<PinnedCallPanel> => {
    const { reorderPinnedCallSlots } = usePinnedCallsApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await reorderPinnedCallSlots(toPinnedCallSlotsReorderBody(fromOrder, toOrder))
      const nextPanel = normalizePinnedCallPanel(data)
      const nextSessionIds = new Map(slotSessionIds.value)
      const fromSessionId = nextSessionIds.get(fromOrder)
      const toSessionId = nextSessionIds.get(toOrder)

      nextSessionIds.delete(fromOrder)
      nextSessionIds.delete(toOrder)
      if (fromSessionId) nextSessionIds.set(toOrder, fromSessionId)
      if (toSessionId) nextSessionIds.set(fromOrder, toSessionId)

      slotSessionIds.value = nextSessionIds
      setPanel(nextPanel)

      return nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to reorder pinned call slots'
      throw e
    } finally {
      saving.value = false
    }
  }

  const updateGroup = async (
    index: PinnedCallGroupIndex,
    group: Omit<PinnedCallGroup, 'index'>,
  ): Promise<PinnedCallGroup> => {
    const { updatePinnedCallGroup } = usePinnedCallsApi()

    try {
      saving.value = true
      error.value = null

      await ensureGroupsLayoutCommittedForFirstMembers(group.members.length)

      const { data } = await updatePinnedCallGroup(index, toPinnedCallGroupUpdateBody(group))
      const nextGroup = requirePinnedCallGroup(normalizePinnedCallGroup(data))
      upsertLocalGroup(nextGroup)
      // WUI-5615: сразу выровнять runtime mic/volume всех текущих members под intent группы.
      syncGroupAudioToCurrentMembers(index)

      return nextGroup
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update pinned call group'
      throw e
    } finally {
      saving.value = false
    }
  }

  /**
   * Обмен содержимым двух group index (members + mic/volume intent).
   * Optimistic UI → PUT /groups/reorder; при ошибке откат.
   * Ответ panel DTO не применяем к groups (сервер может отдать stale) —
   * локальный swap уже отражает целевое состояние.
   */
  const swapGroups = async (
    fromIndex: PinnedCallGroupIndex,
    toIndex: PinnedCallGroupIndex,
  ): Promise<void> => {
    if (fromIndex === toIndex) return

    if (!isValidPinnedCallGroupIndex(fromIndex) || !isValidPinnedCallGroupIndex(toIndex)) {
      throw new Error('Некорректный индекс группы')
    }

    const resolvePayload = (index: PinnedCallGroupIndex): GroupPayload => {
      const group = getGroupByIndex(index)
      if (!group) {
        return {
          ...EMPTY_GROUP_PAYLOAD,
          members: [],
        }
      }

      return {
        micState: group.micState,
        volumeState: group.volumeState,
        members: group.members.map(member => ({ ...member })),
      }
    }

    const fromPayload = resolvePayload(fromIndex)
    const toPayload = resolvePayload(toIndex)

    if (areGroupPayloadsEqual(fromPayload, toPayload)) return

    const currentPanel = panel.value ?? createEmptyPinnedCallPanel()
    const previousGroups = currentPanel.groups.map(group => ({
      ...group,
      members: group.members.map(member => ({ ...member })),
    }))
    const previousVolumes = new Map(groupPlaybackVolumeByIndex.value)

    upsertLocalGroup({ index: fromIndex, ...toPayload })
    upsertLocalGroup({ index: toIndex, ...fromPayload })

    const swappedVolumes = new Map(previousVolumes)
    const fromVolume = swappedVolumes.get(fromIndex)
    const toVolume = swappedVolumes.get(toIndex)
    swappedVolumes.delete(fromIndex)
    swappedVolumes.delete(toIndex)
    if (fromVolume !== undefined) swappedVolumes.set(toIndex, fromVolume)
    if (toVolume !== undefined) swappedVolumes.set(fromIndex, toVolume)
    groupPlaybackVolumeByIndex.value = swappedVolumes

    const { reorderPinnedCallGroups } = usePinnedCallsApi()

    try {
      saving.value = true
      error.value = null

      await reorderPinnedCallGroups(
        toPinnedCallGroupsReorderBody(fromIndex, toIndex),
      )
    } catch (e) {
      if (panel.value) {
        panel.value = {
          ...panel.value,
          groups: previousGroups,
        }
      }
      groupPlaybackVolumeByIndex.value = previousVolumes

      error.value = e instanceof Error ? e.message : 'Failed to swap pinned call groups'
      throw e
    } finally {
      saving.value = false
    }
  }

  const addGroupMember = async (
    index: PinnedCallGroupIndex,
    member: PinnedCallGroupMember,
  ): Promise<PinnedCallGroup> => {
    const { addPinnedCallGroupMember } = usePinnedCallsApi()

    try {
      saving.value = true
      error.value = null

      await ensureGroupsLayoutCommittedForFirstMembers(1)

      const { data } = await addPinnedCallGroupMember(index, toPinnedCallGroupMemberBody(member))
      const nextGroup = requirePinnedCallGroup(normalizePinnedCallGroup(data))
      upsertLocalGroup(nextGroup)
      // WUI-5615: сразу выровнять runtime mic/volume всех текущих members под intent группы.
      syncGroupAudioToCurrentMembers(index)

      return nextGroup
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add pinned call group member'
      throw e
    } finally {
      saving.value = false
    }
  }

  const removeGroupMember = async (
    index: PinnedCallGroupIndex,
    member: PinnedCallGroupMember,
  ): Promise<void> => {
    const { removePinnedCallGroupMember } = usePinnedCallsApi()

    try {
      saving.value = true
      error.value = null

      await removePinnedCallGroupMember(index, toPinnedCallGroupMemberBody(member))
      removeLocalGroupMember(index, member)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove pinned call group member'
      throw e
    } finally {
      saving.value = false
    }
  }

  const patchSlotRuntimeAudio = (
    order: PinnedCallSlotOrder,
    patch: { micState?: boolean; volume?: number },
  ): PinnedCallSlot | undefined => {
    const slot = getSlotByOrder(order)
    if (!slot) return undefined

    const nextSlot: PinnedCallSlot = {
      ...slot,
      micState: patch.micState ?? slot.micState,
      prevMicState: patch.micState === undefined ? slot.prevMicState : slot.micState,
      volume: patch.volume === undefined
        ? slot.volume
        : clampPinnedCallVolume(patch.volume),
      prevVolume: patch.volume === undefined ? slot.prevVolume : slot.volume,
    }

    upsertLocalSlot(nextSlot)
    applySlotAudioState(nextSlot)

    return nextSlot
  }

  /** Toggle слышимости линии (playback): volume 0 ↔ prevVolume. UI-иконка active. */
  const toggleSlotLineAudible = (order: PinnedCallSlotOrder): PinnedCallSlot | undefined => {
    const slot = getSlotByOrder(order)
    if (!slot) return undefined

    if (slot.volume > 0) {
      return patchSlotRuntimeAudio(order, { volume: 0 })
    }

    const restoreVolume = slot.prevVolume > 0
      ? slot.prevVolume
      : PINNED_CALLS_INITIAL_VOLUME

    return patchSlotRuntimeAudio(order, { volume: restoreVolume })
  }

  type GroupAudioOverridePatch = {
    micState?: boolean
    /**
     * false → mute intent группы; effective volume members = max по другим audible-группам (или 0);
     * true → restore последнего group volume (или INITIAL) всем members одинаково.
     */
    volumeState?: boolean
    /** Явный уровень громкости для всех members (приоритетнее volumeState). */
    volume?: number
  }

  const getGroupPlaybackVolume = (index: PinnedCallGroupIndex): number => {
    return groupPlaybackVolumeByIndex.value.get(index) ?? PINNED_CALLS_INITIAL_VOLUME
  }

  const rememberGroupPlaybackVolume = (
    index: PinnedCallGroupIndex,
    volume: number,
  ): void => {
    if (volume <= 0) return

    const next = new Map(groupPlaybackVolumeByIndex.value)
    next.set(index, clampPinnedCallVolume(volume))
    groupPlaybackVolumeByIndex.value = next
  }

  /**
   * Group override (runtime):
   * применяет mic/volume **только к members** группы (ключ `pServed + slotIndex`).
   * Non-members не трогаем.
   * Mic: effective = OR по всем группам слота.
   * Volume > 0: last-action этой группы.
   * Volume = 0 / mute: max last-volume по другим группам слота с volumeState.
   */
  const applyGroupAudioToMembers = (
    index: PinnedCallGroupIndex,
    patch: GroupAudioOverridePatch,
  ): PinnedCallSlot[] => {
    const group = getGroupByIndex(index)
    if (!group) return []

    const nextMicState = patch.micState ?? group.micState
    const nextVolumeState = patch.volume !== undefined
      ? patch.volume > 0
      : (patch.volumeState ?? group.volumeState)

    if (
      patch.micState !== undefined
      || patch.volumeState !== undefined
      || patch.volume !== undefined
    ) {
      upsertLocalGroup({
        ...group,
        micState: nextMicState,
        volumeState: nextVolumeState,
      })
    }

    let requestedVolume: number | undefined

    if (patch.volume !== undefined) {
      requestedVolume = clampPinnedCallVolume(patch.volume)
      rememberGroupPlaybackVolume(index, requestedVolume)
    } else if (patch.volumeState === false) {
      requestedVolume = 0
    } else if (patch.volumeState === true) {
      const restore = getGroupPlaybackVolume(index)
      requestedVolume = restore > 0 ? restore : PINNED_CALLS_INITIAL_VOLUME
      rememberGroupPlaybackVolume(index, requestedVolume)
    }

    const resolveEffectiveSlotVolume = (
      slot: PinnedCallSlot,
      volume: number,
    ): number => {
      if (volume > 0) return volume

      // Mute / 0: не глушим слот, если он ещё слышен в другой группе.
      const otherVolumes = getGroupsBySlot(slot)
        .filter(item => item.index !== index && item.volumeState)
        .map(item => getGroupPlaybackVolume(item.index))
        .filter(itemVolume => itemVolume > 0)

      if (!otherVolumes.length) return 0

      return Math.max(...otherVolumes)
    }

    const memberSlots = getGroupSlots(index)
    const applied: PinnedCallSlot[] = []

    for (const slot of memberSlots) {
      const slotPatch: { micState?: boolean; volume?: number } = {}

      if (patch.micState !== undefined) {
        // OR: slot слышит нас, если хотя бы одна его группа с mic on.
        const groupsForSlot = getGroupsBySlot(slot)
        slotPatch.micState = groupsForSlot.some(item => item.micState)
      }

      if (requestedVolume !== undefined) {
        slotPatch.volume = resolveEffectiveSlotVolume(slot, requestedVolume)
      }

      if (slotPatch.micState === undefined && slotPatch.volume === undefined) continue

      const nextSlot = patchSlotRuntimeAudio(slot.order, slotPatch)
      if (nextSlot) applied.push(nextSlot)
    }

    return applied
  }

  /**
   * WUI-5615: после смены состава группы применить текущий intent ко всем members.
   * Пустой patch в applyGroupAudioToMembers слоты не трогает — передаём mic/volume явно.
   */
  const syncGroupAudioToCurrentMembers = (index: PinnedCallGroupIndex): void => {
    const group = getGroupByIndex(index)
    if (!group?.members.length) return

    applyGroupAudioToMembers(index, {
      micState: group.micState,
      volumeState: group.volumeState,
    })
  }

  /** WUI-5615: выровнять все группы с members (после fetch/reload). */
  const syncAllGroupsAudioToMembers = (): void => {
    for (const group of groups.value) {
      if (!group.members.length) continue
      syncGroupAudioToCurrentMembers(group.index)
    }
  }

  /**
   * WUI-5615: выровнять один слот под intent всех его групп (перед bind сессии).
   * Mic = OR; volume = max last-volume audible-групп (или INITIAL), иначе 0.
   */
  const applyGroupsIntentToSlot = (order: PinnedCallSlotOrder): void => {
    const slot = getSlotByOrder(order)
    if (!slot) return

    const groupsForSlot = getGroupsBySlot(slot)
    if (!groupsForSlot.length) return

    const micState = groupsForSlot.some(group => group.micState)
    const audibleGroups = groupsForSlot.filter(group => group.volumeState)

    let volume = 0
    if (audibleGroups.length) {
      const volumes = audibleGroups
        .map(group => getGroupPlaybackVolume(group.index))
        .filter(itemVolume => itemVolume > 0)
      volume = volumes.length ? Math.max(...volumes) : PINNED_CALLS_INITIAL_VOLUME
    }

    patchSlotRuntimeAudio(order, { micState, volume })
  }

  const reset = () => {
    panel.value = null
    loading.value = false
    saving.value = false
    error.value = null
    activeSlotOrder.value = null
    isEditMode.value = false
    slotSessionIds.value = new Map()
    draftGroupsLayout.value = null
    pendingDialSlotOrder.value = null
    globalVolumeMultiplier.value = INITIAL_GLOBAL_VOLUME
    groupPlaybackVolumeByIndex.value = new Map()
    activePinnedPushToTalkTargetOrder.value = undefined
  }

  return {
    // Данные для отрисовки сетки и выбранного слота.
    panel,
    slots,
    groups,
    gridCells,
    groupCells,
    slotsByOrder,
    groupsByIndex,
    activeSlot,
    activeSlotSession,
    activeSlotOrder,
    globalVolumeMultiplier,
    draftGroupsLayout,
    persistedGroupsLayout,
    groupsLayout,
    hasAnyGroupMembers,

    // Состояние запросов и режима редактирования.
    loading,
    saving,
    error,
    isEditMode,

    // API-действия для базовой раскладки слотов.
    fetchPanel,
    upsertSlot,
    clearSlot,
    reorderSlots,
    updateGroup,
    addGroupMember,
    removeGroupMember,
    setDraftGroupsLayout,
    clearDraftGroupsLayout,
    updateGroupsLayout,
    swapGroups,

    // Хелперы для поиска слотов, групп и добавления ещё одного слота с тем же pServed.
    getSlotByOrder,
    getGroupByIndex,
    getSlotsByPServed,
    getNextSlotIndex,
    getSlotByGroupMember,
    getGroupSlots,
    getGroupsBySlot,
    hasGroupMember,
    getSessionForSlot,
    getSlotBySessionId,
    applySlotAudioState,
    applyGooseMicToPanelSessions,
    rebindPanelSessionsToPreferredGoose,
    changeGlobalVolumeMultiplier,
    patchSlotRuntimeAudio,
    toggleSlotLineAudible,
    groupPlaybackVolumeByIndex,
    getGroupPlaybackVolume,
    applyGroupAudioToMembers,
    isActivePinnedPushToTalkMode,
    isSlotMicTransmissionEnabled,
    startActivePinnedPushToTalkOverride,
    stopActivePinnedPushToTalkOverride,

    // UI-действия для выбора слота и режима редактирования.
    setActiveSlot,
    setEditMode,

    // Runtime-привязка сессий. sessionId хранится только на фронте.
    slotSessionIds,
    pendingDialSlotOrder,
    setPendingDialSlotOrder,
    consumePendingDialSlotOrder,
    assignSessionToSlot,
    assignSessionToFreeSlot,
    clearSessionIdFromSlot,
    isPinnedPanelSessionId,
    hasFreeSlot,
    hasFreeSlotByPServed,
    getFirstFreeSlotOrder,

    // Очистка состояния при logout/reset страницы.
    reset,
  }
})
