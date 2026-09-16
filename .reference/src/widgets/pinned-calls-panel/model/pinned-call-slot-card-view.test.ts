import { ref } from 'vue'

import { STATE, type RTCSessionFacade } from '@/entities/call-session'

import {
  getPinnedCallStatusIcon,
  isPinnedCallLocalHold,
  isPinnedCallMicDimmed,
  isPinnedCallMicInteractionDisabled,
  isPinnedSlotVadTrackVisible,
  PINNED_CALL_SLOT_VIEW_STATE,
  resolvePinnedSlotCardVisualModifier,
  resolvePinnedSlotCardVisualState,
  resolvePinnedSlotIndexTone,
  resolvePinnedSlotMicIcon,
  resolvePinnedSlotVolumeIcon,
  resolvePinnedSlotViewState,
  resolvePinnedSlotVoiceActivityPercent,
  shouldShowPinnedSlotIndex,
} from './pinned-call-slot-card-view'

const createSession = (options: {
  state: STATE
  direction?: 'incoming' | 'outgoing'
  localHold?: boolean
  isConfOnHold?: boolean
}): RTCSessionFacade => {
  const session = {
    isOnHold: () => ({ local: Boolean(options.localHold) }),
  }

  return {
    sessionState: ref(options.state),
    direction: options.direction ?? 'outgoing',
    isConfOnHold: ref(Boolean(options.isConfOnHold)),
    session,
  } as unknown as RTCSessionFacade
}

