import { SessionDirection } from '@wui/jssip/lib/RTCSession'
import { vi } from 'vitest'
import { computed, ref, shallowRef } from 'vue'

import { mockContact4498 } from '@/__mocks_/mock-contact'

import { RTCSessionFacade } from '@/entities/call-session'

export const mockRTCSessionFacade: RTCSessionFacade = {
  timer: {
    duration: computed(() => '5023'),
    stop: () => vi.fn(),
    start: () => vi.fn(),
  },
  session: {
    id: 'test id',
  } as any,
  remoteMediaStreams: ref([]),
  terminate: () => vi.fn(),
  toggleHold: () => Promise.resolve(true),
  toggleMute: () => vi.fn(),
  isMuted: ref(false),
  sessionState: ref(0),
  sessionId: 'sessionId',
  callId: ref(''),
  referCallId: ref(''),
  setReferCallId: () => vi.fn(),
  remoteAudioStream: ref(),
  number: '4498',
  setState: () => vi.fn(),
  sendDtmf: () => vi.fn(),
  refer: () => vi.fn(),
  answer: () => vi.fn(),
  direction: 'incoming' as SessionDirection,
  currentDevice: ref(null),
  pServed: 'TEST-PSERVED',
  contact: mockContact4498,
  setCurrentDevice: () => vi.fn(),
  localStream: shallowRef(),
  mute: () => vi.fn(),
  isConfOnHold: ref(false),
  remoteVoiceDetected: ref(false),
  remoteVoiceLevel: ref(0),
  stopWatch: () => vi.fn(),
  unhold: () => vi.fn(),
  unmute: () => vi.fn(),
  setAudioPlayerVolume: () => vi.fn(),
}
