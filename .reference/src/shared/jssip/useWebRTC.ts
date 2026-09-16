import { PServed } from '@wui/im'
import JsSIP, { UA, URI } from '@wui/jssip'
import { Subscriber } from '@wui/jssip/lib/Subscriber'
import { RTCSessionEvent } from '@wui/jssip/lib/UA'
import { readonly, Ref } from 'vue'

import {
  diagnosticCategories,
  diagnosticLogLevels,
  trackRendererDiagnosticEvent,
} from '@/features/diagnostics'

import { useBindingControllerButtonsStore } from '@/entities/binding-contacts'
import { useSessionStore } from '@/entities/call-session'
import { useContactStatusState, CallStatusState } from '@/entities/contact'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  LogicalMediaDeviceTypeEnum,
  useAppStore,
  useDevicesSessionsStore,
} from '@/shared/composables'
import { useToggle } from '@/shared/composables/useToggle'
import { call, type CallMediaDevice, CallConfig, notifyBodyParser, SetupUA } from '@/shared/jssip'

import { contactPServedToNumber } from '../services/uri-helper'

// JsSIP.debug.enable('JsSIP:*')
JsSIP.debug.disable()

interface Result {
  initSIP: (c: SetupUA) => Promise<boolean>;
  startSIP: () => void;
  registerSIP: () => void;
  unregisterSIP: () => void;
  subscribeSIP: (internalNumber: string, expires: number) => void;
  onRegisteredSIP: Readonly<Ref<boolean>>;
  onConnectedSIP: Readonly<Ref<boolean>>;
  call: (config: CallConfig) => string | undefined;
  pickup: (config: { number: string, replaceableCallId: string }) => void;
  switchToCall: (target: string, device?: CallMediaDevice, extraHeaders?: string[], reuseSessionId?: string, pinnedSlotOrder?: number) => void;
}

let ua: UA | undefined

const {
  enable: setRegistered,
  disable: setUnRegistered,
  value: registered,
} = useToggle(false)

const {
  enable: setConnected,
  disable: setDisconnected,
  value: connected,
} = useToggle(false)


export const getUA = (): UA => {
  if (!ua) {
    throw new Error('UA is not exist')
  }
  return ua
}

let confUri: URI | undefined
const activeSubscribers = new Map<string, Subscriber>()

const stopSIP = () => {
  const currentUA = ua

  clearAllSubscribers()

  if (currentUA) {
    try {
      currentUA.removeAllListeners()
      currentUA.stop()
    } catch (e) {
      console.debug(e)
    }
  }

  ua = undefined
  confUri = undefined
  setUnRegistered()
  setDisconnected()
}

