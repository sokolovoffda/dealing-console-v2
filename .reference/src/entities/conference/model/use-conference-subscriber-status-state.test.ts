import { vi } from 'vitest'
import { ref } from 'vue'

vi.mock('@/shared/composables', () => ({
  useAppStore: () => ({
    currentUser: ref({ internalNumber: '1001' }),
  }),
}))

import useConferenceSubscriberStatusState from './use-conference-subscriber-status-state'

const CONF_PSERVED = '<sip:ROOMS-test@ROOT>'
const MEMBER_NUMBER = '1001'

describe('useConferenceSubscriberStatusState', () => {
  beforeEach(() => {
    const { getStatuses } = useConferenceSubscriberStatusState()
    getStatuses().value = {}
  })

  it('should update mutedMyAudio optimistically for toggle mute UI', () => {
    // Arrange
    const { setMemberAudioMuted, getMemberMediaStatus } = useConferenceSubscriberStatusState()

    // Act
    setMemberAudioMuted(CONF_PSERVED, MEMBER_NUMBER, true)

    // Assert
    expect(getMemberMediaStatus(CONF_PSERVED, MEMBER_NUMBER)?.mutedMyAudio).toBe(true)

    // Act — второй клик = unmute
    setMemberAudioMuted(CONF_PSERVED, MEMBER_NUMBER, false)

    // Assert
    expect(getMemberMediaStatus(CONF_PSERVED, MEMBER_NUMBER)?.mutedMyAudio).toBe(false)
  })
})
