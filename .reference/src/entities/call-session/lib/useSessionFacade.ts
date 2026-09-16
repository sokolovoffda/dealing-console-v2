import { UserInfo } from '@wui/common-library'
import {
  AnswerOptions, ReferOptions,
  RTCSession,
  SessionDirection,
  TerminateOptions,
} from '@wui/jssip/lib/RTCSession'
import { storeToRefs } from 'pinia'
import { computed, Ref, ref, ShallowRef, shallowRef, watch } from 'vue'

import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { useGlobalRingtone } from '@/features/global-ringtone'

import {
  useConferenceSubscriberStatusState,
  useRoomControl,
  ConferenceDto,
  MemberStatus,
  resolveIncomingConferenceFromRemoteNumber,
} from '@/entities/conference'
import { useContactStore, Contact, useContactStatusState, CallStatusState, useContactCachedStore } from '@/entities/contact'
import { useCustomizeStore, findRingtoneByGuid, useMainSettingsStore, useRingtonesStore } from '@/entities/main-settings'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import {
  LogicalMediaDeviceTypeEnum,
  type LogicalMediaDevice,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'
import { getSharedAudioContext, releaseSharedAudioContext } from '@/shared/composables/use-shared-audio-context'
import { useLocalization } from '@/shared/i18n'
import { ReferResult, ReferResultType } from '@/shared/jssip'
import { getAnswerOptions } from '@/shared/jssip/call-options'
import { useNotification } from '@/shared/notifications'
import { contactNumberToPServed } from '@/shared/services'

import { useSessionStore } from '../model/useSessionStore'

import { useSessionSpeakerIndication } from './use-session-speaker-indication'
import { useSessionEventListener } from './useSessionEventListener'
import { SessionTimer, useSessionTimer } from './useSessionTimer'

export enum STATE {
  'INITIAL',
  'PROGRESS',
  'RINGING',
  'CONNECTED',
  'ERROR',
  'ONHOLD',
  'DISCONNECTED',
}

export enum STATUS_CODES {
  BUSY_HERE = 486
}

export type SessionMediaDevice = LogicalMediaDevice

export interface RTCSessionFacade {
  setAudioPlayerVolume: (value: number) => void;
  session: RTCSession;
  sessionId: string;
  sessionState: Ref<STATE>;
  direction: SessionDirection;
  answer: (options?: AnswerOptions, device?: SessionMediaDevice) => void;
  terminate: (options?: TerminateOptions) => void;
  localStream: ShallowRef<MediaStream | undefined>;
  remoteMediaStreams: Ref<MediaStream[] | undefined>;
  remoteAudioStream: Ref<MediaStream | undefined>;
  currentDevice: Ref<SessionMediaDevice | null>;
  setCurrentDevice: (device: SessionMediaDevice) => void;
  number: string;
  pServed: string;
  callId: Ref<string>;
  referCallId: Ref<string | null | undefined>;
  setReferCallId: (id?: string | null) => void;
  /**
   * @deprecated Use pServed or number to find at cached contacts store
   */
  contact?: Contact | UserInfo;
  /**
   * @deprecated Use pServed or number to find at conferences store
   */
  conference?: ConferenceDto;
  timer: SessionTimer;
  isMuted: Ref<boolean>;
  isConfOnHold: Ref<boolean>;
  sendDtmf: (dtmf: string) => void;
  toggleMute: () => void;
  mute: () => void;
  unmute: () => void;
  unhold: () => void;
  toggleHold: (setHold?: boolean) => Promise<boolean>;
  refer: (config: ReferConfig, onEnded?: (result: ReferResult) => void) => void;
  setState: (s: STATE) => void;
  stopWatch: () => void;
  remoteVoiceDetected: Ref<boolean>;
  /** Уровень remote voice 0..100 (AnalyserNode), для UI-полоски VD. */
  remoteVoiceLevel: Ref<number>;
}

export type ReferConfig = {
  toSession?: never,
  targetNumber: string,
} | {
  toSession: RTCSessionFacade,
  targetNumber?: never
}

export const FIRST_STREAM_ID_SUFFIX = '-53454C46' // self by ASCII, used for detect MOH stream

function getNumber (session: RTCSession) {
  const remoteIdentity = session.remote_identity
  const { uri } = remoteIdentity
  const { user } = uri
  return user
}

export function useRTCSessionFacade (session: RTCSession): RTCSessionFacade {
  const sessionFacade = (function (): RTCSessionFacade {
    const { getByInternalNumberOrCreateExternal } = useContactStore()
    const { updateLocal } = useContactStatusState()
    const { ringtonePlayer, changePathInPlayer, setVolume } = useGlobalRingtone()
    const mainSettingsStore = useMainSettingsStore()
    const { settings } = storeToRefs(mainSettingsStore)
    const { setCallManagerState } = useCallManagerState()
    const { startWatch, stopWatch: stopSpeakerWatch } = useSessionSpeakerIndication()
    const { showNotification } = useNotification()
    const { ringingSessions, refreshSessions } = useSessionStore()
    const pinnedCallsPanelStore = usePinnedCallsPanelStore()
    const {
      isPinnedPanelSessionId,
      getSlotBySessionId,
      applySlotAudioState,
    } = pinnedCallsPanelStore
    const { globalVolumeMultiplier } = storeToRefs(pinnedCallsPanelStore)
    const { readyPreferredGoose, preferredPinnedOutputId } = storeToRefs(useDevicesStore())

    // ========================
    // == Аудио-обработка ==
    // ========================
    const userPlayer =  new Audio() // Обязательно требуется для корректного воспроизведения звука в audioContext. Иначе браузер не понимает что требуется воспроизводить звук
    let audioContext: AudioContext | undefined // Используем общий AudioContext из менеджера
    let currentOutputId: string | undefined // Сохраняем outputId для освобождения контекста
    let gainNode: GainNode | undefined // Для контроля громкости AudioContext
    let sourceNode: MediaStreamAudioSourceNode | undefined
    let analyserNode: AnalyserNode | undefined // Для анализа голоса (общий с воспроизведением)
    const remoteVoiceDetected = ref(false)
    const remoteVoiceLevel = ref(0)
    const localStream = shallowRef<MediaStream>()
    const remoteMediaStreams = shallowRef<MediaStream[]>()
    const currentDevice: Ref<SessionMediaDevice | null> = ref(null)
    const sessionId = session.id // ID сессии для отслеживания в менеджере

    const stopWatch = () => {
      stopSpeakerWatch()
      remoteVoiceDetected.value = false
      remoteVoiceLevel.value = 0
    }

    const setCurrentDevice = (device: SessionMediaDevice) => {
      currentDevice.value = device
    }
    const remoteAudioStream = computed(() => {
      const audioOnlyStream = new MediaStream()
      remoteMediaStreams.value?.forEach((stream) => {
        const audioTracks = stream.getAudioTracks()
        audioTracks.forEach(track => {
          audioOnlyStream.addTrack(track)
        })
      })
      return audioOnlyStream
    })

    const setAudioPlayerVolume = (value: number) => {
      // Оптимизировано: убраны лишние переподключения, только изменение gain
      if (gainNode) {
        gainNode.gain.value = value
      } else {
        console.warn('Не корректное состояние gainNode', gainNode)
      }
    }

    const sessionState = ref<STATE>(STATE.INITIAL)

    const number = getNumber(session)
    const conferenceTitle = session.remote_identity.display_name?.trim()
    const conference = resolveIncomingConferenceFromRemoteNumber(number, {
      title: conferenceTitle || undefined,
    })

    let contact = conference ? undefined : getByInternalNumberOrCreateExternal(number)
    let pServed =  conference ? conference.pServed : contactNumberToPServed((contact as Contact).internalNumber)
    const timer = useSessionTimer()
    const isMuted = ref<boolean>(!!session?.isMuted()?.audio)
    const isConfOnHold = computed<boolean>(() => {
      if (conference) {
        return useConferenceSubscriberStatusState().getCurrentUserStatus(conference.pServed) === MemberStatus.OnHold
      } {
        // const isHold = sessionState.value === STATE.ONHOLD
        console.warn('Попытка вызвать isConfOnHold на сессии, которая не является конференцией')
        return false
      }
    })
    const callId = ref('')
    const referCallId = ref<string | null | undefined>(null)

    const cleanupAudioResources = async (closeContext = true) => {
      // Очистка AudioContext ресурсов для предотвращения утечек памяти
      if (sourceNode) {
        sourceNode.disconnect()
        sourceNode = undefined
      }
      if (gainNode) {
        gainNode.disconnect()
        gainNode = undefined
      }
      if (analyserNode) {
        analyserNode.disconnect()
        analyserNode = undefined
      }
      // Освобождаем общий AudioContext через менеджер (он закроет контекст если больше нет активных сессий)
      if (closeContext && currentOutputId && audioContext) {
        await releaseSharedAudioContext(currentOutputId, sessionId)
        audioContext = undefined
        currentOutputId = undefined
      }
      // Очищаем userPlayer
      if (userPlayer) {
        userPlayer.pause()
        userPlayer.srcObject = null
      }
      stopWatch()
    }

    function terminate () {
      const { removeSession } = useSessionStore()
      try {
        session.terminate({ status_code: STATUS_CODES.BUSY_HERE })
      } catch (e: unknown) {
        console.error(e)
      } finally {
        // Освобождаем AudioContext асинхронно, но не блокируем завершение
        void cleanupAudioResources()
        removeSession(session.id)
        setCallManagerState(CallManagerState.INITIAL)
      }
    }

    function answer (options?: AnswerOptions, device?: SessionMediaDevice) {
      const { bindSessionToDevice } = useDevicesSessionsStore()
      const answerOptions = { ...getAnswerOptions(), ...(options ?? {}) }
      session.answer(answerOptions)
      if (device) {
        bindSessionToDevice(session.id, device.id)
      }

      // Answer со слота завешенных — call card не открываем.
      if (isPinnedPanelSessionId(session.id)) {
        const pinnedSlot = getSlotBySessionId(session.id)
        if (pinnedSlot) {
          applySlotAudioState(pinnedSlot)
        }
        return
      }

      if (contact) {
        setCallManagerState(CallManagerState.CONTACT_CALL, contact as Contact, {
          sessionId,
          callId: callId.value,
        })
      } else if (conference) {
        setCallManagerState(CallManagerState.CONFERENCE_CALL, conference, {
          sessionId,
          callId: callId.value,
        })
      }
    }

    const setAudioSenderTracksEnabled = (enabled: boolean) => {
      session.connection?.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'audio') {
          sender.track.enabled = enabled
        }
      })
    }

    function mute () {
      // Incoming pinned: mute может вызваться до peerconnection — JsSIP падает на getSenders().
      if (session.connection && !session.isMuted().audio) {
        session.mute()
      }

      // После answer/replaceTrack у muted-сессии может появиться новый включенный трек.
      setAudioSenderTracksEnabled(false)
      localStream.value?.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      isMuted.value = true
    }

    function unmute () {
      const devicesSessionsStore = useDevicesSessionsStore()

      if (!devicesSessionsStore.isGooseMicGloballyEnabled(currentDevice.value ?? undefined)) {
        return
      }

      if (
        currentDevice.value?.type === LogicalMediaDeviceTypeEnum.HANDSET
        && !devicesSessionsStore.isHandsetOffHook(currentDevice.value)
      ) {
        return
      }

      if (session.connection && session.isMuted().audio) {
        session.unmute()
      }

      setAudioSenderTracksEnabled(true)
      localStream.value?.getAudioTracks().forEach((track) => {
        track.enabled = true
      })
      isMuted.value = false
    }

    function toggleMute () {
      if (session.isMuted().audio) {
        unmute()
      } else {
        mute()
      }
    }

    function unhold () {
      if (session.isOnHold().local) {
        session.unhold()
        updateLocal({ internalNumber: number, local: CallStatusState.CONFIRMED })
      }
    }

    function toggleHold (setHold: boolean | undefined = undefined): Promise<boolean> {
      const { holdOtherSessionsOnDevice } = useDevicesSessionsStore()
      return new Promise((resolve, reject) => {
        if (conference) {
          const { roomHold, roomUnhold } = useRoomControl()
          const needHold = setHold !== undefined ? setHold : !isConfOnHold.value
          if (needHold) {
            roomHold(conference.pServed).then((res) => {
              sessionFacade.setState(STATE.ONHOLD)
              updateLocal({ internalNumber: conference.pServed, local: CallStatusState.HOLD })
              resolve(res)
            }).catch(reject)
          } else {
            if (sessionFacade.currentDevice.value) holdOtherSessionsOnDevice(sessionFacade.sessionId, sessionFacade.currentDevice.value?.id)
            roomUnhold(conference.pServed).then((res) => {
              sessionFacade.setState(STATE.CONNECTED)
              updateLocal({ internalNumber: conference.pServed, local: CallStatusState.CONFIRMED })
              resolve(res)
            }).catch(reject)
          }
        } else {
          const needHold = setHold !== undefined ? setHold : !session.isOnHold().local
          if (needHold) {
            session.hold()
            updateLocal({ internalNumber: number, local: CallStatusState.HOLD })
          } else {
            if (sessionFacade.currentDevice.value) holdOtherSessionsOnDevice(sessionFacade.sessionId, sessionFacade.currentDevice.value?.id)
            session.unhold()
            updateLocal({ internalNumber: number, local: CallStatusState.CONFIRMED })
          }
          resolve(true)
        }
      })
    }

    function refer (config: ReferConfig, onEnded?: (result: ReferResult) => void): void {
      const { t } = useLocalization()
      const number = config.toSession ? config.toSession.number : config.targetNumber
      const options: ReferOptions = { eventHandlers: {
        requestSucceeded: function () {
          const message = t('TransferOfNumberSuccessfully', { from: contact?.internalNumber, to: number })
          session.terminate()
          if (config.toSession) {
            config.toSession.terminate()
          }
          const internalNumber = contact?.internalNumber // Для решения кейса WUI-2111 Теряется статус линии абонента, после перевода звонка
          if (internalNumber) {
            updateLocal({ internalNumber, local: CallStatusState.CONFIRMED })
          }

          onEnded?.({
            type: ReferResultType.SUCCESS,
            message,
          })
        },
        requestFailed: function () {
          const message = t('TransferOfNumberError', { from: contact?.internalNumber, to: number })
          console.warn(message)
          showNotification({
            type: 'error',
            message,
          })
          onEnded?.({
            type: ReferResultType.FAIL,
            message: message,
          })
        },
      } }

      if (config.toSession) {
        options.replaces = config.toSession.session
      }

      session.refer(number, options)
    }

    function setState (state: STATE): void {
      sessionState.value = state
    }

    function setReferCallId (id?: string | null) {
      referCallId.value = id
    }

    function sendDtmf (dtmf: string): void {
      session.sendDTMF(dtmf, { duration: 200, interToneGap: 500 })
    }

    const audioContextHandler = async (outputId: string) => {
      try {
        const stream = remoteAudioStream.value
        const tracks = stream.getTracks()
        if (!tracks.length) {
          console.warn('Отсутствуют треки для воспроизведения в stream: ', stream)
        }

        // Освобождаем старый AudioContext если изменился outputId
        if (currentOutputId && currentOutputId !== outputId && audioContext) {
          await releaseSharedAudioContext(currentOutputId, sessionId)
          audioContext = undefined
          currentOutputId = undefined
        }

        // Получаем или создаем общий AudioContext для этого outputId
        // Это оптимизирует нагрузку на pulse-audio - сессии с одним устройством вывода используют один контекст
        // ВАЖНО: Пересоздаем контекст если изменился outputId или контекст закрыт
        if (!audioContext || audioContext.state === 'closed' || currentOutputId !== outputId) {
          audioContext = await getSharedAudioContext(outputId, sessionId)
          currentOutputId = outputId
        }

        if (sourceNode) { // Если уже был источник, отключаемся чтобы не дублировать
          sourceNode.disconnect()
        }
        if (gainNode) { // Если уже был узел громкости, отключаемся чтобы не дублировать
          gainNode.disconnect()
        }
        if (analyserNode) { // Если уже был анализатор, отключаемся
          analyserNode.disconnect()
        }

        sourceNode = audioContext.createMediaStreamSource(stream)
        const destinationNode = audioContext.destination
        
        // Создаём узел контроля громкости (усиления) для воспроизведения
        gainNode = audioContext.createGain()
        sourceNode.connect(gainNode)
        gainNode.connect(destinationNode)
        
        // Создаём анализатор для определения активности голоса (параллельно с воспроизведением)
        // Используем один sourceNode для двух целей - оптимизация нагрузки на pulse-audio
        analyserNode = audioContext.createAnalyser()
        analyserNode.fftSize = 512 // Размер FFT для анализа
        analyserNode.smoothingTimeConstant = 0.1
        sourceNode.connect(analyserNode) // Подключаем параллельно с gainNode
      } catch (e: unknown) {
        console.error(e)
      }
    }

    const getPlaybackOutputId = (device?: SessionMediaDevice | null): string => {
      if (isPinnedPanelSessionId(sessionId)) {
        return preferredPinnedOutputId.value ?? device?.outputId ?? 'default'
      }

      return device?.outputId ?? 'default'
    }

    const syncPlaybackOutput = async (device?: SessionMediaDevice | null) => {
      await audioContextHandler(getPlaybackOutputId(device))

      const pinnedSlot = getSlotBySessionId(sessionId)
      const targetVolume = (pinnedSlot ? pinnedSlot.volume : 1) * globalVolumeMultiplier.value

      setAudioPlayerVolume(targetVolume)
      useDevicesSessionsStore().applyStoredHandsetAudioStateToSession(sessionFacade)
      stopWatch()

      if (analyserNode) {
        startWatch(analyserNode, remoteVoiceDetected, remoteVoiceLevel)
      } else {
        remoteVoiceDetected.value = false
        remoteVoiceLevel.value = 0
      }
    }

    const customize = useCustomizeStore().getCustomizeByPServed(pServed)
    const incomingGuid = useMainSettingsStore().settings.incomingRingtoneGuid
    const incomingPath = incomingGuid
      ? findRingtoneByGuid(useRingtonesStore().ringtonesList.values(), incomingGuid)?.path
      : undefined
    changePathInPlayer(customize?.ringtonePath ?? incomingPath ?? undefined)


    // Раздельные watchers необходимы, так как remoteAudioStream и currentDevice могут меняться независимо:
    // 1. Поток может появиться раньше, чем устройство
    // 2. Устройство может меняться во время активного потока
    // Каждый watcher обрабатывает свой сценарий независимо

    const _pinnedCallHandler = () => {
      if (!isPinnedPanelSessionId(sessionId)) return

      const pinnedDevice = readyPreferredGoose.value
      const pinnedSlot = getSlotBySessionId(sessionId)

      if (!pinnedSlot) {
        return
      }

      if (!pinnedDevice || pinnedDevice.type !== LogicalMediaDeviceTypeEnum.GOOSE) {
        return
      }

      if (currentDevice.value?.id && currentDevice.value.id !== pinnedDevice.id) {
        unmute()
        return
      }

      applySlotAudioState(pinnedSlot)
    }
    
    const unwatch = watch(() => sessionState.value, async (state, oldState) => {
      if (state === STATE.RINGING && ringtonePlayer.paused && settings.value.isIncomingCallSoundEnabled) {
        setVolume(settings.value.incomingCallVolume * globalVolumeMultiplier.value)
        await ringtonePlayer.play()
      } else if (!ringingSessions.value.length && oldState === STATE.RINGING && !ringtonePlayer.paused) {
        ringtonePlayer.pause()
      }
    
      if (state === STATE.CONNECTED) {
        _pinnedCallHandler()
        unwatch()
      }
    })


    // Watcher на remoteAudioStream - обрабатывает изменения аудио потока
    watch(remoteAudioStream, async (stream) => {
      // userPlayer нужен для "активации" MediaStream в Electron/браузере
      // Обязательно требуется для корректного воспроизведения звука в audioContext
      if (stream) {
        userPlayer.srcObject = stream
        userPlayer.muted = true // Предотвращаем дополнительное воспроизведение через pulse-audio
        try {
          await userPlayer.play() // Активируем поток, но без звука (muted)
        } catch (e) {
          console.warn('userPlayer.play() failed:', e)
        }
      }

      if (sourceNode) {
        sourceNode.disconnect()
      }
      if (gainNode) {
        gainNode.disconnect()
      }
      if (analyserNode) {
        analyserNode.disconnect()
      }

      if (!stream || !stream.active || !currentDevice.value) return

      // Если есть и поток, и устройство - настраиваем воспроизведение
      await syncPlaybackOutput(currentDevice.value)
    })

    // Watcher на currentDevice - обрабатывает изменения устройства вывода
    watch(currentDevice, async (device) => {
      // Если устройство изменилось, но поток еще есть - нужно переподключить к новому устройству
      if (device && remoteAudioStream.value?.active) {
        await syncPlaybackOutput(device)
      }
    })

    watch(preferredPinnedOutputId, async (outputId, previousOutputId) => {
      if (
        !outputId
        || outputId === previousOutputId
        || !isPinnedPanelSessionId(sessionId)
        || !remoteAudioStream.value?.active
      ) {
        return
      }

      await syncPlaybackOutput(currentDevice.value)
    })

    const sessionFacade: RTCSessionFacade = {
      session,
      sessionState,
      direction: session.direction,
      answer,
      terminate,
      unhold,
      toggleHold,
      sessionId: session.id,
      number,
      pServed,
      contact,
      localStream,
      remoteMediaStreams,
      remoteAudioStream,
      currentDevice,
      setCurrentDevice,
      timer,
      isMuted,
      isConfOnHold,
      conference,
      callId,
      referCallId,
      setReferCallId,
      toggleMute,
      mute,
      unmute,
      refer,
      setState,
      sendDtmf,
      stopWatch,
      setAudioPlayerVolume,
      remoteVoiceDetected,
      remoteVoiceLevel,
    }

    if (!conference) {
      useContactCachedStore().fetchContactsBySomeIds(number, 'internalNumber')
        .then(([fetched]) => {
          if (!fetched) {
            return
          }

          contact = fetched
          sessionFacade.contact = fetched

          if (fetched.imLogin) {
            pServed = fetched.imLogin
            sessionFacade.pServed = fetched.imLogin
          }

          refreshSessions()
        })
    }

    return sessionFacade
  })()

  const eventListener = useSessionEventListener(sessionFacade)
  eventListener.addEventListeners()

  return sessionFacade
}
