import { v4 as uuidv4 } from 'uuid'
import { ref } from 'vue'

import {
  diagnosticCategories,
  diagnosticLogLevels,
  trackRendererDiagnosticEvent,
} from '@/features/diagnostics'

import { useAppStore, useDevicesStore } from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'
import { emitter, EmitterEvents } from '@/shared/services/emitter'
import { useTurretAdminWs } from '@/shared/turret-admin-ws'

import { CommandExecEvent, commandExecHandler } from './commandExecHandler'
import { GOOSE } from './constants'
import { incomingControllerEventHandler } from './incomingControllerEventHandler'
import { mapOutgoingControllerCommandToLoggedPayload } from './mapOutgoingControllerCommandToLoggedPayload'
import { registerControllerEventHandler } from './registerControllerEventHandler'
import { REGISTER_MESSAGE } from './registerMessage'
import {
  ButtonColor,
  IncomingControllerEvent,
  JSON_STRING, MelodyName,
  OutgoingControllerCommand,
  OutgoingControllerPayload,
  RegisterControllerEvent,
} from './types'
import { GooseLedCommand, HandsetLedCommand, HubLedCommand } from './types/led'



const URL = 'ws://127.0.0.1:8765'
const WEBSOCKET_CLOSE_CODE = 1000
let websocket: WebSocket | null = null
const controllerIsConnected = ref(false)
const enabledKeyboards = new Set<string>()

const logOutgoingControllerCommand = (data: unknown) => {
  const payload = mapOutgoingControllerCommandToLoggedPayload(data)
  if (!payload) {
    return
  }

  useTurretAdminWs().sendControllerCommandLogged(payload)
}