describe('pinned-call-slot-card-view', () => {
  describe('resolvePinnedSlotViewState', () => {
    it('should map session states to slot view states', () => {
      // Arrange / Act / Assert
      expect(resolvePinnedSlotViewState(null)).toBe(PINNED_CALL_SLOT_VIEW_STATE.idle)
      expect(resolvePinnedSlotViewState(createSession({ state: STATE.CONNECTED })))
        .toBe(PINNED_CALL_SLOT_VIEW_STATE.active)
      expect(resolvePinnedSlotViewState(createSession({ state: STATE.ONHOLD })))
        .toBe(PINNED_CALL_SLOT_VIEW_STATE.hold)
      expect(resolvePinnedSlotViewState(createSession({
        state: STATE.PROGRESS,
        direction: 'outgoing',
      }))).toBe(PINNED_CALL_SLOT_VIEW_STATE.outgoing)
      expect(resolvePinnedSlotViewState(createSession({
        state: STATE.RINGING,
        direction: 'incoming',
      }))).toBe(PINNED_CALL_SLOT_VIEW_STATE.incoming)
    })
  })

  describe('isPinnedCallLocalHold', () => {
    it('should detect local hold like call-card', () => {
      // Arrange / Act / Assert
      expect(isPinnedCallLocalHold(createSession({
        state: STATE.ONHOLD,
        localHold: true,
      }))).toBe(true)

      expect(isPinnedCallLocalHold(createSession({
        state: STATE.ONHOLD,
        localHold: false,
      }))).toBe(false)

      expect(isPinnedCallLocalHold(createSession({
        state: STATE.ONHOLD,
        isConfOnHold: true,
      }))).toBe(true)
    })
  })

  describe('resolvePinnedSlotCardVisualState', () => {
    it('should keep call accents outside connected audio', () => {
      // Arrange / Act / Assert
      expect(resolvePinnedSlotCardVisualState({
        viewState: PINNED_CALL_SLOT_VIEW_STATE.idle,
        isMicOn: true,
        volumePercent: 50,
      })).toBe('idle')

      expect(resolvePinnedSlotCardVisualState({
        viewState: PINNED_CALL_SLOT_VIEW_STATE.outgoing,
        isMicOn: true,
        volumePercent: 50,
      })).toBe('outgoing')

      expect(resolvePinnedSlotCardVisualState({
        viewState: PINNED_CALL_SLOT_VIEW_STATE.hold,
        isMicOn: true,
        volumePercent: 50,
      })).toBe('hold')
    })

    it('should map active mic/volume into group-like matrix', () => {
      // Arrange / Act / Assert
      expect(resolvePinnedSlotCardVisualState({
        viewState: PINNED_CALL_SLOT_VIEW_STATE.active,
        isMicOn: false,
        volumePercent: 40,
      })).toBe('inactive')

      expect(resolvePinnedSlotCardVisualState({
        viewState: PINNED_CALL_SLOT_VIEW_STATE.active,
        isMicOn: false,
        volumePercent: 0,
      })).toBe('inactive-muted')

      expect(resolvePinnedSlotCardVisualState({
        viewState: PINNED_CALL_SLOT_VIEW_STATE.active,
        isMicOn: true,
        volumePercent: 40,
      })).toBe('active')

      expect(resolvePinnedSlotCardVisualState({
        viewState: PINNED_CALL_SLOT_VIEW_STATE.active,
        isMicOn: true,
        volumePercent: 0,
      })).toBe('active-muted')
    })
  })

  describe('icons', () => {
    it('should use group mic icons and volume mute icon', () => {
      // Arrange / Act / Assert
      expect(resolvePinnedSlotMicIcon(false)).toBe('micM')
      expect(resolvePinnedSlotMicIcon(true)).toBe('micF')
      expect(resolvePinnedSlotVolumeIcon(0)).toBe('volumeOffM')
      expect(resolvePinnedSlotVolumeIcon(10)).toBe('volumeOnF')
    })

    it('should resolve hold as pauseF local and pauseM remote', () => {
      // Arrange
      const localHold = createSession({ state: STATE.ONHOLD, localHold: true })
      const remoteHold = createSession({ state: STATE.ONHOLD, localHold: false })

      // Act / Assert
      expect(getPinnedCallStatusIcon(PINNED_CALL_SLOT_VIEW_STATE.hold, {
        session: localHold,
      })).toBe('pauseF')

      expect(getPinnedCallStatusIcon(PINNED_CALL_SLOT_VIEW_STATE.hold, {
        session: remoteHold,
      })).toBe('pauseM')

      expect(getPinnedCallStatusIcon(PINNED_CALL_SLOT_VIEW_STATE.active, {
        isLineAudible: true,
      })).toBe('volumeOnF')

      expect(getPinnedCallStatusIcon(PINNED_CALL_SLOT_VIEW_STATE.active, {
        isLineAudible: false,
      })).toBe('volumeOffM')
    })
  })

  describe('resolvePinnedSlotCardVisualModifier', () => {
    it('should build css modifier from visual state', () => {
      // Arrange / Act / Assert
      expect(resolvePinnedSlotCardVisualModifier('active-muted'))
        .toBe('pinned-slot-card--active-muted')
    })
  })

  describe('mic interaction', () => {
    it('should allow mic only in active or hold', () => {
      // Arrange / Act / Assert
      expect(isPinnedCallMicInteractionDisabled(PINNED_CALL_SLOT_VIEW_STATE.idle)).toBe(true)
      expect(isPinnedCallMicInteractionDisabled(PINNED_CALL_SLOT_VIEW_STATE.outgoing)).toBe(true)
      expect(isPinnedCallMicInteractionDisabled(PINNED_CALL_SLOT_VIEW_STATE.incoming)).toBe(true)
      expect(isPinnedCallMicInteractionDisabled(PINNED_CALL_SLOT_VIEW_STATE.active)).toBe(false)
      expect(isPinnedCallMicInteractionDisabled(PINNED_CALL_SLOT_VIEW_STATE.hold)).toBe(false)
      expect(isPinnedCallMicDimmed(PINNED_CALL_SLOT_VIEW_STATE.idle)).toBe(true)
    })
  })

  describe('slot index badge', () => {
    it('should show index only when more than one slot shares pServed', () => {
      // Arrange / Act / Assert
      expect(shouldShowPinnedSlotIndex(1)).toBe(false)
      expect(shouldShowPinnedSlotIndex(2)).toBe(true)
    })

    it('should map visual state to slot index tone', () => {
      // Arrange / Act / Assert
      expect(resolvePinnedSlotIndexTone('idle')).toBe('dis')
      expect(resolvePinnedSlotIndexTone('outgoing')).toBe('dis')
      expect(resolvePinnedSlotIndexTone('hold')).toBe('dis')
      expect(resolvePinnedSlotIndexTone('inactive')).toBe('def')
      expect(resolvePinnedSlotIndexTone('inactive-muted')).toBe('def')
      expect(resolvePinnedSlotIndexTone('active')).toBe('act')
      expect(resolvePinnedSlotIndexTone('active-muted')).toBe('act')
    })
  })

  describe('VAD track', () => {
    it('should show gray track for active and hold sessions', () => {
      // Arrange / Act / Assert
      expect(isPinnedSlotVadTrackVisible(PINNED_CALL_SLOT_VIEW_STATE.idle)).toBe(false)
      expect(isPinnedSlotVadTrackVisible(PINNED_CALL_SLOT_VIEW_STATE.outgoing)).toBe(false)
      expect(isPinnedSlotVadTrackVisible(PINNED_CALL_SLOT_VIEW_STATE.active)).toBe(true)
      expect(isPinnedSlotVadTrackVisible(PINNED_CALL_SLOT_VIEW_STATE.hold)).toBe(true)
    })

    it('should clamp voice level only while remote voice is detected', () => {
      // Arrange / Act / Assert
      expect(resolvePinnedSlotVoiceActivityPercent({
        hasVoice: false,
        voiceLevel: 80,
      })).toBe(0)

      expect(resolvePinnedSlotVoiceActivityPercent({
        hasVoice: true,
        voiceLevel: 80,
      })).toBe(80)

      expect(resolvePinnedSlotVoiceActivityPercent({
        hasVoice: true,
        voiceLevel: 150,
      })).toBe(100)

      expect(resolvePinnedSlotVoiceActivityPercent({
        hasVoice: true,
        voiceLevel: -10,
      })).toBe(0)
    })
  })
})
