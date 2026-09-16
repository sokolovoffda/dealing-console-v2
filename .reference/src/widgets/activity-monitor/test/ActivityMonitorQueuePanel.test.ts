import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'

import { STATE, type RTCSessionFacade } from '@/entities/call-session'

import ActivityMonitorQueuePanel from '../ui/ActivityMonitorQueuePanel.vue'

const mocks = vi.hoisted(() => ({
  queueSessions: { value: [] as RTCSessionFacade[] },
  openSessionInPreferredHandsetMock: vi.fn(),
  openPinnedPanelSessionMock: vi.fn(),
  isPinnedPanelSessionIdMock: vi.fn<(sessionId: string) => boolean>(() => false),
}))

vi.mock('../model/use-activity-monitor-queue-sessions', () => ({
  useActivityMonitorQueueSessions: () => ({
    queueSessions: computed(() => mocks.queueSessions.value),
    isQueueEmpty: computed(() => mocks.queueSessions.value.length === 0),
  }),
}))

vi.mock('@/features/call-card', () => ({
  useCallCardStore: () => ({
    openSessionInPreferredHandset: mocks.openSessionInPreferredHandsetMock,
    openPinnedPanelSession: mocks.openPinnedPanelSessionMock,
  }),
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    isPinnedPanelSessionId: mocks.isPinnedPanelSessionIdMock,
  }),
}))

const QueueCardStub = defineComponent({
  name: 'ActivityMonitorQueueCard',
  props: {
    session: {
      type: Object,
      required: true,
    },
  },
  emits: ['select'],
  setup(props, { emit }) {
    return () => h('button', {
      'data-test': 'activity-monitor-queue-card',
      'data-session-id': (props.session as RTCSessionFacade).sessionId,
      onClick: () => emit('select'),
    })
  },
})

const createSession = (sessionId: string): RTCSessionFacade => {
  return {
    sessionId,
    sessionState: ref(STATE.CONNECTED),
  } as unknown as RTCSessionFacade
}

const mountPanel = () => {
  return mount(ActivityMonitorQueuePanel, {
    global: {
      stubs: {
        ActivityMonitorQueueCard: QueueCardStub,
        WidgetHeader: true,
        WuiIcon: true,
      },
    },
  })
}

describe('ActivityMonitorQueuePanel', () => {
  beforeEach(() => {
    mocks.queueSessions.value = []
    mocks.openSessionInPreferredHandsetMock.mockReset()
    mocks.openPinnedPanelSessionMock.mockReset()
    mocks.isPinnedPanelSessionIdMock.mockReset()
    mocks.isPinnedPanelSessionIdMock.mockReturnValue(false)
  })

  it('should render non-interactive empty state when queue is empty', () => {
    // Arrange / Act
    const wrapper = mountPanel()

    // Assert
    const empty = wrapper.find('[data-test="activity-monitor-queue-empty-state"]')
    expect(empty.exists()).toBe(true)
    expect(empty.element.tagName.toLowerCase()).toBe('div')
    expect(wrapper.text()).toContain('Очередь пуста')
    expect(wrapper.find('[data-test="activity-monitor-queue-strip"]').exists()).toBe(false)
  })

  it('should render strip cards for queue sessions', () => {
    // Arrange
    mocks.queueSessions.value = [
      createSession('handset-1'),
      createSession('pinned-1'),
    ]

    // Act
    const wrapper = mountPanel()

    // Assert
    expect(wrapper.find('[data-test="activity-monitor-queue-empty-state"]').exists()).toBe(false)
    const cards = wrapper.findAll('[data-test="activity-monitor-queue-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].attributes('data-session-id')).toBe('handset-1')
    expect(cards[1].attributes('data-session-id')).toBe('pinned-1')
  })

  it('should open handset session via call-card store on card select', async () => {
    // Arrange
    mocks.queueSessions.value = [createSession('handset-1')]
    mocks.isPinnedPanelSessionIdMock.mockReturnValue(false)
    const wrapper = mountPanel()

    // Act
    await wrapper.find('[data-test="activity-monitor-queue-card"]').trigger('click')

    // Assert
    expect(mocks.openSessionInPreferredHandsetMock).toHaveBeenCalledWith('handset-1')
    expect(mocks.openPinnedPanelSessionMock).not.toHaveBeenCalled()
  })

  it('should open pinned session via call-card store on card select', async () => {
    // Arrange
    mocks.queueSessions.value = [createSession('pinned-1')]
    mocks.isPinnedPanelSessionIdMock.mockImplementation((sessionId: string) => {
      return sessionId === 'pinned-1'
    })
    const wrapper = mountPanel()

    // Act
    await wrapper.find('[data-test="activity-monitor-queue-card"]').trigger('click')

    // Assert
    expect(mocks.openPinnedPanelSessionMock).toHaveBeenCalledWith('pinned-1')
    expect(mocks.openSessionInPreferredHandsetMock).not.toHaveBeenCalled()
  })
})
