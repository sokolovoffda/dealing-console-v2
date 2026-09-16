import { storeToRefs } from 'pinia'

import { RTCSessionFacade, STATE, useSessionStore } from '@/entities/call-session'

import { useAppStore } from '@/shared/composables'
import { wait } from '@/shared/utils/useWait'

import { MemberStatus } from '../model/use-conference-subscriber-status-state'
import useConferenceSubscriberStatusState from '../model/use-conference-subscriber-status-state'

import { useRoomControl } from './use-room-control'

type ConferenceOperatorMuteSession = {
  mute: () => void
}

const SESSION_CONNECT_TIMEOUT_MS = 15000
const OPERATOR_ACTIVE_TIMEOUT_MS = 10000
const POLL_INTERVAL_MS = 200

export const waitForConferenceSessionConnected = async (
  confPServed: string,
  timeoutMs = SESSION_CONNECT_TIMEOUT_MS,
): Promise<RTCSessionFacade | undefined> => {
  const { getSessionByPServed } = useSessionStore()
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const session = getSessionByPServed(confPServed)
    if (session?.sessionState.value === STATE.CONNECTED) {
      return session
    }
    await wait(POLL_INTERVAL_MS)
  }

  return getSessionByPServed(confPServed)
}

const waitForOperatorActiveInConference = async (
  confPServed: string,
  internalNumber: string,
  timeoutMs = OPERATOR_ACTIVE_TIMEOUT_MS,
): Promise<boolean> => {
  const { getMemberStatus } = useConferenceSubscriberStatusState()
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (getMemberStatus(confPServed, internalNumber) === MemberStatus.Active) {
      return true
    }
    await wait(POLL_INTERVAL_MS)
  }

  return getMemberStatus(confPServed, internalNumber) === MemberStatus.Active
}

// muteAllExceptExecuter не трогает оператора — после muteAll явно mute на MCU (+ SIP)
export const muteConferenceOperatorOnMcu = async (
  confPServed: string,
  session?: ConferenceOperatorMuteSession | null,
): Promise<void> => {
  const { currentUser } = storeToRefs(useAppStore())
  const internalNumber = currentUser.value?.internalNumber

  if (!internalNumber) {
    return
  }

  await waitForOperatorActiveInConference(confPServed, internalNumber)

  const { memberMute } = useRoomControl()
  const { setMemberAudioMuted } = useConferenceSubscriberStatusState()

  setMemberAudioMuted(confPServed, internalNumber, true)
  session?.mute()

  try {
    await memberMute(confPServed, internalNumber)
  } catch (e) {
    console.error(e)
  }
}
