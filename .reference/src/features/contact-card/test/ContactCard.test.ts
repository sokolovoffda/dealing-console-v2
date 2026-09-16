import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import type { Contact } from '@/entities/contact'

import {
  CONTACT_CARD_BASE_TONE,
  CONTACT_CARD_DISABLED_TONE,
  CONTACT_CARD_SELF_TONES,
} from '../model/contact-card-tone'
import {
  CONTACT_CARD_SELF_STATUSES,
} from '../model/use-contact-card-status'
import ContactCard from '../ui/ContactCard.vue'

const mocks = vi.hoisted(() => {
  const STATE = {
    INITIAL: 0,
    PROGRESS: 1,
    RINGING: 2,
    CONNECTED: 3,
    ERROR: 4,
    ONHOLD: 5,
    DISCONNECTED: 6,
  } as const

  return {
    STATE,
    getPreferredSessionByPServedMock: vi.fn(),
    callNumberFromSelectedHandsetMock: vi.fn(),
    openSessionInPreferredHandsetMock: vi.fn(),
    openPinnedPanelSessionMock: vi.fn(),
    answerSelectedSessionMock: vi.fn(),
    hasAvailableHandset: { value: true },
    getSlotsByPServedMock: vi.fn(() => [] as Array<{ order: number, slotIndex: number }>),
    assignSessionToFreeSlotMock: vi.fn(),
    setActiveSlotMock: vi.fn(),
    slotSessionIds: new Map<number, string>(),
    readyPreferredGoose: { value: undefined as { id: string } | undefined },
    switchToCallMock: vi.fn(),
    showNotificationMock: vi.fn(),
    contactStatuses: {} as Record<string, { registered?: boolean }>,
    findLinesByInternalNumberMock: vi.fn(() => []),
  }
})

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()

  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => store,
  }
})

vi.mock('@/entities/call-session', () => ({
  STATE: mocks.STATE,
  useSessionStore: () => ({
    getPreferredSessionByPServed: mocks.getPreferredSessionByPServedMock,
  }),
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    getSlotsByPServed: mocks.getSlotsByPServedMock,
    assignSessionToFreeSlot: mocks.assignSessionToFreeSlotMock,
    setActiveSlot: mocks.setActiveSlotMock,
    slotSessionIds: mocks.slotSessionIds,
  }),
}))

vi.mock('@/features/contact-card/model/use-contact-card-presence/use-contact-card-presence', async () => {
  const { computed, toValue } = await import('vue')

  return {
    useContactCardPresence: (contact: unknown) => ({
      presence: computed(() => {
        const internalNumber = toValue(contact as { internalNumber?: string })?.internalNumber

        if (!internalNumber) {
          return 'offline'
        }

        return mocks.contactStatuses[internalNumber]?.registered === true
          ? 'online'
          : 'offline'
      }),
    }),
  }
})

vi.mock('@/entities/contact', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/contact')>()

  return {
    ...actual,
    useContactStatusState: () => ({
      contactStatuses: ref(mocks.contactStatuses),
      findLinesByInternalNumber: mocks.findLinesByInternalNumberMock,
    }),
  }
})

vi.mock('@/features/call-card', () => ({
  useCallCardStore: () => ({
    hasAvailableHandset: mocks.hasAvailableHandset,
    callNumberFromSelectedHandset: mocks.callNumberFromSelectedHandsetMock,
    openSessionInPreferredHandset: mocks.openSessionInPreferredHandsetMock,
    openPinnedPanelSession: mocks.openPinnedPanelSessionMock,
    answerSelectedSession: mocks.answerSelectedSessionMock,
  }),
}))

