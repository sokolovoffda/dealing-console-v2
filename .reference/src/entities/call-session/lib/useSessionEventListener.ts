import { PeerConnectionEvent } from '@wui/jssip/lib/RTCSession'
import { storeToRefs } from 'pinia'
import { nextTick } from 'vue'

import { useGlobalRingtone } from '@/features/global-ringtone'

import { RTCSessionFacade, STATE, usePinnedCallsStore, useSessionStore } from '@/entities/call-session'
import { useMainSettingsStore } from '@/entities/main-settings'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { useDevicesSessionsStore } from '@/shared/composables'

interface SessionEventListener {
  addEventListeners: () => void
  removeEventListeners: () => void
}

export function useSessionEventListener (
  sessionFacade: RTCSessionFacade,
): SessionEventListener {
  return {
    addEventListeners: () => {
      const { session, callId } = sessionFacade

      if (session.connection) {
        onPeerConnection(session.connection, sessionFacade)
      }

      session.addListener('connecting', (e) => {
        try {
          callId.value = e.request.getHeader('Call-ID') ?? ''
          if (session && session.connection) {
            const senders = session.connection.getSenders()
            const audioStream: MediaStream = new MediaStream()
            senders.forEach((sender) => {
              if (sender.track?.kind === 'audio') {
                audioStream.addTrack(sender.track)
              }
            })
            sessionFacade.localStream.value = audioStream

            // Если mute уже выставлен до появления треков — сразу гасим новые sender-tracks.
            if (sessionFacade.isMuted.value || session.isMuted().audio) {
              sessionFacade.mute()
            } else {
              useDevicesSessionsStore().applyStoredHandsetAudioStateToSession(sessionFacade)
            }
          }
        } catch (e) {
          console.error(e)
        }
      })

      session.addListener('peerconnection', (e: PeerConnectionEvent) => {
        onPeerConnection(e.peerconnection, sessionFacade)
      })
      session.addListener('progress', (e: unknown) => {
        onProgress(e, sessionFacade)
      })
      session.addListener('failed', (e: unknown) => {
        onFailed(e, sessionFacade)
      })
      session.addListener('ended', (e: unknown) => {
        onEnded(e, sessionFacade)
      })
      session.addListener('confirmed', (e: unknown) => {
        onConfirmed(e, sessionFacade)
      })
      session.addListener('hold', (e: unknown) => {
        onHold(e, sessionFacade)
      })
      session.addListener('unhold', (e: unknown) => {
        onUnhold(e, sessionFacade)
      })
      session.addListener('muted', (e: unknown) => {
        onMuted(e, sessionFacade)
      })
      session.addListener('unmuted', (e: unknown) => {
        onUnmuted(e, sessionFacade)
      })
      session.addListener('replaces', (e) => {
        e.accept()
        // После выполнения accept() приходит новая newRTCSession и срабатывает функция addSession в файле src\entities\call-session\model\useSessionStore.ts
        // Вся логика обрабатывается в этой функции.
      })
    },

    removeEventListeners: () => {
      const { session } = sessionFacade

      session.removeAllListeners()
    },
  }
}

function onPeerConnection (
  peerconnection: RTCPeerConnection,
  sessionFacade: RTCSessionFacade,
) {
  peerconnection.addEventListener('track', (e: RTCTrackEvent) => {
    const { remoteMediaStreams, stopWatch } = sessionFacade
    console.debug('Получен track:', {
      streams: e.streams,
      tracks: e.track,
      kind: e.track.kind,
    })
    e.track.addEventListener('ended', () => {
      remoteMediaStreams.value = removeStreamById(
        remoteMediaStreams.value || [],
        e.streams.at(0)?.id,
      )
      stopWatch()
    })

    remoteMediaStreams.value = [
      ...removeStreamById(remoteMediaStreams.value || [], e.streams.at(0)?.id),
      ...e.streams,
    ]
  })
}

