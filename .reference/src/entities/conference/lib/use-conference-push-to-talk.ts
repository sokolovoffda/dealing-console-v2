import { storeToRefs } from 'pinia'

import { RTCSessionFacade } from '@/entities/call-session'

import { useAppStore } from '@/shared/composables'

import useConferenceSubscriberStatusState from '../model/use-conference-subscriber-status-state'

import { useRoomControl } from './use-room-control'

export type PushToTalkScope = 'operator' | 'participant' | 'pinnedTile' | 'queueTile'

type ConferenceTileOperatorPttOptions = {
  confPServed: () => string | undefined
  session: () => RTCSessionFacade | null | undefined
  isAvailable: () => boolean
}

type ParticipantPttPayload = {
  confPServed: string
  phoneNumber: string
  isAudioMuted: boolean
}

type OperatorPttPayload = {
  session?: RTCSessionFacade | null
  confPServed?: string
  phoneNumber?: string
  /** Mute на стороне MCU (IM streams), отдельно от SIP */
  isImMuted?: boolean
}

type OperatorPttActiveState = {
  didSip: boolean
  didIm: boolean
  confPServed?: string
  phoneNumber?: string
}

const participantPttActiveKeys = new Set<string>()
const operatorPttActive = new Map<string, OperatorPttActiveState>()

const participantPttKey = (payload: ParticipantPttPayload) => {
  return `${payload.confPServed}|${payload.phoneNumber}`
}

export const useConferencePushToTalk = () => {
  const { memberMute, memberUnmute } = useRoomControl()

  // PTT-настройки будут в отдельном слое конференций, не в Main settings
  const isPushToTalkEnabled = (_scope?: PushToTalkScope): boolean => true

  // Hold на участнике: временно unmute через IM
  const pressParticipantPtt = async (payload: ParticipantPttPayload) => {
    if (!payload.isAudioMuted || !isPushToTalkEnabled('participant')) {
      return
    }

    // Ключ до await — иначе быстрый release не вернёт mute
    const key = participantPttKey(payload)
    participantPttActiveKeys.add(key)

    try {
      await memberUnmute(payload.confPServed, payload.phoneNumber)
    } catch (e) {
      participantPttActiveKeys.delete(key)
      throw e
    }
  }

  // Release: вернуть mute только если этот hold реально открывал mic
  const releaseParticipantPtt = async (payload: ParticipantPttPayload) => {
    if (!isPushToTalkEnabled('participant')) {
      return
    }

    const key = participantPttKey(payload)
    if (!participantPttActiveKeys.has(key)) {
      return
    }

    participantPttActiveKeys.delete(key)
    await memberMute(payload.confPServed, payload.phoneNumber)
  }

  // Hold на себе / плитке конфы: SIP + при необходимости IM (goose к конфе не относится)
  const pressOperatorPtt = async (payload: OperatorPttPayload) => {
    if (!isPushToTalkEnabled('operator')) {
      return
    }

    const session = payload.session
    if (!session) {
      return
    }

    const sipMuted = !!session.isMuted.value
    const imMuted = !!payload.isImMuted

    if (!sipMuted && !imMuted) {
      return
    }

    const state: OperatorPttActiveState = {
      didSip: false,
      didIm: false,
      confPServed: payload.confPServed,
      phoneNumber: payload.phoneNumber,
    }

    if (sipMuted) {
      session.unmute()
      state.didSip = true
    }

    if (imMuted && payload.confPServed && payload.phoneNumber) {
      await memberUnmute(payload.confPServed, payload.phoneNumber)
      state.didIm = true
    }

    operatorPttActive.set(session.sessionId, state)
  }

  const releaseOperatorPtt = async (payload: OperatorPttPayload) => {
    if (!isPushToTalkEnabled('operator')) {
      return
    }

    const session = payload.session
    if (!session) {
      return
    }

    const state = operatorPttActive.get(session.sessionId)
    if (!state) {
      return
    }
    operatorPttActive.delete(session.sessionId)

    if (state.didSip) {
      session.mute()
    }

    if (state.didIm && state.confPServed && state.phoneNumber) {
      await memberMute(state.confPServed, state.phoneNumber)
    }
  }

  return {
    isPushToTalkEnabled,
    pressParticipantPtt,
    releaseParticipantPtt,
    pressOperatorPtt,
    releaseOperatorPtt,
  }
}

// Hold на плитке конфы (очередь / завешенные / список): SIP + IM оператора
export const useConferenceTileOperatorPtt = (options: ConferenceTileOperatorPttOptions) => {
  const { currentUser } = storeToRefs(useAppStore())
  const { getMemberMediaStatus } = useConferenceSubscriberStatusState()
  const { pressOperatorPtt, releaseOperatorPtt } = useConferencePushToTalk()

  let pttTriggered = false

  const onPttStart = async () => {
    const confPServed = options.confPServed()
    const session = options.session()

    if (!options.isAvailable() || !confPServed || !session || !currentUser.value?.internalNumber) {
      return
    }

    pttTriggered = true

    try {
      await pressOperatorPtt({
        session,
        confPServed,
        phoneNumber: currentUser.value.internalNumber,
        isImMuted: !!getMemberMediaStatus(confPServed, currentUser.value.internalNumber)?.mutedMyAudio,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const onPttEnd = async () => {
    const confPServed = options.confPServed()
    const session = options.session()

    if (!session) {
      return
    }

    try {
      await releaseOperatorPtt({
        session,
        confPServed,
        phoneNumber: currentUser.value?.internalNumber,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const shouldSuppressClick = (): boolean => {
    if (!pttTriggered) {
      return false
    }

    pttTriggered = false
    return true
  }

  return {
    touchHandlers: {
      start: onPttStart,
      end: onPttEnd,
    },
    shouldSuppressClick,
  }
}
