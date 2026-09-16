import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { computed, ref } from 'vue'

import { STATE, type RTCSessionFacade } from '@/entities/call-session'

import ActivityMonitorQueueCard from '../ui/ActivityMonitorQueueCard.vue'

vi.mock('../model/use-activity-monitor-queue-card', () => ({
  useActivityMonitorQueueCard: () => ({
    displayName: computed(() => 'Фейд-Раута Харконнен'),
    displayNumber: computed(() => '44947'),
    duration: computed(() => '00:00:30'),
    tone: computed(() => ({
      root: 'bg-card-state-bg-callcon-def',
      iconName: 'phoneCallF',
      iconClass: 'text-card-state-avt-def',
      name: 'text-card-state-name-def',
      number: 'text-card-state-num-def',
      duration: 'text-card-state-name-def',
    })),
    deviceSide: computed(() => 'L'),
    deviceKind: computed(() => 'handset'),
    isPinnedSession: computed(() => false),
  }),
}))

const createSession = (): RTCSessionFacade => {
  return {
    sessionId: 'session-1',
    sessionState: ref(STATE.CONNECTED),
  } as unknown as RTCSessionFacade
}

describe('ActivityMonitorQueueCard', () => {
  it('should render name, number, duration and icon', () => {
    // Arrange / Act
    const wrapper = mount(ActivityMonitorQueueCard, {
      props: {
        session: createSession(),
      },
      global: {
        stubs: {
          WuiIcon: {
            template: '<span data-test="activity-monitor-queue-card-icon" />',
          },
        },
      },
    })

    // Assert
    expect(wrapper.find('[data-test="activity-monitor-queue-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="activity-monitor-queue-card-name"]').text())
      .toBe('Фейд-Раута Харконнен')
    expect(wrapper.find('[data-test="activity-monitor-queue-card-number"]').text())
      .toBe('44947')
    expect(wrapper.find('[data-test="activity-monitor-queue-card-duration"]').text())
      .toBe('00:00:30')
    expect(wrapper.find('[data-test="activity-monitor-queue-card-icon"]').exists()).toBe(true)
  })

  it('should emit select on click and enter', async () => {
    // Arrange
    const wrapper = mount(ActivityMonitorQueueCard, {
      props: {
        session: createSession(),
      },
      global: {
        stubs: {
          WuiIcon: true,
        },
      },
    })

    // Act
    await wrapper.find('[data-test="activity-monitor-queue-card"]').trigger('click')
    await wrapper.find('[data-test="activity-monitor-queue-card"]').trigger('keydown.enter')

    // Assert
    expect(wrapper.emitted('select')).toHaveLength(2)
  })
})
