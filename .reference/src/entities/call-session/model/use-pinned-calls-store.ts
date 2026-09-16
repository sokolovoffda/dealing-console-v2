import { defineStore, storeToRefs } from 'pinia'
import { computed, readonly, ref, watch } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { useSessionStore, checkDtoByPServed, resolveContactByPServed, selectConference, selectContact } from '@/entities/call-session'
import { ConferenceDto } from '@/entities/conference'
import { Contact, useContactCachedStore } from '@/entities/contact'
import { type GroupPinnedSlotMember, useGroupContactsStore } from '@/entities/group-contacts'
import { usePreferencesStore } from '@/entities/preference'

import {
  LogicalMediaDeviceTypeEnum,
  type LogicalMediaDevice,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'
import { conferencePServedToNumber, pServedIsNotGroup, roomGuidToPServed } from '@/shared/services'

export interface PinnedCall {
  pServed: string;
  slotIndex?: number;
  sessionId?: string | null;
  title: string;
  volume: number;
  prevVolume: number;
  micState: boolean;
  prevMicState: boolean;
  order: number;
}

type PServed = string
type SlotItem = PinnedCall | null
type MicAction = 'toggle' | 'set' | 'mute-temp' | 'unmute-temp'
type ActivePinnedPushToTalkTarget = PServed | null | undefined
type PinnedDto = Pick<Contact, 'pServed' | 'name'> | Pick<ConferenceDto, 'pServed' | 'name'>

interface ToggleMicOptions {
  pServed: PServed
  action: MicAction
  value?: boolean
  updatePrefs?: boolean
}

interface TogglePinnedCallMicOptions {
  order: number
  action: MicAction
  value?: boolean
  updatePrefs?: boolean
}

interface ChangePinnedCallVolumeOptions {
  order: number
  volume: number
  temp?: 'mute' | 'unmute'
  updatePrefs?: boolean
}

const INITIAL_VOLUME = 1
const MAX_SLOTS_SIZE = 16
const pendingSessionMicStateSync = new Map<string, boolean>()

const normalizePinnedCall = (pin: SlotItem): SlotItem => {
  if (!pin) {
    return null
  }

  return {
    ...pin,
    slotIndex: typeof pin.slotIndex === 'number' ? pin.slotIndex : 1,
    sessionId: null,
  }
}

const serializePinnedCall = (pin: SlotItem): SlotItem => {
  if (!pin) {
    return null
  }

  return {
    ...pin,
    sessionId: null,
  }
}

export const usePinnedCallsStore = defineStore('pinned-calls', () => {
  const isReady = ref(false)
  const { sessions, getSessionById, getSessionsByPServed, getPreferredSessionByPServed } = useSessionStore()
  const { getLocalByPServed } = useContactCachedStore()
  const devicesStore = useDevicesStore()
  
  const { readyGooseDevices, readyQueueDevices } = storeToRefs(devicesStore)
  const slots = ref(new Map<number, SlotItem>(Array.from({ length: MAX_SLOTS_SIZE }, (_, i) => [i + 1, null])))
  const globalVolumeMultiplier = ref(INITIAL_VOLUME)
  const activePinnedCall = ref<SlotItem>(null)
  const activePinnedCallSessionId = ref<string | null>(null)
  const activePinnedPushToTalkTargetPServed = ref<ActivePinnedPushToTalkTarget>(undefined)

  const pServedArray = computed(() => Array.from(slots.value.values()).reduce((acc, pin) => {
    if (pin?.pServed) {
      acc.push(pin.pServed)
    }
    return acc
  }, <string[]>[]))
  const getPinnedCallsByPServed = (pServed: PServed): PinnedCall[] => {
    return Array.from(slots.value.values()).reduce((acc, pin) => {
      if (pin?.pServed === pServed) {
        acc.push(pin)
      }

      return acc
    }, <PinnedCall[]>[])
  }
  const getFirstPinnedCallByPServed = (pServed: PServed): PinnedCall | undefined => {
    return getPinnedCallsByPServed(pServed)
      .sort((left, right) => (left.slotIndex ?? 1) - (right.slotIndex ?? 1))
      .at(0)
  }
  const getNextSlotIndex = (pServed: PServed): number => {
    return getPinnedCallsByPServed(pServed)
      .reduce((maxIndex, pin) => Math.max(maxIndex, pin.slotIndex ?? 1), 0) + 1
  }
  const getPinnedCallBySessionId = (sessionId: string): PinnedCall | undefined => {
    for (const slot of slots.value.values()) {
      if (slot?.sessionId === sessionId) {
        return slot
      }
    }
  }
  const getPinnedCallByOrder = (order: number): PinnedCall | undefined => {
    const slot = slots.value.get(order)

    return slot ?? undefined
  }
  const getPinnedCallBySlotMember = (member: GroupPinnedSlotMember): PinnedCall | undefined => {
    return getPinnedCallsByPServed(member.pServed)
      .find((pin) => (pin.slotIndex ?? 1) === member.slotIndex)
  }
  const isPinnedSessionId = (sessionId: string): boolean => {
    return Boolean(getPinnedCallBySessionId(sessionId))
  }
  const getFreePinnedCallByPServed = (pServed: PServed): PinnedCall | undefined => {
    return getPinnedCallsByPServed(pServed)
      .filter((pin) => !pin.sessionId)
      .sort((left, right) => (left.slotIndex ?? 1) - (right.slotIndex ?? 1))
      .at(0)
  }
  const assignSessionToPinnedCall = (sessionId: string, pServed: PServed): PinnedCall | undefined => {
    const slot = getFreePinnedCallByPServed(pServed)

    if (!slot) {
      return undefined
    }

    slot.sessionId = sessionId

    if (activePinnedCall.value?.order === slot.order) {
      activePinnedCallSessionId.value = sessionId
    }

    return slot
  }
  const assignSessionToPinnedCallByOrder = (sessionId: string, order: number): PinnedCall | undefined => {
    const slot = getPinnedCallByOrder(order)

    if (!slot) {
      return undefined
    }

    slot.sessionId = sessionId

    if (activePinnedCall.value?.order === slot.order) {
      activePinnedCallSessionId.value = sessionId
    }

    return slot
  }
  const clearSessionIdFromPinnedCall = (sessionId: string): PinnedCall | undefined => {
    const slot = getPinnedCallBySessionId(sessionId)

    if (!slot) {
      return undefined
    }

    slot.sessionId = null

    if (activePinnedCall.value?.order === slot.order) {
      activePinnedCallSessionId.value = null
    }

    return slot
  }
  const getPinnedSessions = (pServed: PServed) => getSessionsByPServed(pServed)
  const getPinnedSessionsByCall = (pinnedCall: PinnedCall): ReturnType<typeof getSessionsByPServed> => {
    if (!pinnedCall.sessionId) {
      return []
    }

    const session = getSessionById(pinnedCall.sessionId)

    return session ? [session] : []
  }
  const getSessionForPinnedCall = (pinnedCall: PinnedCall): ReturnType<typeof getSessionById> => {
    if (pinnedCall.sessionId) {
      const sessionById = getSessionById(pinnedCall.sessionId)

      if (sessionById) {
        return sessionById
      }

      // Stale id после F5 / переподключения
      pinnedCall.sessionId = null

      if (activePinnedCall.value?.order === pinnedCall.order) {
        activePinnedCallSessionId.value = null
      }
    }

    const session = getPreferredSessionByPServed(
      pinnedCall.pServed,
      activePinnedCall.value?.order === pinnedCall.order
        ? activePinnedCallSessionId.value ?? undefined
        : undefined,
    )

    if (session) {
      assignSessionToPinnedCallByOrder(session.sessionId, pinnedCall.order)
    }

    return session
  }
  const getPreferredPinnedSession = (pServed: PServed) => getPreferredSessionByPServed(
    pServed,
    activePinnedCall.value?.pServed === pServed ? activePinnedCallSessionId.value ?? undefined : undefined,
  )
  const activePinnedCallSession = computed(() => {
    if (!activePinnedCall.value) {
      return null
    }

    return getSessionForPinnedCall(activePinnedCall.value)
  })

  const applyToPinnedSessions = (pServed: PServed, callback: (session: ReturnType<typeof getPreferredPinnedSession>) => void): void => {
    getPinnedSessions(pServed).forEach((session) => callback(session))
  }

  const getPinnedSessionsDevice = (): LogicalMediaDevice | undefined => {
    return readyGooseDevices.value.at(0)
  }

  const isActivePinnedPushToTalkMode = (device?: LogicalMediaDevice): boolean => {
    return device?.type === LogicalMediaDeviceTypeEnum.GOOSE
    && device?.mode === 'pushToTalk'
    && device.pttScope === 'activePinned'
  }

  const isGooseDeviceMicEnabled = (device: LogicalMediaDevice): boolean => {
    return useDevicesSessionsStore().isGooseMicGloballyEnabled(device)
  }

  const isPinnedCallManagedByPinnedDevice = (target: PServed | PinnedCall): boolean => {
    const pinnedCall = typeof target === 'string' ? getPinnedCallByPServed(target) : target

    if (!pinnedCall) {
      return false
    }

    const pinnedDevice = getPinnedSessionsDevice()
    const currentSessionDevice = getSessionForPinnedCall(pinnedCall)?.currentDevice?.value

    return !currentSessionDevice?.id || currentSessionDevice.id === pinnedDevice?.id
  }

  const isPinnedCallMicEffective = (target: PServed | PinnedCall): boolean => {
    const pinnedCall = typeof target === 'string' ? getPinnedCallByPServed(target) : target

    if (!pinnedCall) {
      return false
    }

    const pinnedDevice = getPinnedSessionsDevice()
    const session = getSessionForPinnedCall(pinnedCall)
    const currentSessionDevice = session?.currentDevice?.value

    if (currentSessionDevice?.id && currentSessionDevice.id !== pinnedDevice?.id) {
      return session?.isMuted ? !session.isMuted.value : pinnedCall.micState
    }

    if (!pinnedDevice || pinnedDevice.type !== LogicalMediaDeviceTypeEnum.GOOSE) {
      return pinnedCall.micState
    }

    if (isActivePinnedPushToTalkMode(pinnedDevice) && activePinnedPushToTalkTargetPServed.value !== undefined) {
      return isGooseDeviceMicEnabled(pinnedDevice)
        && activePinnedPushToTalkTargetPServed.value === pinnedCall.pServed
    }

    // Линию слышно только если глобально активен goose и line-level micState разрешает передачу.
    return isGooseDeviceMicEnabled(pinnedDevice) && pinnedCall.micState
  }

  const isPinnedCallMicDisplayedEnabled = (target: PServed | PinnedCall): boolean => {
    const pinnedCall = typeof target === 'string' ? getPinnedCallByPServed(target) : target

    if (!pinnedCall) {
      return false
    }

    const pinnedDevice = getPinnedSessionsDevice()

    if (isActivePinnedPushToTalkMode(pinnedDevice) || !isPinnedCallManagedByPinnedDevice(pinnedCall)) {
      return isPinnedCallMicEffective(pinnedCall)
    }

    return pinnedCall.micState
  }

  const applyPinnedCallMicState = (target: PServed | PinnedCall): void => {
    const pinnedCall = typeof target === 'string' ? getPinnedCallByPServed(target) : target

    if (!pinnedCall) {
      return
    }

    const sessionsByPServed = typeof target === 'string'
      ? getPinnedSessions(pinnedCall.pServed)
      : getPinnedSessionsByCall(pinnedCall)

    if (!sessionsByPServed.length) {
      return
    }

    const shouldUnmute = isPinnedCallMicEffective(pinnedCall)

    sessionsByPServed.forEach((session) => {
      if (!session) {
        return
      }

      const targetMutedState = !shouldUnmute
      if (session.isMuted.value !== targetMutedState) {
        pendingSessionMicStateSync.set(session.sessionId, shouldUnmute)
      }

      if (shouldUnmute) {
        session.unmute()
      } else {
        session.mute()
      }
    })
  }

  const applyPinnedCallsMicState = (): void => {
    // Массово применяем текущее глобальное состояние устройства ко всем pinned-линиям.
    slots.value.forEach((item) => {
      if (!item) {
        return
      }

      applyPinnedCallMicState(item)
    })
  }

  const moveSessionToPinnedDevice = (sessionId: string): boolean => {
    const pinnedCall = getPinnedCallBySessionId(sessionId)
    const pinnedDevice = getPinnedSessionsDevice()

    if (!pinnedCall || !pinnedDevice) {
      return false
    }

    useDevicesSessionsStore().bindSessionToDevice(sessionId, pinnedDevice.id)
    applyPinnedCallMicState(pinnedCall)

    return true
  }

  const startActivePinnedPushToTalkOverride = (): void =>{
    const pinnedDevice = getPinnedSessionsDevice()

    if (!isActivePinnedPushToTalkMode(pinnedDevice)){
      return
    }

    activePinnedPushToTalkTargetPServed.value = activePinnedCall.value?.pServed ?? null
  }

  const stopActivePinnedPushToTalkOverride = ():void =>{
    activePinnedPushToTalkTargetPServed.value = undefined
  }

  const updatePinnedCallMicState = (item: PinnedCall, action: MicAction, value?: boolean): boolean => {
    switch (action) {
    case 'toggle':
      item.micState = !item.micState
      item.prevMicState = item.micState
      return true
    case 'set':
      if (value === undefined) {
        console.warn('Value must be provided when using "set" action')
        return false
      }
      item.micState = value
      item.prevMicState = value
      return true
    case 'mute-temp':
      item.micState = false
      return true
    case 'unmute-temp':
      item.micState = item.prevMicState
      return true
    default:
      console.warn('Unknown mic action:', action)
      return false
    }
  }

  const togglePinnedCallMicState = ({ order, action, value, updatePrefs = true }: TogglePinnedCallMicOptions): void => {
    const item = getPinnedCallByOrder(order)
    if (!item) {
      return
    }

    if (!updatePinnedCallMicState(item, action, value)) {
      return
    }

    if (updatePrefs) savePreferencesOnServer()

    applyPinnedCallMicState(item)
  }

  const changePinnedCallVolume = ({
    order,
    volume,
    temp = undefined,
    updatePrefs = true,
  }: ChangePinnedCallVolumeOptions): void => {
    const item = getPinnedCallByOrder(order)
    if (!item) {
      return
    }

    if (temp === undefined) { // если изменили громкость непосредственно у конкретного завешенного слота
      item.volume = volume
      item.prevVolume = volume
    } else { // если групповое действие временно глушит или возвращает громкость слота
      item.volume = temp === 'mute' ? 0 : item.prevVolume
    }

    if (updatePrefs) savePreferencesOnServer()

    getPinnedSessionsByCall(item).forEach((session) => {
      session.setAudioPlayerVolume(item.volume * globalVolumeMultiplier.value)
    })
  }

  const syncPinnedCallMicStateBySession = (sessionId: string, isMuted: boolean, updatePrefs = false): void => {
    if (pendingSessionMicStateSync.has(sessionId)) {
      const expectedMicState = pendingSessionMicStateSync.get(sessionId)
      pendingSessionMicStateSync.delete(sessionId)

      if (expectedMicState === !isMuted) {
        return
      }
    }

    const item = getPinnedCallBySessionId(sessionId)
    if (!item) {
      return
    }

    item.micState = !isMuted
    item.prevMicState = !isMuted

    if (updatePrefs) savePreferencesOnServer()
  }

  const addByPServed = (
    pServed: PServed,
    order: number,
    targetSessionId?: string | null,
    titleFromDto?: string,
  ) => {
    const targetSession = targetSessionId ? getSessionById(targetSessionId) : undefined
    const hasPinnedSlotForSession = targetSessionId ? Boolean(getPinnedCallBySessionId(targetSessionId)) : false
    const hasPServed = Array.from(slots.value.values()).findIndex((item) => item?.pServed === pServed) > -1
    if (hasPinnedSlotForSession) {
      console.debug('pinned slot has already been added by sessionId: ', targetSessionId)
      return
    }
    if (!targetSessionId && hasPServed) {
      console.debug('pinned call has already been added by p-served: ', pServed)
      return
    } // if already exist

    let title
    const volume = INITIAL_VOLUME * globalVolumeMultiplier.value
    const preferredSession = targetSession ?? getPreferredPinnedSession(pServed)
    const sessionsByPServed = getPinnedSessions(pServed)

    if (preferredSession) {
      title = preferredSession.conference?.name
        || titleFromDto
        || getLocalByPServed(pServed)?.name
        || preferredSession.contact?.name
      const device = getPinnedSessionsDevice()

      sessionsByPServed.forEach((session) => {
        session.setAudioPlayerVolume(volume)
        session.unhold()

        if (device?.type === LogicalMediaDeviceTypeEnum.GOOSE) {
          // Уже на трубке — не возвращаем на goose/Main (HANGUP→goose остаётся в moveSessionToPinnedDevice)
          if (session.currentDevice.value?.type === LogicalMediaDeviceTypeEnum.HANDSET) {
            return
          }
          useDevicesSessionsStore().bindSessionToDevice(session.sessionId, device.id)
        }
      })

      if (device?.type !== LogicalMediaDeviceTypeEnum.GOOSE) {
        console.warn('Не найдено выбранное устройство для завешенных линий')
      }
    } else {
      if (titleFromDto) {
        title = titleFromDto
      }

      const { type, dto } = checkDtoByPServed(pServed)
      if (!title && dto && type && ['conference', 'contact'].includes(type)) {
        title = dto.name
      } else if (!title) {
        console.warn('Can`t find session, contact or conference by pServed: ', pServed)
        return
      }
    }

    const pinnedCall: PinnedCall = {
      pServed,
      slotIndex: getNextSlotIndex(pServed),
      sessionId: targetSessionId ?? preferredSession?.sessionId ?? null,
      title: title || 'Не определено',
      volume,
      prevVolume: volume,
      micState: true,
      prevMicState: true,
      order,
    }
    updateSlot(pinnedCall)
    applyPinnedCallMicState(pServed)
    savePreferencesOnServer()
  }

  const addByDto = (dto: PinnedDto, order: number) => {
    addByPServed(dto.pServed, order, undefined, dto.name)
  }

  const removeSelected = (device?: LogicalMediaDevice | null): void => {
    const pin = activePinnedCall.value
    if(!pin) {
      return
    }
    useGroupContactsStore().removeFromAllGroups(pin) // удаляем из всех групп, если был там
    const sessionsByPServed = useSessionStore().getSessionsByPServed(pin.pServed)
    const session = sessionsByPServed[0]
    if (session) { // если у завешенной была сессия, направляем ее на девайс из очереди
      const mediaDevice = device ?? readyQueueDevices.value[0]
      if (mediaDevice) {
        sessionsByPServed.forEach((session) => {
          useDevicesSessionsStore().bindSessionToDevice(session.sessionId, mediaDevice.id)
        })
      } else {
        console.warn('Не найдено устройство для возврата сессии в очередь')
      }
    }
    activePinnedCall.value = null // обнуляем активную
    activePinnedCallSessionId.value = null
    clearSlot(pin.order)
    savePreferencesOnServer()
  }

  const removeByPServed = (pServed: PServed): void => {
    // Ищем в slots нужный pinnedCall
    let targetPin: PinnedCall | null = null
    let orderToRemove: number | null = null

    for (const [order, pin] of slots.value.entries()) {
      if (pin?.pServed === pServed) {
        targetPin = pin
        orderToRemove = order
        break
      }
    }
    if (!targetPin) {
      return
    }

    // Если это активный pinnedCall - обнуляем его
    if (activePinnedCall.value?.pServed === pServed) {
      activePinnedCall.value = null
      activePinnedCallSessionId.value = null
    }
    // Удаляем из всех групп
    useGroupContactsStore().removeFromAllGroups(targetPin)
    // Получаем сессию для возможного перенаправления
    const sessionsByPServed = useSessionStore().getSessionsByPServed(pServed)
    if (sessionsByPServed.length) {
      const mediaDevice = readyQueueDevices.value[0]
      if (mediaDevice) {
        sessionsByPServed.forEach((session) => {
          useDevicesSessionsStore().bindSessionToDevice(session.sessionId, mediaDevice.id)
        })
      } else {
        console.warn('Не найдено устройство для возврата сессии в очередь')
      }
    }
    // Очищаем слот
    if (orderToRemove !== null) {
      clearSlot(orderToRemove)
    }
    savePreferencesOnServer()
  }

  const setActivePinnedCall = async (pin: PinnedCall | null) => {
    if(!pin) {
      activePinnedCall.value = null
      activePinnedCallSessionId.value = null
      return
    }
    const { pServed, order } = pin
    activePinnedCall.value = slots.value.get(order) ?? null
    activePinnedCallSessionId.value = pin.sessionId ?? null

    const { type, dto } = checkDtoByPServed(pServed)

    const isEditMode = useGroupContactsStore().isEditMode // Если включен режим редактирования групп, клик по завешенному вызову не будет удалять из группы контакт
    if (isEditMode) {
      return
    }

    if (!pin.sessionId) {
      const { setCallManagerState } = useCallManagerState()

      if (type === 'conference') {
        setCallManagerState(CallManagerState.CONFERENCE_VIEW, dto as ConferenceDto)
      } else if (type === 'contact') {
        setCallManagerState(CallManagerState.CONTACT_VIEW, dto as Contact)
      } else {
        console.warn('Unknown type at pinned card', type, dto, pin)
      }
      return
    }

    if (type === 'conference') {
      selectConference(dto as ConferenceDto)
    } else if (type === 'contact') {
      const resolvedContact = await resolveContactByPServed(pServed)

      if (activePinnedCall.value?.order !== order || activePinnedCall.value?.pServed !== pServed) {
        return
      }

      selectContact((resolvedContact ?? dto) as Contact)
    } else {
      console.warn('Unknown type at pinned card', type, dto, pin)
    }
  }

  const changeVolume = (pServed: PServed, volume: number, temp: 'mute' | 'unmute' | undefined = undefined): void => {
    const item = Array.from(slots.value.values()).find((el) => el?.pServed === pServed)
    if (!item) {
      return
    }

    if (temp === undefined) { // если изменили непосредственно по завешенной линии
      item.volume = volume
      item.prevVolume = volume
    } else { // если клик по переключалке в группе завешенных
      item.volume = temp === 'mute' ? 0 : item.prevVolume
    }

    savePreferencesOnServer()

    applyToPinnedSessions(pServed, (session) => {
      if (!session) return
      session.setAudioPlayerVolume(item.volume * globalVolumeMultiplier.value)
    })
  }

  const changeGlobalVolumeMultiplier = (volume: number) => {
    globalVolumeMultiplier.value = volume
  }

  const toggleMicState = ({ pServed, action, value, updatePrefs = true }: ToggleMicOptions): void => {
    const item = Array.from(slots.value.values()).find((el) => el?.pServed === pServed)
    if (!item) {
      return
    }

    if (!updatePinnedCallMicState(item, action, value)) {
      return
    }

    if (updatePrefs) savePreferencesOnServer()

    // После изменения line-level состояния пересчитываем итоговую слышимость линии через глобальное состояние goose.
    applyPinnedCallMicState(pServed)
  }

  const savePreferencesOnServer = () => {
    const serializedSlots = Object.fromEntries(
      Array.from(slots.value.entries()).map(([order, pin]) => [order, serializePinnedCall(pin)]),
    )

    usePreferencesStore().setPreferences('pinnedCalls', serializedSlots).catch(console.error)
  }

  const loadByPreferences = (items: Record<PServed, unknown> | undefined) => {
    slots.value = new Map<number, SlotItem>(Array.from({ length: MAX_SLOTS_SIZE }, (_, i) => [i + 1, null]))
    if(!items) {
      isReady.value = true
      return
    }
    Object.keys(items).forEach((key) => {
      const pin = normalizePinnedCall(items[key] as SlotItem)
      if (pin) {
        updateSlot(pin)
      }
    })
    isReady.value = true
  }


  const updateSlot = (item: PinnedCall) => {
    if (!slots.value.has(item.order)) {
      return
    }

    const slot = slots.value.get(item.order)

    if (slot == null) {
      slots.value.set(item.order, item)
      return
    }

    Object.assign(slot, item)

    if (activePinnedCall.value?.order === item.order) {
      activePinnedCall.value = slot
    }
  }

  const clearSlot = (order: number) => {
    slots.value.set(order, null)
  }

  const isPinnedSession = (pServed: PServed) => {
    return pServedArray.value.includes(pServed)
  }

  const getPinnedCallByPServed = (pServed: string): PinnedCall | undefined => {
    for (const slot of slots.value.values()) {
      if (slot?.pServed === pServed) {
        return slot
      }
    }
  }

  const handlePinnedCallAutoMute = (target: string, mute: () => void) => {
    const pinnedCall = getPinnedCallBySessionId(target) ?? getPinnedCallByPServed(target)
    if (!pinnedCall) return

    // Новая pinned-сессия должна сразу унаследовать текущее эффективное состояние микрофона устройства.
    if (!isPinnedCallMicEffective(pinnedCall)) {
      const session = getSessionForPinnedCall(pinnedCall)
      if (session && !session.isMuted.value) {
        pendingSessionMicStateSync.set(session.sessionId, false)
      }
      mute()
    }
  }

  watch([globalVolumeMultiplier, () => sessions.value.size], () => {
    // Изменение глобальной громкости должно обновлять громкость в сессиях без обновления UI завешенных
    slots.value.forEach((item) => {
      if (!item) return
      applyToPinnedSessions(item.pServed, (session) => {
        if (!session) return
        session.setAudioPlayerVolume(item.volume * globalVolumeMultiplier.value)
      })
    })
  })

  const setActivePinnedCallSessionId = (sessionId: string | null) => {
    activePinnedCallSessionId.value = sessionId
  }

  const $reset = () => {
    isReady.value = false
    slots.value = new Map<number, SlotItem>(Array.from({ length: MAX_SLOTS_SIZE }, (_, i) => [i + 1, null]))
    globalVolumeMultiplier.value = INITIAL_VOLUME
    activePinnedCall.value = null
    activePinnedCallSessionId.value = null
    activePinnedPushToTalkTargetPServed.value = undefined
    pendingSessionMicStateSync.clear()
  }

  const findPinnedConferenceByRoomNumber = (number: string): PinnedCall | undefined => {
    for (const pin of slots.value.values()) {
      if (!pin || pServedIsNotGroup(pin.pServed)) {
        continue
      }

      if (conferencePServedToNumber(pin.pServed) === number) {
        return pin
      }
    }

    const roomPServed = roomGuidToPServed(number)

    for (const pin of slots.value.values()) {
      if (!pin || pServedIsNotGroup(pin.pServed)) {
        continue
      }

      if (pin.pServed === roomPServed) {
        return pin
      }
    }

    return undefined
  }

  return {
    pinnedCalls: readonly(slots),
    pinnedPServeds: readonly(pServedArray),
    activePinnedCall,
    activePinnedCallSession,
    activePinnedCallSessionId: readonly(activePinnedCallSessionId),
    globalVolumeMultiplier,
    isReady,
    addByPServed,
    removeByPServed,
    addByDto,
    removeSelected,
    setActivePinnedCall,
    setActivePinnedCallSessionId,
    getPinnedCallByPServed,
    getPinnedCallByOrder,
    getPinnedCallBySlotMember,
    getPinnedCallsByPServed,
    getFirstPinnedCallByPServed,
    getPinnedCallBySessionId,
    getFreePinnedCallByPServed,
    getNextSlotIndex,
    assignSessionToPinnedCall,
    assignSessionToPinnedCallByOrder,
    clearSessionIdFromPinnedCall,
    getSessionForPinnedCall,
    getPreferredPinnedSession,
    findPinnedConferenceByRoomNumber,
    changeGlobalVolumeMultiplier,
    changeVolume,
    changePinnedCallVolume,
    toggleMicState,
    togglePinnedCallMicState,
    syncPinnedCallMicStateBySession,
    isPinnedCallManagedByPinnedDevice,
    isPinnedCallMicEffective,
    isPinnedCallMicDisplayedEnabled,
    applyPinnedCallMicState,
    applyPinnedCallsMicState,
    moveSessionToPinnedDevice,
    startActivePinnedPushToTalkOverride,
    stopActivePinnedPushToTalkOverride,
    loadByPreferences,
    isPServedSession: isPinnedSession,
    isPinnedSessionId,
    updateSlot,
    clearSlot,
    handlePinnedCallAutoMute,
    savePreferencesOnServer,
    $reset,
  }
})
