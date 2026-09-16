import { mount, VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'

import type { RTCSessionFacade } from '@/entities/call-session'

import Component from '../ui/MutePinnedCall.vue'

const mockedState = vi.hoisted(() => ({
  togglePinnedCallMicState: vi.fn(),
  isPinnedCallManagedByPinnedDevice: vi.fn(),
  isPinnedCallMicDisplayedEnabled: vi.fn(),
}))

vi.mock('@/entities/call-session', () => {
  return {
    useSessionStore: () => ({
      sessions: ref(new Map()),
      getSessionByPServed: vi.fn(),
    }),
    usePinnedCallsStore: vi.fn().mockReturnValue({
      activePinnedCall: null,
      changeVolume: vi.fn(),
      togglePinnedCallMicState: mockedState.togglePinnedCallMicState,
      isPinnedCallManagedByPinnedDevice: mockedState.isPinnedCallManagedByPinnedDevice,
      isPinnedCallMicDisplayedEnabled: mockedState.isPinnedCallMicDisplayedEnabled,
    }),
  }
})

const muteSelector = '[data-test="mute-btn"]'

const createPinnedCall = (overrides = {}) => ({
  micState: false,
  prevMicState: true,
  order: 1,
  volume: 1,
  title: 'title',
  prevVolume: 0.5,
  pServed: 'pServed',
  ...overrides,
})

const createSession = (isMuted: boolean, toggleMute = vi.fn()) => ({
  isMuted: ref(isMuted),
  toggleMute,
}) as unknown as RTCSessionFacade

describe('MutePinnedCall.vue', () => {
  let wrapper: VueWrapper<typeof Component>

  const createComponent = (props = {}) => {
    wrapper = mount(Component, {
      props: {
        session: undefined,
        pinnedCall: createPinnedCall(),
        ...props,
      },
    }) as unknown as VueWrapper<typeof Component>
  }

  beforeEach(() => {
    mockedState.togglePinnedCallMicState.mockClear()
    mockedState.isPinnedCallManagedByPinnedDevice.mockReset()
    mockedState.isPinnedCallManagedByPinnedDevice.mockReturnValue(true)
    mockedState.isPinnedCallMicDisplayedEnabled.mockReset()
    mockedState.isPinnedCallMicDisplayedEnabled.mockImplementation((pinnedCall) => pinnedCall.micState)
  })

  describe('isMuted computed', () => {
    it('should return true when pinned slot micState is false', () => {
      // Arrange & Act
      createComponent({
        pinnedCall: createPinnedCall({ micState: false }),
      })

      // Assert
      expect(wrapper.vm.isMuted).toBe(true)
    })

    it('should return false when pinned slot micState is true', () => {
      // Arrange & Act
      createComponent({
        pinnedCall: createPinnedCall({ micState: true }),
      })

      // Assert
      expect(wrapper.vm.isMuted).toBe(false)
    })

    it('should use displayed effective state in activePinned mode', () => {
      // Arrange
      mockedState.isPinnedCallMicDisplayedEnabled.mockReturnValue(false)

      // Act
      createComponent({
        pinnedCall: createPinnedCall({ micState: true }),
      })

      // Assert
      expect(wrapper.vm.isMuted).toBe(true)
    })
  })

  describe('iconName computed', () => {
    it('should return "gooseneclMicOff" when pinned slot is muted', () => {
      // Arrange & Act
      createComponent({
        pinnedCall: createPinnedCall({ micState: false }),
      })

      // Assert
      expect(wrapper.vm.iconName).toBe('gooseneclMicOff')
    })

    it('should return "micSpeaker" when pinned slot is unmuted', () => {
      // Arrange & Act
      createComponent({
        pinnedCall: createPinnedCall({ micState: true }),
      })

      // Assert
      expect(wrapper.vm.iconName).toBe('micSpeaker')
    })
  })

  describe('iconColor computed', () => {
    it('should return dark text classes when session is undefined', () => {
      // Arrange & Act
      createComponent({
        session: undefined,
        pinnedCall: createPinnedCall(),
      })

      // Assert
      expect(wrapper.vm.iconColor).toBe('hover:!text-black-800 !text-black-600')
    })

    it('should return light text classes when session is defined', () => {
      // Arrange & Act
      createComponent({
        session: createSession(false),
        pinnedCall: createPinnedCall(),
      })

      // Assert
      expect(wrapper.vm.iconColor).toBe('hover:!text-black-800 text-white')
    })
  })

  describe('onToggleMute', () => {
    it('should call onToggleMute when mute button is clicked', async () => {
      // Arrange
      createComponent()
      const spy = vi.spyOn(wrapper.vm, 'onToggleMute')

      // Act
      await wrapper.find(muteSelector).trigger('click')

      // Assert
      expect(spy).toHaveBeenCalled()
      expect(mockedState.togglePinnedCallMicState).toHaveBeenCalledWith({
        order: 1,
        action: 'toggle',
      })
    })

    it('should update line micState when session uses pinned device', async () => {
      // Arrange
      const toggleMute = vi.fn()
      createComponent({
        session: createSession(true, toggleMute),
        pinnedCall: createPinnedCall({ micState: true }),
      })

      // Act
      await wrapper.find(muteSelector).trigger('click')

      // Assert
      expect(mockedState.togglePinnedCallMicState).toHaveBeenCalledWith({
        order: 1,
        action: 'toggle',
      })
      expect(toggleMute).not.toHaveBeenCalled()
    })

    it('should toggle session directly when it uses another device', async () => {
      // Arrange
      const toggleMute = vi.fn()
      mockedState.isPinnedCallManagedByPinnedDevice.mockReturnValue(false)
      createComponent({
        session: createSession(false, toggleMute),
      })

      // Act
      await wrapper.find(muteSelector).trigger('click')

      // Assert
      expect(toggleMute).toHaveBeenCalledTimes(1)
      expect(mockedState.togglePinnedCallMicState).not.toHaveBeenCalled()
    })
  })
})