vi.mock('@/shared/composables', () => ({
  useDevicesStore: () => ({
    queueDevices: [
      {
        id: 'device-1',
        inputId: 'input-1',
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    ],
    readyPreferredGoose: mocks.readyPreferredGoose,
  }),
  notifyMediaDeviceUnavailableForCall: () => {
    mocks.showNotificationMock({
      type: 'error',
      message: 'MediaDeviceUnavailableForCall',
    })
  },
  LogicalMediaDeviceTypeEnum: {
    GOOSE: 'goose',
    HANDSET: 'handset',
  },
}))

vi.mock('@/shared/jssip', () => ({
  useWebRTC: () => ({
    switchToCall: mocks.switchToCallMock,
  }),
}))

vi.mock('@/shared/i18n', () => ({
  useLocalization: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/shared/notifications', () => ({
  useNotification: () => ({
    showNotification: mocks.showNotificationMock,
  }),
}))

vi.mock('@wui/common-library', () => {
  return {
    useTranslations: () => ({
      setTranslations: vi.fn(),
    }),
    WuiBtn: {
      name: 'WuiBtn',
      template: '<button><slot /></button>',
    },
    WuiIcon: {
      name: 'WuiIcon',
      props: {
        name: {
          type: String,
          required: true,
        },
      },
      template: '<i :data-test="$attrs[\'data-test\']" :data-name="name" />',
    },
  }
})

const createContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-1',
  name: 'Петров Владимир',
  pServed: '<sip:2233@ROOT>',
  internalNumber: '2233',
  groupIds: [],
  imLogin: '<sip:2233@ROOT>',
  terminalLogin: 'terminal-2233',
  terminalPassword: 'password-2233',
  groups: [],
  ...overrides,
})

const mountCard = (
  user = createContact(),
  props: Record<string, unknown> = {},
) => {
  return mount(ContactCard, {
    props: {
      user,
      ...props,
    },
  })
}

const createSession = (
  state: number,
  sessionId = 'session-current',
  overrides: {
    direction?: 'incoming' | 'outgoing'
    answer?: ReturnType<typeof vi.fn>
  } = {},
) => ({
  sessionId,
  sessionState: ref(state),
  currentDevice: ref(null),
  number: '2233',
  direction: overrides.direction,
  terminate: vi.fn(),
  answer: overrides.answer ?? vi.fn(),
})

const expectClassesToContainTone = (classes: string[], toneClass: string) => {
  toneClass.split(' ').forEach((className) => {
    expect(classes).toContain(className)
  })
}