export function useWebRTC (): Result {
  const { addSession } = useSessionStore()

  const initSIP = (conf: SetupUA): Promise<boolean> => {
    if (!conf.sipWs) {
      return Promise.reject(new Error('SIP WebSocket URL is not configured'))
    }
    const sipWs = conf.sipWs
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.WEBSOCKET,
      level: diagnosticLogLevels.INFO,
      source: 'sip-websocket',
      message: 'Initializing SIP transport',
      payload: {
        sipWs,
        uri: conf.ua.uri,
      },
      tags: ['sip-init'],
    })

    return new Promise((resolve) => {
      let isResolved = false
      const resolveOnce = (value: boolean) => {
        if (isResolved) {
          return
        }
        isResolved = true
        resolve(value)
      }

      console.debug('init sip config: ', conf)
      stopSIP()
      confUri = URI.parse(conf.ua.uri)

      const socket = new JsSIP.WebSocketInterface(sipWs)
      ua = new UA({
        ...conf.ua,
        sockets: [ socket ],
        register: true,
        register_expires: 120,
        realm: 'debian',
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 30,
      })

      ua.addListener('registered', (e) => {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.INFO,
          source: 'sip-websocket',
          message: 'SIP registered',
          payload: e,
          tags: ['sip-registered'],
        })
        console.debug('Registered SIP: ', e)
        setRegistered()
        resolveOnce(true)
      })
      ua.addListener('unregistered', (e) => {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.WARN,
          source: 'sip-websocket',
          message: 'SIP unregistered',
          payload: e,
          tags: ['sip-unregistered'],
        })
        console.debug('Unregistered SIP: ', e)
        setUnRegistered()
        clearAllSubscribers()
      })
      ua.addListener('registrationFailed', (e) => {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.ERROR,
          source: 'sip-websocket',
          message: 'SIP registration failed',
          payload: e,
          tags: ['sip-registration-failed'],
        })
        console.debug('RegistrationFailed SIP: ', e)
        setUnRegistered()
        clearAllSubscribers()
        resolveOnce(false)
      })
      ua.addListener('registrationExpiring', (e) => {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.INFO,
          source: 'sip-websocket',
          message: 'SIP registration expiring',
          payload: e,
          tags: ['sip-registration-expiring'],
        })
        console.debug('Registration expiring SIP: ', e)
        registerSIP()
      })
      ua.addListener('connected', (e) => {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.INFO,
          source: 'sip-websocket',
          message: 'SIP transport connected',
          payload: e,
          tags: ['sip-connected'],
        })
        console.debug('Connected SIP: ', e)
        setConnected()
      })
      ua.addListener('disconnected', (e) => {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.WARN,
          source: 'sip-websocket',
          message: 'SIP transport disconnected',
          payload: e,
          tags: ['sip-disconnected'],
        })
        console.debug('Disconnected SIP: ', e)
        setUnRegistered()
        setDisconnected()
        clearAllSubscribers()
      })
      ua.addListener('newRTCSession', (e: RTCSessionEvent) => {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEB_RTC,
          level: diagnosticLogLevels.INFO,
          source: 'webrtc-session',
          message: 'New RTC session created',
          payload: {
            originator: e.originator,
            sessionId: e.session.id,
          },
          tags: ['rtc-session-created'],
        })
        e.session.on('connecting', () => {})
        e.session.on('failed', () => {})
        e.session.on('ended', () => {})
        addSession(e)
      })

      startSIP()
    })
  }

  const startSIP = () => { // on mount Layout
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.WEBSOCKET,
      level: diagnosticLogLevels.INFO,
      source: 'sip-websocket',
      message: 'Starting SIP transport',
      tags: ['sip-start'],
    })
    getUA().start()
  }

  const registerSIP = () => {
    try {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEBSOCKET,
        level: diagnosticLogLevels.INFO,
        source: 'sip-websocket',
        message: 'Registering SIP transport',
        tags: ['sip-register'],
      })
      getUA().register()
    } catch (e) {
      console.debug(e)
    }
  }

  const unregisterSIP = () => {
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.WEBSOCKET,
      level: diagnosticLogLevels.INFO,
      source: 'sip-websocket',
      message: 'Unregistering SIP transport',
      tags: ['sip-unregister'],
    })
    stopSIP()
  }

  const switchToCall = (number: string, device?: CallMediaDevice, extraHeaders?: string[], reuseSessionId?: string, pinnedSlotOrder?: number) => {
    const { currentUser } = useAppStore()
    const { updateLocal } = useContactStatusState()
    const { bindSessionToDevice } = useDevicesSessionsStore()
    const {
      assignSessionToSlot,
      getSlotsByPServed,
      isPinnedPanelSessionId,
      setPendingDialSlotOrder,
    } = usePinnedCallsPanelStore()
    const { getSessionById } = useSessionStore()

    trackRendererDiagnosticEvent({
      category: diagnosticCategories.WEB_RTC,
      level: diagnosticLogLevels.INFO,
      source: 'webrtc-call',
      message: 'Switch to call requested',
      payload: {
        number,
        hasDevice: Boolean(device),
        hasExtraHeaders: Boolean(extraHeaders?.length),
        reuseSessionId: reuseSessionId ?? null,
        pinnedSlotOrder: pinnedSlotOrder ?? null,
      },
      tags: ['rtc-switch'],
    })

    if (!number) {
      console.warn('Пустое поле number!')
      return
    }

    if (currentUser?.internalNumber === number) {
      console.warn('Нельзя вызывать самого себя')
      return
    }

    const reusableSession = reuseSessionId ? getSessionById(reuseSessionId) : undefined
    if (reusableSession) {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEB_RTC,
        level: diagnosticLogLevels.INFO,
        source: 'webrtc-call',
        message: 'Reusing existing RTC session',
        payload: {
          number,
          reuseSessionId,
        },
        tags: ['rtc-session-reuse'],
      })
      // Явно возвращаем в работу только ту сессию, которую caller передал по sessionId.
      // Если номер есть в списке текущих сессий, снимаем с холда, попутно холдя остальные сессии на девайсе
      if (device) {
        bindSessionToDevice(reusableSession.sessionId, device.id)
      }

      reusableSession.toggleHold(false)

      const isPinnedPanelContact = getSlotsByPServed(reusableSession.pServed).length > 0
      if (device && device.type !== LogicalMediaDeviceTypeEnum.GOOSE && isPinnedPanelContact) {
        reusableSession.unmute()
      }
    } else {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEB_RTC,
        level: diagnosticLogLevels.INFO,
        source: 'webrtc-call',
        message: 'Creating new RTC call',
        payload: {
          number,
          pinnedSlotOrder: pinnedSlotOrder ?? null,
        },
        tags: ['rtc-call-create'],
      })
      const config: CallConfig = {
        target: number,
        extraHeaders,
        device,
      }

      // Pending до ua.call: newRTCSession → addSession срабатывает синхронно внутри call().
      if (typeof pinnedSlotOrder === 'number') {
        setPendingDialSlotOrder(pinnedSlotOrder)
      }

      const sessionId = call(config)

      if (sessionId && device) {
        bindSessionToDevice(sessionId, device.id) // Привязываем сессию к телефонной трубке
      }
      if (sessionId && typeof pinnedSlotOrder === 'number') {
        if (!isPinnedPanelSessionId(sessionId)) {
          assignSessionToSlot(pinnedSlotOrder, sessionId)
        }
      } else if (typeof pinnedSlotOrder === 'number') {
        setPendingDialSlotOrder(null)
      }
      updateLocal({ internalNumber: number, local: CallStatusState.EARLY })
    }
  }

  const pickup = (config: {
    number: string,
    replaceableCallId: string
  }) => {
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.WEB_RTC,
      level: diagnosticLogLevels.INFO,
      source: 'webrtc-call',
      message: 'Pickup with replaces header requested',
      payload: config,
      tags: ['rtc-pickup'],
    })
    call({
      target: config.number,
      extraHeaders: [`replaces:${config.replaceableCallId}`],
    })
  }

  const subscribeSIP = (internalNumber: string, expires: number): void => {
    const { updateRemote, updateLine, contactStatuses } = useContactStatusState()
    const { paintGooseButtons } = useBindingControllerButtonsStore()
    if (!confUri) throw new Error('no ua uri')
    const ownInternalNumber = confUri.user.replace('$ROOT', '')
    const fromUri = new JsSIP.URI('sip', ownInternalNumber, confUri.host, confUri.port)

    const toUri = new JsSIP.URI('sip', internalNumber, fromUri.host, fromUri.port)
    const existingSubscriber = activeSubscribers.get(internalNumber)
    if (existingSubscriber) {
      // Подписчик есть, но статуса нет (HMR / $reset без terminate) — переподписываемся.
      if (contactStatuses[internalNumber]) {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.DEBUG,
          source: 'sip-subscribe',
          message: 'SIP subscriber already exists',
          payload: { internalNumber },
          tags: ['sip-subscribe-exists'],
        })
        console.debug('SIP Subscriber already exists', internalNumber)
        return
      }

      try {
        existingSubscriber.terminate()
      } catch (e) {
        console.debug('SIP subscriber terminate before resubscribe failed', internalNumber, e)
      }
      activeSubscribers.delete(internalNumber)
    }
    const subscriber = getUA().subscribe(
      `sip:${internalNumber}`,
      'presence',
      'application/dialog-info+xml', {
        expires,
        params: {
          from_uri: fromUri,
          to_uri: toUri,
        },
      })

    subscriber.on('active', () => {
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subscriber.on('notify', (isFinal, notify, body, contentType) => { // with not empty body
      try {
        const notifyBody = notifyBodyParser(body)
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.DEBUG,
          source: 'sip-subscribe',
          message: 'SIP notify received',
          payload: {
            internalNumber,
            isFinal,
            contentType,
            notifyBody,
          },
          tags: ['sip-notify'],
        })
        updateRemote(notifyBody)
        updateLine(notifyBody)
        paintGooseButtons(notifyBody) // Красим кнопку на модуле пульта
        console.log(notifyBody)
      } catch (e) {
        trackRendererDiagnosticEvent({
          category: diagnosticCategories.WEBSOCKET,
          level: diagnosticLogLevels.ERROR,
          source: 'sip-subscribe',
          message: 'Failed to parse SIP notify body',
          payload: {
            internalNumber,
            error: e,
          },
          tags: ['sip-notify-error'],
        })
        console.error(e)
      }
    })

    subscriber.on('accepted', () => {
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subscriber.on('terminated', (terminationCode, reason, retryAfter) => {
      trackRendererDiagnosticEvent({
        category: diagnosticCategories.WEBSOCKET,
        level: diagnosticLogLevels.INFO,
        source: 'sip-subscribe',
        message: 'SIP subscriber terminated',
        payload: {
          internalNumber,
          terminationCode,
          reason,
          retryAfter,
        },
        tags: ['sip-subscribe-terminated'],
      })
      activeSubscribers.delete(internalNumber)
    })

    subscriber.subscribe()
    activeSubscribers.set(internalNumber, subscriber)
  }

  return {
    initSIP,
    startSIP,
    registerSIP,
    unregisterSIP,
    onRegisteredSIP: readonly(registered),
    onConnectedSIP: readonly(connected),
    subscribeSIP,
    call,
    pickup,
    switchToCall,
  }
}

export const clearAllSubscribers = (subIds?: Array<PServed>) => {
  if (subIds !== undefined) {
    subIds.forEach((pServed) => {
      const internalNumber = contactPServedToNumber(pServed)
      const sub = activeSubscribers.get(internalNumber)
      sub?.terminate()
      activeSubscribers.delete(internalNumber)
    })
  } else {
    activeSubscribers.forEach((subscriber) => {
      subscriber.terminate()
    })
    activeSubscribers.clear()
  }
}
