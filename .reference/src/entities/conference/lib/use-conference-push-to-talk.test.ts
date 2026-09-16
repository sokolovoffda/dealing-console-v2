import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { ref } from 'vue'

const mockedState = vi.hoisted(() => ({
  memberMute: vi.fn().mockResolvedValue(true),
  memberUnmute: vi.fn().mockResolvedValue(true),
  getMemberMediaStatus: vi.fn(),
}))

vi.mock('./use-room-control', () => ({
  useRoomControl: () => ({
    memberMute: mockedState.memberMute,
    memberUnmute: mockedState.memberUnmute,
  }),
}))

vi.mock('../model/use-conference-subscriber-status-state', () => ({
  default: () => ({
    getMemberMediaStatus: mockedState.getMemberMediaStatus,
  }),
}))

vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser: ref({ internalNumber: '1001' }),
  }),
}))

import {
  useConferencePushToTalk,
  useConferenceTileOperatorPtt,
} from './use-conference-push-to-talk'

const CONF_PSERVED = '<sip:ROOMS-test@ROOT>'
const PHONE_NUMBER = '2002'

const createSession = (overrides: {
  sessionId?: string
  isMuted?: boolean
} = {}) => {
  const isMuted = ref(overrides.isMuted ?? true)

  return {
    sessionId: overrides.sessionId ?? 'session-1',
    isMuted,
    mute: vi.fn(() => {
      isMuted.value = true
    }),
    unmute: vi.fn(() => {
      isMuted.value = false
    }),
  }
}

describe('useConferencePushToTalk', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedState.getMemberMediaStatus.mockReturnValue(undefined)
  })

  describe('isPushToTalkEnabled', () => {
    it('should be enabled for all scopes until conference settings exist', () => {
      const { isPushToTalkEnabled } = useConferencePushToTalk()

      expect(isPushToTalkEnabled()).toBe(true)
      expect(isPushToTalkEnabled('participant')).toBe(true)
      expect(isPushToTalkEnabled('operator')).toBe(true)
    })
  })

  describe('participant PTT', () => {
    it('should unmute participant on press and mute on release', async () => {
      const { pressParticipantPtt, releaseParticipantPtt } = useConferencePushToTalk()
      const payload = {
        confPServed: CONF_PSERVED,
        phoneNumber: PHONE_NUMBER,
        isAudioMuted: true,
      }

      await pressParticipantPtt(payload)
      await releaseParticipantPtt(payload)

      expect(mockedState.memberUnmute).toHaveBeenCalledWith(CONF_PSERVED, PHONE_NUMBER)
      expect(mockedState.memberMute).toHaveBeenCalledWith(CONF_PSERVED, PHONE_NUMBER)
    })

    it('should no-op when participant is not muted', async () => {
      const { pressParticipantPtt, releaseParticipantPtt } = useConferencePushToTalk()

      await pressParticipantPtt({
        confPServed: CONF_PSERVED,
        phoneNumber: PHONE_NUMBER,
        isAudioMuted: false,
      })
      await releaseParticipantPtt({
        confPServed: CONF_PSERVED,
        phoneNumber: PHONE_NUMBER,
        isAudioMuted: true,
      })

      expect(mockedState.memberUnmute).not.toHaveBeenCalled()
      expect(mockedState.memberMute).not.toHaveBeenCalled()
    })
  })

  describe('operator PTT', () => {
    it('should unmute SIP and IM on press and restore on release', async () => {
      const session = createSession({ isMuted: true })
      mockedState.getMemberMediaStatus.mockReturnValue({ mutedMyAudio: true })
      const { pressOperatorPtt, releaseOperatorPtt } = useConferencePushToTalk()

      await pressOperatorPtt({
        session: session as never,
        confPServed: CONF_PSERVED,
        phoneNumber: '1001',
        isImMuted: true,
      })
      await releaseOperatorPtt({ session: session as never })

      expect(session.unmute).toHaveBeenCalledTimes(1)
      expect(mockedState.memberUnmute).toHaveBeenCalledWith(CONF_PSERVED, '1001')
      expect(session.mute).toHaveBeenCalledTimes(1)
      expect(mockedState.memberMute).toHaveBeenCalledWith(CONF_PSERVED, '1001')
    })
  })
})

describe('useConferenceTileOperatorPtt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedState.getMemberMediaStatus.mockReturnValue({ mutedMyAudio: true })
  })

  it('should suppress click after successful hold', async () => {
    const session = createSession({ isMuted: true })
    const { touchHandlers, shouldSuppressClick } = useConferenceTileOperatorPtt({
      confPServed: () => CONF_PSERVED,
      session: () => session as never,
      isAvailable: () => true,
    })

    await touchHandlers.start()
    const suppress = shouldSuppressClick()

    expect(suppress).toBe(true)
    expect(session.unmute).toHaveBeenCalled()
    expect(shouldSuppressClick()).toBe(false)
  })

  it('should not suppress click when hold was not started', () => {
    const session = createSession({ isMuted: true })
    const { shouldSuppressClick } = useConferenceTileOperatorPtt({
      confPServed: () => CONF_PSERVED,
      session: () => session as never,
      isAvailable: () => false,
    })

    expect(shouldSuppressClick()).toBe(false)
  })
})