function onProgress (e: unknown, sessionFacade: RTCSessionFacade) {
  const { settings } = useMainSettingsStore()
  const { playRingtone } = useGlobalRingtone()
  const { session, setState } = sessionFacade
  const { direction } = session
  setState(direction === 'outgoing' ? STATE.PROGRESS : STATE.RINGING)

  if (settings.isIncomingCallSoundEnabled && direction !== 'outgoing') {
    playRingtone().catch((e) => {
      console.error(e)
    })
  }
}

function onFailed (e: unknown, sessionFacade: RTCSessionFacade) {
  const { removeSession, ringingSessions } = useSessionStore()
  const { closeStream } = useDevicesSessionsStore()
  const { pauseRingtone } = useGlobalRingtone()
  const { setState, session, localStream } = sessionFacade

  setState(STATE.ERROR)
  if (localStream.value) {
    closeStream(localStream.value)
  }
  removeSession(session.id)
  sessionFacade.timer.stop()

  if (!ringingSessions.value.length) {
    nextTick().then(() => {
      pauseRingtone()
    })
  }
  sessionFacade.stopWatch()
}

function onEnded (e: unknown, sessionFacade: RTCSessionFacade) {
  const { removeSession, ringingSessions } = useSessionStore()
  const { closeStream } = useDevicesSessionsStore()
  const { pauseRingtone } = useGlobalRingtone()
  const { session, setState, localStream } = sessionFacade

  setState(STATE.DISCONNECTED)
  if (localStream.value) {
    closeStream(localStream.value)
  }
  removeSession(session.id)
  sessionFacade.timer.stop()

  if (!ringingSessions.value.length) {
    nextTick().then(() => {
      pauseRingtone()
    })
  }
  sessionFacade.stopWatch()
  useSessionEventListener(sessionFacade).removeEventListeners()
}

function onConfirmed (e: unknown, sessionFacade: RTCSessionFacade) {
  const { setState, setAudioPlayerVolume, sessionId } = sessionFacade
  const { pauseRingtone } = useGlobalRingtone()
  const { ringingSessions } = useSessionStore()
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()
  const { getSlotBySessionId, applySlotAudioState } = pinnedCallsPanelStore
  const { globalVolumeMultiplier } = storeToRefs(pinnedCallsPanelStore)
  const { applyStoredHandsetAudioStateToSession } = useDevicesSessionsStore()

  sessionFacade.timer.start()
  setState(STATE.CONNECTED)
  // Обработка рингтона
  if (!ringingSessions.value.length) {
    nextTick().then(() => {
      pauseRingtone()
    })
  }

  const pinnedSlot = getSlotBySessionId(sessionId)
  if (pinnedSlot) {
    // Volume + mic с учётом global Goose mute для panel-сессий.
    applySlotAudioState(pinnedSlot)
  } else {
    setAudioPlayerVolume(1 * globalVolumeMultiplier.value)
  }

  applyStoredHandsetAudioStateToSession(sessionFacade)
}

function onHold (e: unknown, sessionFacade: RTCSessionFacade) {
  sessionFacade.setState(STATE.ONHOLD)
}

function onUnhold (e: unknown, sessionFacade: RTCSessionFacade) {
  sessionFacade.setState(STATE.CONNECTED)
}

function onMuted (e: unknown, sessionFacade: RTCSessionFacade) {
  sessionFacade.isMuted.value = true
  usePinnedCallsStore().syncPinnedCallMicStateBySession(sessionFacade.sessionId, true)
}

function onUnmuted (e: unknown, sessionFacade: RTCSessionFacade) {
  sessionFacade.isMuted.value = false
  usePinnedCallsStore().syncPinnedCallMicStateBySession(sessionFacade.sessionId, false)
}

function removeStreamById (arr?: MediaStream[], id?: string): MediaStream[] {
  if (!arr) return []
  if (!id) return arr
  return arr.filter(stream => stream.id !== id)
}
