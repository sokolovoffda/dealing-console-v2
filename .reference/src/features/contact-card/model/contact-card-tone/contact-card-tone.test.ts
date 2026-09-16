import type { ContactCardSelfStatus } from '../use-contact-card-status'

import {
  CONTACT_CARD_BASE_TONE,
  CONTACT_CARD_DISABLED_TONE,
  CONTACT_CARD_MOVABLE_TONE,
  CONTACT_CARD_PRIORITIES,
  getContactCardTone,
} from './contact-card-tone'


const SELF_STATUSES = {
  incomingSelf: 'incoming-self' as ContactCardSelfStatus,
  outgoingSelf: 'outgoing-self' as ContactCardSelfStatus,
}

describe('contact-card-tone', () => {
  it('returns default offline presence tone when there is no self status', () => {
    // Arrange / Act
    const tone = getContactCardTone()

    // Assert
    expect(tone).toEqual(CONTACT_CARD_DISABLED_TONE)
  })

  it('returns disabled tone when call action is unavailable', () => {
    // Arrange / Act
    const tone = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      disabled: true,
      selfStatus: SELF_STATUSES.incomingSelf,
    })

    // Assert
    expect(tone).toEqual(CONTACT_CARD_DISABLED_TONE)
  })

  it('returns focused/movable tone when card is being moved', () => {
    // Arrange / Act
    const tone = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      movable: true,
      selfStatus: SELF_STATUSES.incomingSelf,
    })

    // Assert
    expect(tone).toEqual(CONTACT_CARD_MOVABLE_TONE)
    expect(tone.root).toContain('bg-card-neutcon-bg-base-pres')
    expect(tone.root).toContain('border-card-neutcon-brd-base-foc')
  })

  it('returns primary icon name and class from visual contract', () => {
    // Arrange / Act
    const tone = getContactCardTone()

    // Assert
    expect(tone.primaryIcon).toEqual({
      name: 'userRoundF',
      class: 'text-card-neutcon-avt-base-dis',
    })
  })

  it('uses priority colors only for incoming self status', () => {
    // Arrange / Act
    const defaultTone = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: SELF_STATUSES.incomingSelf,
    })
    const highTone = getContactCardTone(CONTACT_CARD_PRIORITIES.high, {
      selfStatus: SELF_STATUSES.incomingSelf,
    })

    // Assert
    expect(defaultTone.root).toBe('bg-card-state-bg-warncon-def')
    expect(highTone.root).toBe('bg-card-state-bg-negcon-def')
    expect(highTone.primaryIcon.class).toBe('text-card-state-avt-neg')
    expect(highTone.number).toBe('text-card-state-num-neg')
    expect(highTone.name).toBe('text-card-state-name-neg')
  })

  it('uses fixed self status colors except incoming self status', () => {
    // Arrange / Act
    const defaultTone = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: SELF_STATUSES.outgoingSelf,
    })
    const highTone = getContactCardTone(CONTACT_CARD_PRIORITIES.high, {
      selfStatus: SELF_STATUSES.outgoingSelf,
    })

    // Assert
    expect(defaultTone.root).toBe(highTone.root)
    expect(defaultTone.primaryIcon.name).toBe('arrowNorthEastM')
  })

  it('keeps offline tone independent from unused priority when presence is offline', () => {
    // Arrange / Act
    const defaultTone = getContactCardTone(CONTACT_CARD_PRIORITIES.default)
    const highTone = getContactCardTone(CONTACT_CARD_PRIORITIES.high)

    // Assert
    expect(defaultTone).toEqual(CONTACT_CARD_DISABLED_TONE)
    expect(highTone.root).toBe('bg-card-deal-bg-dis-red')
  })

  it('uses online presence tone for default priority', () => {
    // Arrange / Act
    const tone = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      presence: 'online',
    })

    // Assert
    expect(tone).toEqual(CONTACT_CARD_BASE_TONE)
  })

  it('uses pinned mic icons for incoming pinned session and keeps incoming background', () => {
    // Arrange / Act
    const leftTone = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: SELF_STATUSES.incomingSelf,
      deviceSide: 'L',
      isPinnedSession: true,
    })
    const rightTone = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: SELF_STATUSES.incomingSelf,
      deviceSide: 'R',
      isPinnedSession: true,
    })

    // Assert
    expect(leftTone.root).toBe('bg-card-state-bg-warncon-def')
    expect(leftTone.primaryIcon.name).toBe('micLeftF')
    expect(rightTone.root).toBe('bg-card-state-bg-warncon-def')
    expect(rightTone.primaryIcon.name).toBe('micRightF')
  })

  it('uses F/M hold icons by local vs remote hold and keeps hold backgrounds', () => {
    // Arrange / Act
    const localHold = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: 'outgoing-hold-self',
      deviceSide: 'L',
    })
    const remoteHold = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: 'incoming-hold-self',
      deviceSide: 'R',
    })
    const localPinnedHold = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: 'outgoing-hold-self',
      deviceSide: 'R',
      isPinnedSession: true,
    })
    const remotePinnedHold = getContactCardTone(CONTACT_CARD_PRIORITIES.default, {
      selfStatus: 'incoming-hold-self',
      deviceSide: 'L',
      isPinnedSession: true,
    })

    // Assert
    expect(localHold.root).toBe('bg-card-state-bg-waitcon-def')
    expect(localHold.primaryIcon.name).toBe('phonePauseF')
    expect(remoteHold.root).toBe('bg-card-state-bg-waitcon-def')
    expect(remoteHold.primaryIcon.name).toBe('phonePauseInvM')
    expect(localPinnedHold.root).toBe('bg-card-state-bg-waitcon-def')
    expect(localPinnedHold.primaryIcon.name).toBe('micPauseRightF')
    expect(remotePinnedHold.root).toBe('bg-card-state-bg-waitcon-def')
    expect(remotePinnedHold.primaryIcon.name).toBe('micPauseLeftM')
  })
})