describe('ContactCard', () => {
  beforeEach(() => {
    mocks.getPreferredSessionByPServedMock.mockReset()
    mocks.callNumberFromSelectedHandsetMock.mockReset()
    mocks.openSessionInPreferredHandsetMock.mockReset()
    mocks.openPinnedPanelSessionMock.mockReset()
    mocks.answerSelectedSessionMock.mockReset()
    mocks.getSlotsByPServedMock.mockReset()
    mocks.getSlotsByPServedMock.mockReturnValue([])
    mocks.assignSessionToFreeSlotMock.mockReset()
    mocks.setActiveSlotMock.mockReset()
    mocks.switchToCallMock.mockReset()
    mocks.showNotificationMock.mockReset()
    mocks.findLinesByInternalNumberMock.mockReset()
    mocks.findLinesByInternalNumberMock.mockReturnValue([])
    mocks.slotSessionIds.clear()
    Object.keys(mocks.contactStatuses).forEach((key) => {
      delete mocks.contactStatuses[key]
    })
    mocks.hasAvailableHandset.value = true
    mocks.readyPreferredGoose.value = { id: 'goose-1' }
  })

  it('renders contact number and name', () => {
    // Arrange
    const user = createContact()

    // Act
    const wrapper = mountCard(user)

    // Assert
    expect(wrapper.text()).toContain(user.internalNumber)
    expect(wrapper.text()).toContain(user.name)
  })

  it('uses offline presence tone when there is no local session and no BLF status', () => {
    // Arrange
    const user = createContact()

    // Act
    const wrapper = mountCard(user, { enablePresenceVisual: true })

    // Assert
    expect(wrapper.attributes('data-presence')).toBe('offline')
    expect(wrapper.attributes('data-self-status')).toBeUndefined()
    expect(wrapper.find('[data-test="contact-subscriber-icon"]').exists()).toBe(false)
    expectClassesToContainTone(wrapper.classes(), CONTACT_CARD_DISABLED_TONE.root)
  })

  it('uses base online tone when BLF reports registered', () => {
    // Arrange
    const user = createContact()
    mocks.contactStatuses[user.internalNumber] = { registered: true }

    // Act
    const wrapper = mountCard(user, { enablePresenceVisual: true })

    // Assert
    expect(wrapper.attributes('data-presence')).toBe('online')
    expect(wrapper.attributes('data-self-status')).toBeUndefined()
    expect(wrapper.find('[data-test="contact-subscriber-icon"]').exists()).toBe(false)
    expectClassesToContainTone(wrapper.classes(), CONTACT_CARD_BASE_TONE.root)
    expectClassesToContainTone(wrapper.find('[data-test="contact-primary-icon"]').classes(), CONTACT_CARD_BASE_TONE.primaryIcon.class)
    expectClassesToContainTone(wrapper.find('p').classes(), CONTACT_CARD_BASE_TONE.number)
  })

  it('keeps bright tone without BLF when presence visual is disabled (ПБВ)', () => {
    // Arrange
    const user = createContact()

    // Act
    const wrapper = mountCard(user)

    // Assert
    expectClassesToContainTone(wrapper.classes(), CONTACT_CARD_BASE_TONE.root)
  })
  it('uses call status tone for local session status', () => {
    // Arrange
    const user = createContact()
    mocks.getPreferredSessionByPServedMock.mockReturnValue(createSession(mocks.STATE.CONNECTED))

    // Act
    const wrapper = mountCard(user)

    // Assert
    expect(wrapper.attributes('data-self-status')).toBe(CONTACT_CARD_SELF_STATUSES.connectedSelf)
    expectClassesToContainTone(wrapper.classes(), CONTACT_CARD_SELF_TONES['connected-self'].root)
    expectClassesToContainTone(wrapper.find('[data-test="contact-primary-icon"]').classes(), CONTACT_CARD_SELF_TONES['connected-self'].primaryIcon.class)
    expect(wrapper.text()).toContain(user.internalNumber)
    expect(wrapper.text()).toContain(user.name)
  })

  it('starts call by contact click without presence subscription', async () => {
    // Arrange
    const user = createContact()

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(mocks.callNumberFromSelectedHandsetMock).toHaveBeenCalledWith({
      name: user.name,
      number: user.internalNumber,
    })
  })

  it('blocks new call when requireOnlineForCall and contact is offline', async () => {
    // Arrange
    const user = createContact()

    // Act
    const wrapper = mount(ContactCard, {
      props: {
        user,
        requireOnlineForCall: true,
      },
    })
    await wrapper.trigger('click')

    // Assert
    expect(wrapper.attributes('data-call-disabled')).toBe('true')
    expect(mocks.callNumberFromSelectedHandsetMock).not.toHaveBeenCalled()
  })

  it('allows new call when requireOnlineForCall and contact is online', async () => {
    // Arrange
    const user = createContact()
    mocks.contactStatuses[user.internalNumber] = { registered: true }

    // Act
    const wrapper = mount(ContactCard, {
      props: {
        user,
        requireOnlineForCall: true,
      },
    })
    await wrapper.trigger('click')

    // Assert
    expect(mocks.callNumberFromSelectedHandsetMock).toHaveBeenCalledWith({
      name: user.name,
      number: user.internalNumber,
    })
  })

  it('starts call by external contact click', async () => {
    // Arrange
    const user = createContact({ isExternal: true })

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(mocks.callNumberFromSelectedHandsetMock).toHaveBeenCalledWith({
      name: user.name,
      number: user.internalNumber,
    })
  })

  it('opens current contact session by repeated card click', async () => {
    // Arrange
    const user = createContact()
    const session = createSession(mocks.STATE.PROGRESS, 'session-progress')
    mocks.getPreferredSessionByPServedMock.mockReturnValue(session)

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(mocks.openSessionInPreferredHandsetMock).toHaveBeenCalledWith('session-progress')
    expect(session.terminate).not.toHaveBeenCalled()
    expect(mocks.callNumberFromSelectedHandsetMock).not.toHaveBeenCalled()
  })

  it('starts pinned panel contact call via goose', async () => {
    // Arrange
    const user = createContact()
    const gooseDevice = { id: 'goose-1' }
    mocks.readyPreferredGoose.value = gooseDevice
    mocks.getSlotsByPServedMock.mockReturnValue([{ order: 2, slotIndex: 0 }])

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(mocks.setActiveSlotMock).toHaveBeenCalledWith(2)
    expect(mocks.switchToCallMock).toHaveBeenCalledWith(
      user.internalNumber,
      gooseDevice,
      undefined,
      undefined,
      2,
    )
    expect(mocks.callNumberFromSelectedHandsetMock).not.toHaveBeenCalled()
  })

  it('opens pinned panel contact session via goose without handset', async () => {
    // Arrange
    const user = createContact()
    const gooseDevice = { id: 'goose-1' }
    const session = createSession(mocks.STATE.ONHOLD, 'session-pinned')
    mocks.readyPreferredGoose.value = gooseDevice
    mocks.getPreferredSessionByPServedMock.mockReturnValue(session)
    mocks.getSlotsByPServedMock.mockReturnValue([{ order: 3, slotIndex: 0 }])
    mocks.slotSessionIds.set(3, 'session-pinned')

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(mocks.setActiveSlotMock).toHaveBeenCalledWith(3)
    expect(mocks.openPinnedPanelSessionMock).toHaveBeenCalledWith('session-pinned')
    expect(mocks.switchToCallMock).toHaveBeenCalledWith(
      user.internalNumber,
      gooseDevice,
      undefined,
      'session-pinned',
    )
    expect(mocks.openSessionInPreferredHandsetMock).not.toHaveBeenCalled()
  })

  it('opens pinned panel session in call-card without goose', async () => {
    // Arrange
    const user = createContact()
    const session = createSession(mocks.STATE.ONHOLD, 'session-pinned')
    mocks.readyPreferredGoose.value = undefined
    mocks.getPreferredSessionByPServedMock.mockReturnValue(session)
    mocks.getSlotsByPServedMock.mockReturnValue([{ order: 3, slotIndex: 0 }])
    mocks.slotSessionIds.set(3, 'session-pinned')

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(mocks.openPinnedPanelSessionMock).toHaveBeenCalledWith('session-pinned')
    expect(mocks.switchToCallMock).not.toHaveBeenCalled()
    expect(mocks.showNotificationMock).not.toHaveBeenCalled()
  })

  it('does not fall back to handset when pinned contact has no ready goose', async () => {
    // Arrange
    const user = createContact()
    mocks.readyPreferredGoose.value = undefined
    mocks.getSlotsByPServedMock.mockReturnValue([{ order: 2, slotIndex: 0 }])

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert — clickable lockdown: toast, no handset fallback
    expect(wrapper.attributes('data-call-disabled')).not.toBe('true')
    expect(mocks.callNumberFromSelectedHandsetMock).not.toHaveBeenCalled()
    expect(mocks.switchToCallMock).not.toHaveBeenCalled()
    expect(mocks.showNotificationMock).toHaveBeenCalledWith({
      type: 'error',
      message: 'MediaDeviceUnavailableForCall',
    })
  })

  it('notifies when handset is unavailable for a new call', async () => {
    // Arrange
    const user = createContact()
    mocks.hasAvailableHandset.value = false

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(wrapper.attributes('data-call-disabled')).not.toBe('true')
    expect(mocks.callNumberFromSelectedHandsetMock).not.toHaveBeenCalled()
    expect(mocks.openSessionInPreferredHandsetMock).not.toHaveBeenCalled()
    expect(mocks.showNotificationMock).toHaveBeenCalledWith({
      type: 'error',
      message: 'MediaDeviceUnavailableForCall',
    })
  })

  it('answers incoming pinned session via goose and opens call-card', async () => {
    // Arrange
    const user = createContact()
    const gooseDevice = { id: 'goose-1', inputId: 'mic-1' }
    const answer = vi.fn()
    const session = createSession(mocks.STATE.RINGING, 'session-incoming-pinned', {
      direction: 'incoming',
      answer,
    })
    mocks.readyPreferredGoose.value = gooseDevice
    mocks.getPreferredSessionByPServedMock.mockReturnValue(session)
    mocks.getSlotsByPServedMock.mockReturnValue([{ order: 4, slotIndex: 0 }])
    mocks.slotSessionIds.set(4, 'session-incoming-pinned')

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(answer).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaConstraints: expect.objectContaining({
          audio: expect.objectContaining({ deviceId: { exact: 'mic-1' } }),
          video: false,
        }),
      }),
      gooseDevice,
    )
    expect(mocks.openPinnedPanelSessionMock).toHaveBeenCalledWith('session-incoming-pinned')
    expect(mocks.switchToCallMock).not.toHaveBeenCalled()
    expect(mocks.showNotificationMock).not.toHaveBeenCalled()
  })

  it('notifies when incoming pinned session has no ready goose', async () => {
    // Arrange
    const user = createContact()
    const answer = vi.fn()
    const session = createSession(mocks.STATE.RINGING, 'session-incoming-pinned', {
      direction: 'incoming',
      answer,
    })
    mocks.readyPreferredGoose.value = undefined
    mocks.getPreferredSessionByPServedMock.mockReturnValue(session)
    mocks.getSlotsByPServedMock.mockReturnValue([{ order: 4, slotIndex: 0 }])
    mocks.slotSessionIds.set(4, 'session-incoming-pinned')

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(answer).not.toHaveBeenCalled()
    expect(mocks.openPinnedPanelSessionMock).not.toHaveBeenCalled()
    expect(mocks.showNotificationMock).toHaveBeenCalledWith({
      type: 'error',
      message: 'MediaDeviceUnavailableForCall',
    })
  })

  it('answers incoming handset session via preferred handset', async () => {
    // Arrange
    const user = createContact()
    const answer = vi.fn()
    const session = createSession(mocks.STATE.RINGING, 'session-incoming', {
      direction: 'incoming',
      answer,
    })
    mocks.getPreferredSessionByPServedMock.mockReturnValue(session)

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(mocks.openSessionInPreferredHandsetMock).toHaveBeenCalledWith('session-incoming')
    expect(mocks.answerSelectedSessionMock).toHaveBeenCalled()
    expect(answer).not.toHaveBeenCalled()
    expect(mocks.showNotificationMock).not.toHaveBeenCalled()
  })

  it('notifies when incoming handset session has no available handset', async () => {
    // Arrange
    const user = createContact()
    const answer = vi.fn()
    const session = createSession(mocks.STATE.RINGING, 'session-incoming', {
      direction: 'incoming',
      answer,
    })
    mocks.hasAvailableHandset.value = false
    mocks.getPreferredSessionByPServedMock.mockReturnValue(session)

    // Act
    const wrapper = mountCard(user)
    await wrapper.trigger('click')

    // Assert
    expect(wrapper.attributes('data-call-disabled')).not.toBe('true')
    expect(mocks.openSessionInPreferredHandsetMock).not.toHaveBeenCalled()
    expect(mocks.answerSelectedSessionMock).not.toHaveBeenCalled()
    expect(mocks.showNotificationMock).toHaveBeenCalledWith({
      type: 'error',
      message: 'MediaDeviceUnavailableForCall',
    })
  })
})
