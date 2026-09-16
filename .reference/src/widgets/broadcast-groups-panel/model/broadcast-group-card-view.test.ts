import { ref } from 'vue'

import { STATE, type RTCSessionFacade } from '@/entities/call-session'
import {
  PINNED_CALLS_GROUP_INITIAL_MIC_STATE,
  PINNED_CALLS_INITIAL_VOLUME,
  type PinnedCallGroup,
} from '@/entities/pinned-calls'

import {
  isBroadcastGroupAudible,
  isBroadcastMemberSessionActive,
  resolveBroadcastGroupFooterVisualState,
  resolveBroadcastGroupMicIcon,
  resolveBroadcastGroupMicState,
  resolveBroadcastGroupVoiceActivityPercent,
  resolveBroadcastGroupVolumeIcon,
  resolveBroadcastGroupVolumePercent,
} from './broadcast-group-card-view'

const createSession = (state: STATE): RTCSessionFacade => ({
  sessionState: ref(state),
} as RTCSessionFacade)

describe('broadcast-group-card-view', () => {
  describe('isBroadcastMemberSessionActive', () => {
    it('should treat CONNECTED and ONHOLD as active', () => {
      // Arrange / Act / Assert
      expect(isBroadcastMemberSessionActive(createSession(STATE.CONNECTED))).toBe(true)
      expect(isBroadcastMemberSessionActive(createSession(STATE.ONHOLD))).toBe(true)
      expect(isBroadcastMemberSessionActive(createSession(STATE.INITIAL))).toBe(false)
      expect(isBroadcastMemberSessionActive(null)).toBe(false)
    })
  })

  describe('resolveBroadcastGroupFooterVisualState', () => {
    it('should return disabled without active session or when forced', () => {
      // Arrange / Act / Assert
      expect(resolveBroadcastGroupFooterVisualState({
        forceDisabled: false,
        hasActiveSession: false,
        isMicOn: true,
        volumePercent: 50,
      })).toBe('disabled')

      expect(resolveBroadcastGroupFooterVisualState({
        forceDisabled: true,
        hasActiveSession: true,
        isMicOn: true,
        volumePercent: 50,
      })).toBe('disabled')
    })

    it('should map mic and mute into inactive/active variants', () => {
      // Arrange / Act / Assert
      expect(resolveBroadcastGroupFooterVisualState({
        forceDisabled: false,
        hasActiveSession: true,
        isMicOn: false,
        volumePercent: 40,
      })).toBe('inactive')

      expect(resolveBroadcastGroupFooterVisualState({
        forceDisabled: false,
        hasActiveSession: true,
        isMicOn: false,
        volumePercent: 0,
      })).toBe('inactive-muted')

      expect(resolveBroadcastGroupFooterVisualState({
        forceDisabled: false,
        hasActiveSession: true,
        isMicOn: true,
        volumePercent: 40,
      })).toBe('active')

      expect(resolveBroadcastGroupFooterVisualState({
        forceDisabled: false,
        hasActiveSession: true,
        isMicOn: true,
        volumePercent: 0,
      })).toBe('active-muted')
    })
  })

  describe('group audio intent helpers', () => {
    it('should resolve mic and volume icons from pressed state', () => {
      // Arrange / Act / Assert
      expect(resolveBroadcastGroupMicIcon(false)).toBe('micM')
      expect(resolveBroadcastGroupMicIcon(true)).toBe('micF')
      expect(resolveBroadcastGroupVolumeIcon(0)).toBe('volumeOffM')
      expect(resolveBroadcastGroupVolumeIcon(10)).toBe('volumeOnF')
      expect(isBroadcastGroupAudible(0)).toBe(false)
      expect(isBroadcastGroupAudible(1)).toBe(true)
    })

    it('should use group intent for volume percent, not reverse-sync', () => {
      // Arrange
      const mutedGroup: PinnedCallGroup = {
        index: 0,
        micState: true,
        volumeState: false,
        members: [],
      }
      const audibleGroup: PinnedCallGroup = {
        ...mutedGroup,
        volumeState: true,
      }

      // Act / Assert
      expect(resolveBroadcastGroupVolumePercent(mutedGroup, 0.7)).toBe(0)
      expect(resolveBroadcastGroupVolumePercent(audibleGroup, 0.7)).toBe(70)
      expect(resolveBroadcastGroupVolumePercent(audibleGroup)).toBe(
        Math.round(PINNED_CALLS_INITIAL_VOLUME * 100),
      )
      expect(resolveBroadcastGroupMicState(undefined)).toBe(PINNED_CALLS_GROUP_INITIAL_MIC_STATE)
      expect(resolveBroadcastGroupMicState(audibleGroup)).toBe(true)
    })
  })

  describe('resolveBroadcastGroupVoiceActivityPercent', () => {
    it('should take max remoteVoiceLevel among speaking members only', () => {
      // Arrange
      const members = [
        { hasVoice: false, voiceLevel: 90 },
        { hasVoice: true, voiceLevel: 25 },
        { hasVoice: true, voiceLevel: 60 },
      ]

      // Act / Assert
      expect(resolveBroadcastGroupVoiceActivityPercent(members)).toBe(60)
      expect(resolveBroadcastGroupVoiceActivityPercent([])).toBe(0)
      expect(resolveBroadcastGroupVoiceActivityPercent([
        { hasVoice: false, voiceLevel: 100 },
      ])).toBe(0)
    })
  })
})
