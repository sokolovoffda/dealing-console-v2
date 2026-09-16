import { useIM } from '@wui/im'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/shared/composables'

const {
  startConference, stopConference, beginRecordingConference, endRecordingConference, enableAutoRecording, disableAutoRecording,
  holdSubscriber, unholdSubscriber, callSubscriber, kickSubscriber, muteSubscriberAudio, unmuteSubscriberAudio, holdConference, unholdConference,
} = useIM()

export function useRoomControl () {
  const { currentUser } = storeToRefs(useAppStore())
  const currentUserInternalNumber = currentUser.value?.internalNumber

  if (!currentUserInternalNumber) {
    throw new Error('Can\t use room control without current user internal number')
  }


  const roomCall = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return startConference({ pServed })
  }

  const roomTerminate = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return stopConference({ pServed })
  }

  const roomEnableAutoRecording = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)
    console.debug('Room enable auto recording: ', pServed)
    return enableAutoRecording(pServed)
  }
  const roomDisableAutoRecording = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)
    console.debug('Room disable auto recording: ', pServed)
    return disableAutoRecording(pServed)
  }

  const roomBeginRecord = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return beginRecordingConference({ pServed })
  }

  const roomEndRecord = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return endRecordingConference({ pServed })
  }

  const roomHold = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return holdSubscriber({
      pServed,
      internalNumber: currentUserInternalNumber,
    })
  }

  const roomUnhold = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return unholdSubscriber({
      pServed,
      internalNumber: currentUserInternalNumber,
    })
  }

  const memberCall = (pServed: string, internalNumber: string) => {
    if (!pServed || !internalNumber) return Promise.resolve(false)
    return callSubscriber({
      pServed,
      internalNumber,
    })
  }

  const memberKick = (pServed: string, internalNumber: string) => {
    if (!pServed || !internalNumber) return Promise.resolve(false)

    return kickSubscriber({
      pServed,
      internalNumber,
    })
  }

  const memberMute = (pServed: string, internalNumber: string) => {
    if (!pServed || !internalNumber) return Promise.resolve(false)

    return muteSubscriberAudio({
      pServed,
      internalNumber,
    })
  }

  const memberUnmute = (pServed: string, internalNumber: string) => {
    if (!pServed || !internalNumber) return Promise.resolve(false)

    return unmuteSubscriberAudio({
      pServed,
      internalNumber,
    })
  }

  const pauseConference = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return holdConference({
      pServed,
    })
  }

  const continueConference = (pServed: string) => {
    if (!pServed) return Promise.resolve(false)

    return unholdConference({
      pServed,
    })
  }

  return {
    roomCall,
    roomTerminate,
    roomBeginRecord,
    roomEndRecord,
    roomEnableAutoRecording,
    roomDisableAutoRecording,
    roomHold,
    roomUnhold,
    memberCall,
    memberKick,
    memberMute,
    memberUnmute,
    pauseConference,
    continueConference,
  }
}
