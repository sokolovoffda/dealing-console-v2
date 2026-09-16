import { router } from '@/app'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { bindingControllerButtonTypes, useBindingControllerButtonsStore } from '@/entities/binding-contacts'
import { STATE, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { CallStatusState, Contact, resolveBindingContactByPServed, useContactStatusState } from '@/entities/contact'
import { useGroupContactsStore } from '@/entities/group-contacts'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  isUsableForMediaDevice,
  LogicalMediaDeviceTypeEnum,
  notifyMediaDeviceUnavailableForCall,
  type LogicalMediaDevice,
  useAppStore,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'
import { SenderGoose } from '@/shared/controller'
import { ControllerEvents, IncomingControllerEvent, gooseButtons, GooseButtons } from '@/shared/controller/types'
import { useController } from '@/shared/controller/useController'
import { useLocalization } from '@/shared/i18n'
import { useWebRTC } from '@/shared/jssip'
import { useNotification } from '@/shared/notifications'

const getGooseDeviceBySender = (sender: string): LogicalMediaDevice | undefined => {
  const devicesStore = useDevicesStore()

  return devicesStore.getDeviceByModule(sender)
    ?? devicesStore.getDeviceById(sender)
    ?? devicesStore.gooseDevices.find(device => device.controllerDeviceId === sender)
}

const getGooseRuntimeKey = (deviceName: string): string => {
  const device = getGooseDeviceBySender(deviceName)

  return device
    ? useDevicesSessionsStore().getDeviceSessionKey(device)
    : deviceName
}

const _bindContact = async (payload: { button: GooseButtons, sender: SenderGoose, device?: LogicalMediaDevice }) => {
  const { button, device } = payload
  const { bindingContacts, getBinding } = useBindingControllerButtonsStore()
  const { setCallManagerState, selected, selectedSession } = useCallManagerState()
  const { switchToCall, pickup } = useWebRTC()
  const { contactStatuses } = useContactStatusState()
  const { currentUser } = useAppStore()
  const { getPreferredSessionByPServed } = useSessionStore()
  const pinnedCallsStore = usePinnedCallsStore()
  const groupContactsStore = useGroupContactsStore()
  const devicesStore = useDevicesStore()

  const binding = getBinding(button)

  if (binding?.type === bindingControllerButtonTypes.PINNED_GROUP) {
    if (binding.groupIndex === null) {
      if (router.currentRoute.value.name !== 'BindingContactBlock' && device) {
        router.push({ name: 'BindingContactBlock', params: { id: device.id } })
      }
      return
    }

    groupContactsStore.toggleMicForGroup(binding.groupIndex)
    return
  }

  if (binding && binding.type !== bindingControllerButtonTypes.STANDARD) {
    return
  }

  const pServed = bindingContacts.get(button)

  if (!pServed) { // Если отсутствует bind контакта по нажатой кнопке и мы не находимся на странице bind контактов
    if (router.currentRoute.value.name !== 'BindingContactBlock' && device) {
      router.push({ name: 'BindingContactBlock', params: { id: device.id } })
    }
    return
  }

  // Если контакт не найден в адресной книге, resolver дополнительно уточнит его через IM
  const contact: Contact = await resolveBindingContactByPServed(pServed)
  const status = contactStatuses[contact.internalNumber]
  const isSelf = status?.fromNumber === currentUser?.internalNumber // Если это мы звоним абоненту
  const firstPinnedCall = pinnedCallsStore.getFirstPinnedCallByPServed(contact.pServed)
  const currentSession = firstPinnedCall
    ? pinnedCallsStore.getSessionForPinnedCall(firstPinnedCall)
    : getPreferredSessionByPServed(contact.pServed, selectedSession.value?.sessionId)

  if (status?.remote === CallStatusState.EARLY && status.fromNumber && status.callId && !isSelf) { // Перехватываем входящий вызов привязанного контакта.
    pickup({
      number: status.fromNumber,
      replaceableCallId: status.callId,
    })
    return
  }

  if (currentSession) {
    if (currentSession.sessionState.value === STATE.PROGRESS) {
      currentSession.terminate()
      return
    }

    if (
      currentSession.sessionState.value === STATE.CONNECTED ||
      currentSession.sessionState.value === STATE.ONHOLD
    ) {
      if (pinnedCallsStore.isPServedSession(contact.pServed)) {
        pinnedCallsStore.toggleMicState({
          pServed: contact.pServed,
          action: 'toggle',
        })
      } else {
        currentSession.toggleMute()
      }
      return
    }
  }

  if (status?.remote === CallStatusState.EARLY && status.fromNumber && status.callId && !isSelf) { // Если bind есть, и в данный момент этому номеру кто-то звонит (не мы), перехватываем первый найденный вызов
    pickup({
      number: status.fromNumber,
      replaceableCallId: status.callId,
    })
    return
  }

  if (contact.pServed !== selected.value?.pServed) { // Если контакт нашелся и он не равен контакту в callManagerState, открываем карточку
    setCallManagerState(CallManagerState.CONTACT_VIEW, contact)
    return
  }

  if (contact.pServed === selected.value.pServed) { // Если контакт нашелся и он равен контакту в callManagerState, делаем вызов
    const isPinnedContact = Boolean(firstPinnedCall)
    const targetDevice = isPinnedContact
      ? devicesStore.readyPreferredGoose
      : devicesStore.readyQueueDevices.at(0)

    if (!targetDevice || (isPinnedContact && targetDevice.type !== LogicalMediaDeviceTypeEnum.GOOSE)) {
      notifyMediaDeviceUnavailableForCall()
      return
    }

    switchToCall(contact.internalNumber, targetDevice, undefined, undefined, firstPinnedCall?.order)
  }
}

const setGooseSpeakButtonVisualState = (deviceName: string, isEnabled: boolean) => {
  const { setGoosePushToTalkState } = useDevicesSessionsStore()
  const { paintGooseButton } = useController()
  const BUTTONS = gooseButtons.transformValues(deviceName)

  setGoosePushToTalkState({
    device: getGooseRuntimeKey(deviceName),
    state: isEnabled,
  })

  paintGooseButton({
    target: BUTTONS.KEY_SPEAK,
    color: isEnabled ? 'red' : 'black',
    freq: 0,
  })
}

export const setGooseMicrophoneState = (deviceName: string, isEnabled: boolean) => {
  const { applyGooseMicToPanelSessions } = usePinnedCallsPanelStore()
  const { paintGooseButtons } = useBindingControllerButtonsStore()
  
  setGooseSpeakButtonVisualState(deviceName, isEnabled)
  
  // После изменения глобального состояния устройства пересчитываем слышимость всех panel pinned-линий.
  applyGooseMicToPanelSessions()
  paintGooseButtons()
}

export const togglePushToTalk = (deviceName: string, state?: boolean) => {
  const { getGoosePushToTalkState } = useDevicesSessionsStore()

  const currentState = getGoosePushToTalkState(getGooseRuntimeKey(deviceName))
    ?? resolveDefaultGooseMicEnabled(deviceName)
  const nextState = state ?? !currentState

  setGooseMicrophoneState(deviceName, nextState)
}

export const handleGooseSpeakPress = (device?: LogicalMediaDevice, deviceName?: string) => {
  if (!device?.module) return

  if (!isUsableForMediaDevice(device)) {
    notifyMediaDeviceUnavailableForCall()
    return
  }

  const targetDeviceName = deviceName ?? device.module

  if (device.mode !== 'pushToTalk') {
    return
  }

  if (device.pttScope === 'activePinned') {
    const pinnedCallsPanelStore = usePinnedCallsPanelStore()
    const { t } = useLocalization()
    const { showNotification } = useNotification()
    const hasActivePinnedTarget = pinnedCallsPanelStore.activeSlotOrder !== null

    pinnedCallsPanelStore.startActivePinnedPushToTalkOverride()
    if (!hasActivePinnedTarget) {
      showNotification({
        type: 'error',
        message: t('SelectActivePinnedLineForPushToTalk'),
      })
    }
    setGooseMicrophoneState(targetDeviceName, true)
    return
  }
  togglePushToTalk(targetDeviceName, true)
}

export const handleGooseSpeakRelease = (device?: LogicalMediaDevice, deviceName?: string) => {
  if (!device?.module) return

  const targetDeviceName = deviceName ?? device.module

  if (device.mode === 'pushToTalk' && device.pttScope === 'activePinned') {
    const pinnedCallsPanelStore = usePinnedCallsPanelStore()
    setGooseSpeakButtonVisualState(targetDeviceName, false)
    pinnedCallsPanelStore.stopActivePinnedPushToTalkOverride()
    pinnedCallsPanelStore.applyGooseMicToPanelSessions()
    return
  }
  if(device.mode === 'pushToTalk'){
    togglePushToTalk(targetDeviceName, false)
  }
  else {
    togglePushToTalk(targetDeviceName)
  }
}

const resolveDefaultGooseMicEnabled = (deviceName: string): boolean => {
  const device = getGooseDeviceBySender(deviceName)

  if (!device || device.mode !== 'pushToTalk') return true

  return false
}

export const syncGooseSpeakButtonState = (deviceName: string) => {
  const { getGoosePushToTalkState } = useDevicesSessionsStore()
  const storedState = getGoosePushToTalkState(getGooseRuntimeKey(deviceName))
  const isMicEnabled = storedState ?? resolveDefaultGooseMicEnabled(deviceName)

  setGooseMicrophoneState(deviceName, isMicEnabled)
}

/** Подсветка speak-кнопки и audio pinned-линий после появления модулей пульта. */
export const syncAllGooseMicrophoneHardware = () => {
  const { gooseDevices } = useDevicesStore()

  gooseDevices.forEach((device) => {
    if (device.module) {
      syncGooseSpeakButtonState(device.module)
    }
  })
}

/**
 * После смены mode/scope в настройках: сбросить mic/LED на дефолт режима
 * (PTT → off, stateful → on), не оставляя stale stateful-состояние до первого speak.
 */
export const applyGooseMicrophoneDefaultsForCurrentMode = () => {
  const { gooseDevices } = useDevicesStore()

  gooseDevices.forEach((device) => {
    if (!device.module) return

    setGooseMicrophoneState(
      device.module,
      resolveDefaultGooseMicEnabled(device.module),
    )
  })
}

export const gooseEventHandler = (e: IncomingControllerEvent<'goose'>) => {
  const GOOSE = e.sender // Имя такого вида goose_L2 goose_L1 и т.д.
  const BUTTONS = gooseButtons.transformValues(GOOSE)
  const VALUES = gooseButtons.getValues(GOOSE)

  const device = getGooseDeviceBySender(GOOSE)

  if (e.name === ControllerEvents.PRESSED) { // Кнопка нажата, но не отпущена
    if (e.target === BUTTONS.KEY_SPEAK) { // Кнопка переключения микрофона
      handleGooseSpeakPress(device, GOOSE)
    }
  } else if (e.name === ControllerEvents.RELEASED) { // Кнопка отпущена
    if (e.target === BUTTONS.KEY_SPEAK) { // Кнопка переключения микрофона
      handleGooseSpeakRelease(device, GOOSE)
    } else if (VALUES.includes(e.target)) {
      _bindContact({
        button: e.target,
        sender: GOOSE,
        device,
      })
    } else {
      console.warn(`unknown target: ${e.target}`)
    }
  }
}