export const useController = () => {
  const { t } = useLocalization()

  const init = () => {
    console.info('Connecting to controller websocket:', URL)
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.WEBSOCKET,
      level: diagnosticLogLevels.INFO,
      source: 'controller-websocket',
      message: 'Connecting to controller websocket',
      payload: { url: URL },
      tags: ['controller-connect'],
    })
    websocket = new WebSocket(URL)
    websocket.onopen = function () {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEBSOCKET,
        level: diagnosticLogLevels.INFO,
        source: 'controller-websocket',
        message: 'Controller websocket opened',
        payload: { url: URL },
        tags: ['controller-open'],
      })
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        _send(REGISTER_MESSAGE)
      }
    }
    websocket.onmessage = function (event: MessageEvent<JSON_STRING>) {
      try {
        const message = JSON.parse(event.data)
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.DEBUG,
          source: 'controller-websocket',
          message: 'Controller websocket message received',
          payload: message,
          tags: ['controller-message-in'],
        })
        console.debug('%cIncoming message from controller: ', 'color: green;', message)
        if (message.model === 'register_answer') {
          const e = message as RegisterControllerEvent
          registerControllerEventHandler(e)
        } else if (message.model === 'command_exec') {
          const e = message as CommandExecEvent
          commandExecHandler(e)
        } else if (message.model === 'event') {
          const e = message as IncomingControllerEvent
          incomingControllerEventHandler(e)
        }
      } catch (e) {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.ERROR,
          source: 'controller-websocket',
          message: 'Failed to parse controller websocket message',
          payload: {
            raw: event.data,
            error: e,
          },
          tags: ['controller-message-parse-error'],
        })
        console.error(e)
      }
    }
    websocket.onclose = function (event) {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEBSOCKET,
        level: diagnosticLogLevels.WARN,
        source: 'controller-websocket',
        message: 'Controller websocket closed',
        payload: {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        },
        tags: ['controller-close'],
      })
      if(import.meta.env.DEV) return
      // Logout/notify только если контроллер уже был принят.
      // Без железа (браузер с ПК) сокет падает сразу — сессию не рвём.
      const wasConnected = controllerIsConnected.value
      controllerIsConnected.value = false
      useAppStore().setNetworkInfoLoading(false)
      if (wasConnected) {
        emitter.emit(EmitterEvents.CONTROLLER_DISCONNECTED, event)
      } else {
        emitter.emit(EmitterEvents.CONTROLLER_UNAVAILABLE, event)
      }
      setTimeout(() => {
        init()
      }, 5 * 60 * 1000)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    websocket.onerror = function (event) {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEBSOCKET,
        level: diagnosticLogLevels.ERROR,
        source: 'controller-websocket',
        message: 'Controller websocket error',
        payload: event,
        tags: ['controller-error'],
      })
      const wasConnected = controllerIsConnected.value
      // Флаг connected сбрасывает onclose — иначе потеряем wasConnected до emit.
      useAppStore().setNetworkInfoLoading(false)
      websocket?.close()
      if(import.meta.env.DEV) return
      if (!wasConnected) return
      const { showNotification } = useNotification()
      showNotification({
        type: 'error',
        message: t('ThereWasAnErrorConnectingToTheController'),
      })
    }
  }

  const close = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEBSOCKET,
        level: diagnosticLogLevels.INFO,
        source: 'controller-websocket',
        message: 'Closing controller websocket',
        payload: { code: WEBSOCKET_CLOSE_CODE },
        tags: ['controller-close-request'],
      })
      websocket?.close(WEBSOCKET_CLOSE_CODE)
      websocket = null
    }
  }

  const _send = (data: unknown) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      return false
    }

    trackRendererDiagnosticEvent({
      category: diagnosticCategories.WEBSOCKET,
      level: diagnosticLogLevels.DEBUG,
      source: 'controller-websocket',
      message: 'Controller websocket message sent',
      payload: data,
      tags: ['controller-message-out'],
    })
    console.debug('Отправка команды в сторону контроллера: ', data)
    websocket.send(JSON.stringify(data))
    logOutgoingControllerCommand(data)
    return true
  }

  /**
   * Выбор режима подсветки (0-2), по умолчанию 0 (Обязательно отправлять сначала эту функцию перед покраской кнопки) только для goose_{L/R}{1...3}
   */
  const _choiceRegimeBacklight = (payload: { target: string, index?: HubLedCommand | HandsetLedCommand | GooseLedCommand }) => {
    const { target, index = HandsetLedCommand.OFF } = payload
    const timestamp = `${new Date().getTime()}`
    const command: OutgoingControllerCommand = {
      sender: REGISTER_MESSAGE.sender,
      uid: uuidv4(),
      timestamp,
      name: 'effect',
      target,
      recipients: [],
      attrs: {
        index,
      },
      model: 'command',
      version: '1.0',
    }
    _send(command)
  }

  /**
   * Настройка яркости подсветки value (0-255), по умолчанию value = 0.
   */
  const _tuneBacklight = (payload: { target: string, value?: number }) => {
    const { value = 0, target: t } = payload
    const timestamp = `${new Date().getTime()}`

    const matches = t.match(/_(L\d|R\d):/)
    
    if (matches === null) {
      console.warn('Adjusting the backlight brightness: invalid target value: ', payload.target)
      return
    }

    const command: OutgoingControllerCommand = {
      sender: REGISTER_MESSAGE.sender,
      uid: uuidv4(),
      timestamp,
      name: 'brightness',
      target: `goose_${matches[1]}:keyboard`, /* Можно управлять яркостью только всего модуля! Корректно: goose_L1:keyboard или goose_R1:keyboard */
      recipients: [],
      attrs: {
        value,
      },
      model: 'command',
      version: '1.0',
    }
    _send(command)
  }

  /**
   * Выбор эффекта для кнопки
   *  @param payload target - кнопка, period - 0-255
   */
  const _choiceEffect = (payload: { target: string, color?: ButtonColor, freq?: number }) => {
    const { target, color, freq = 0 } = payload
    const timestamp = `${new Date().getTime()}`
    let attrs
    switch (color) {
    case 'red':
      attrs = { r: 255, g: 0, b: 0, freq }
      break
    case 'blue':
      attrs = { r: 0, g: 0, b: 255, freq }
      break
    case 'green':
      attrs = { r: 0, g: 255, b: 0, freq }
      break
    case 'orange':
      attrs = { r: 255, g: 165, b: 0, freq }
      break
    case 'white':
      attrs = { r: 255, g: 255, b: 255, freq }
      break
    case 'black': {
      attrs = { r: 0, g: 0, b: 0, freq }
      break
    }  
    default:
      attrs = { r: 0, g: 0, b: 0, freq }
    }
    const command: OutgoingControllerCommand = {
      name: 'animation',
      model: 'command',
      version: '1.0',
      recipients: [],
      timestamp,
      uid: uuidv4(),
      sender: REGISTER_MESSAGE.sender,
      target,
      attrs,
    }
    _send(command)
  }

  const paintGooseButton = (payload: OutgoingControllerPayload) => {
    const { target, freq, color } = payload

    _choiceEffect({
      target,
      freq,
      color,
    })
  }

  const enableGooseKeyboard = (module?: string) => {
    const { gooseDevices } = useDevicesStore()

    const moduleRegex = /^[LR]\d+$/ // Регулярное выражение для проверки формата "L1", "R2", "L123" и т.д.

    if (module && !moduleRegex.test(module)) {
      console.warn(`Некорректный формат модуля: ${module}.`)
    }

    const modules = module ? [module] : [...new Set(gooseDevices.map(goose => goose.module?.match(/(L|R)\d+/)?.[0]).filter(Boolean))]
    for (const module of modules) {
      const name = `${GOOSE}_${module}:keyboard`
      if (enabledKeyboards.has(name)) {
        continue
      }
      _choiceRegimeBacklight({
        target: name,
        index: GooseLedCommand.ON,
      })
      _tuneBacklight({
        target: name,
        value: 64,
      })
      enabledKeyboards.add(name)
    }
  }

  const paintLedHub = (payload: Pick<OutgoingControllerPayload, 'index'>) => {
    const { index = HubLedCommand.OFF } = payload

    _choiceRegimeBacklight({
      index,
      target: 'hub:ledline',
    })
  }

  /**
   *  Запрос информации о сетевых подключениях пульта
   */
  const getNetworkInformation = () => {
    const { setNetworkInfoLoading } = useAppStore()

    if (!controllerIsConnected.value) {
      setNetworkInfoLoading(false)
      return false
    }

    const timestamp = `${new Date().getTime()}`
    const command: OutgoingControllerCommand = {
      sender: REGISTER_MESSAGE.sender,
      uid: uuidv4(),
      timestamp,
      name: 'get',
      target: 'sysinfo:netinfo',
      recipients: [],
      attrs: [],
      model: 'command',
      version: '1.0',
    }
    setNetworkInfoLoading(true)

    const isSent = _send(command)

    if (!isSent) {
      setNetworkInfoLoading(false)
    }

    return isSent
  }

  /**
   *  Запрос информации о модулях контроллера
   */
  const getModulesInformation = () => {
    const timestamp = `${new Date().getTime()}`
    const command: OutgoingControllerCommand = {
      sender: REGISTER_MESSAGE.sender,
      uid: uuidv4(),
      timestamp,
      name: 'get',
      target: 'sysinfo:modulesinfo',
      recipients: [],
      attrs: [],
      model: 'command',
      version: '1.0',
    }
    _send(command)
  }
  /**
     *  Запрос на воспроизведение звукового сигнала (Мелодии)
     */
  const playMelody = (melody: MelodyName = 'scale') => {
    const timestamp = `${new Date().getTime()}`
    const command: OutgoingControllerCommand = {
      sender: REGISTER_MESSAGE.sender,
      uid: uuidv4(),
      timestamp,
      name: 'play_melody',
      target: 'control:buzzer',
      recipients: [],
      attrs: {
        name: melody,
      },
      model: 'command',
      version: '1.0',
    }
    _send(command)
  }
  /**
     *  Запрос на воспроизведение звукового сигнала (ТОНА)
     */
  const playTone = () => {
    const timestamp = `${new Date().getTime()}`
    const command: OutgoingControllerCommand = {
      sender: REGISTER_MESSAGE.sender,
      uid: uuidv4(),
      timestamp,
      name: 'play_tone',
      target: 'control:buzzer',
      recipients: [],
      attrs: {
        freq: 2000,
        length: 35,
        reps: 1,
        delay: 0,
        end_delay: false,
      },
      model: 'command',
      version: '1.0',
    }
    _send(command)
  }

  return {
    controllerIsConnected,
    init,
    close,
    getNetworkInformation,
    getModulesInformation,
    paintGooseButton,
    enableGooseKeyboard,
    paintLedHub,
    playMelody,
    playTone,
  }
}
