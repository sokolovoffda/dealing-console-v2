import { ContactState } from '@wui/im'

import { resolveContactAudioMuted } from './resolve-contact-audio-muted'

const createContact = (overrides: Partial<ContactState> = {}): ContactState => ({
  id: '<sip:1001@ROOT>',
  lrei: 0,
  lrer: 0,
  name: 'Test',
  state: 2,
  handEnabled: false,
  mutedMyAudio: false,
  mutedMyVideo: false,
  mutedOtherAudio: false,
  mutedOtherVideo: false,
  type: 'member',
  role: 'User',
  ltsmar: 0,
  temporary: false,
  ...overrides,
})

describe('resolveContactAudioMuted', () => {
  it('should return true when audio stream client_enabled is false', () => {
    // Arrange
    const contact = createContact({
      mutedMyAudio: false,
      calls: [{
        streams: [{
          kind: 'audio',
          mid: 'audio',
          client_bound: true,
          client_enabled: false,
        }],
      }] as unknown as ContactState['calls'],
    })

    // Act
    const isMuted = resolveContactAudioMuted(contact)

    // Assert
    expect(isMuted).toBe(true)
  })

  it('should return false when audio stream client_enabled is true', () => {
    // Arrange
    const contact = createContact({
      mutedMyAudio: true,
      calls: [{
        streams: [{
          kind: 'audio',
          mid: 'audio',
          client_bound: true,
          client_enabled: true,
        }],
      }] as unknown as ContactState['calls'],
    })

    // Act
    const isMuted = resolveContactAudioMuted(contact)

    // Assert
    expect(isMuted).toBe(false)
  })

  it('should fall back to mutedMyAudio when streams are missing', () => {
    // Arrange
    const contact = createContact({ mutedMyAudio: true })

    // Act
    const isMuted = resolveContactAudioMuted(contact)

    // Assert
    expect(isMuted).toBe(true)
  })
})
