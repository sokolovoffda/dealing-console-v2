import { vi } from 'vitest'
import { ref } from 'vue'

import { STATE, type RTCSessionFacade } from '@/entities/call-session'

import { LogicalMediaDeviceTypeEnum } from '@/shared/composables'

import { getActivityMonitorQueueCardTone } from '../model/activity-monitor-queue-card-tone'

const mocks = vi.hoisted(() => ({
  isPinnedPanelSessionIdMock: vi.fn(() => false),
}))

vi.mock('@/entities/pinned-calls', () => ({
  usePinnedCallsPanelStore: () => ({
    isPinnedPanelSessionId: mocks.isPinnedPanelSessionIdMock,
  }),
}))

type DeviceOptions = {
  side?: 'L' | 'R'
  kind?: 'handset' | 'goose'
}

const createDevice = (options: DeviceOptions = {}) => {
  const side = options.side ?? 'L'
  const kind = options.kind ?? 'handset'
  const type = kind === 'goose'
    ? LogicalMediaDeviceTypeEnum.GOOSE
    : LogicalMediaDeviceTypeEnum.HANDSET
  const id = `${kind}_${side}1`

  return {
    id,
    module: id,
    type,
  }
}

const createSession = (options: {
  sessionId?: string
  state: STATE
  direction?: 'incoming' | 'outgoing'
  localHold?: boolean
  isConfOnHold?: boolean
  device?: DeviceOptions | null
}): RTCSessionFacade => {
  const device = options.device === null
    ? null
    : createDevice(options.device)

  return {
    sessionId: options.sessionId ?? 'session-1',
    sessionState: ref(options.state),
    direction: options.direction ?? 'outgoing',
    isConfOnHold: ref(Boolean(options.isConfOnHold)),
    currentDevice: ref(device),
    session: {
      isOnHold: () => ({ local: Boolean(options.localHold) }),
    },
  } as unknown as RTCSessionFacade
}

describe('getActivityMonitorQueueCardTone', () => {
  beforeEach(() => {
    mocks.isPinnedPanelSessionIdMock.mockReset()
    mocks.isPinnedPanelSessionIdMock.mockReturnValue(false)
  })

  it('should use callcon root and phoneCallF for connected handset on left side', () => {
    // Arrange
    const session = createSession({
      state: STATE.CONNECTED,
      device: { side: 'L', kind: 'handset' },
    })

    // Act
    const tone = getActivityMonitorQueueCardTone(session)

    // Assert
    expect(tone.root).toContain('bg-card-state-bg-callcon-def')
    expect(tone.iconName).toBe('phoneCallF')
    expect(tone.iconClass).toBe('text-card-state-avt-def')
  })

  it('should mirror connected handset icon for right side', () => {
    // Arrange
    const session = createSession({
      state: STATE.CONNECTED,
      device: { side: 'R', kind: 'handset' },
    })

    // Act
    const tone = getActivityMonitorQueueCardTone(session)

    // Assert
    expect(tone.iconName).toBe('phoneCallInvF')
  })

  it('should use micLeftF for connected pinned session', () => {
    // Arrange
    mocks.isPinnedPanelSessionIdMock.mockReturnValue(true)
    const session = createSession({
      state: STATE.CONNECTED,
      device: { side: 'L', kind: 'handset' },
    })

    // Act
    const tone = getActivityMonitorQueueCardTone(session)

    // Assert
    expect(tone.iconName).toBe('micLeftF')
    expect(tone.root).toContain('bg-card-state-bg-callcon-def')
  })

  it('should use micRightF for connected goose on right side', () => {
    // Arrange
    const session = createSession({
      state: STATE.CONNECTED,
      device: { side: 'R', kind: 'goose' },
    })

    // Act
    const tone = getActivityMonitorQueueCardTone(session)

    // Assert
    expect(tone.iconName).toBe('micRightF')
  })

  it('should use phone pause icons and waitcon class for handset hold', () => {
    // Arrange
    const localHold = createSession({
      state: STATE.ONHOLD,
      localHold: true,
      device: { side: 'L', kind: 'handset' },
    })
    const remoteHold = createSession({
      state: STATE.ONHOLD,
      localHold: false,
      device: { side: 'L', kind: 'handset' },
    })

    // Act
    const localTone = getActivityMonitorQueueCardTone(localHold)
    const remoteTone = getActivityMonitorQueueCardTone(remoteHold)

    // Assert
    expect(localTone.root).toBe('bg-card-am-queue-bg-def border border-card-am-queue-brd-def')
    expect(localTone.iconName).toBe('phonePauseF')
    expect(localTone.iconClass).toBe('text-card-neutcon-avt-waitcon-def')
    expect(remoteTone.iconName).toBe('phonePauseM')
  })

  it('should use mic pause icons for pinned hold', () => {
    // Arrange
    mocks.isPinnedPanelSessionIdMock.mockReturnValue(true)
    const localHold = createSession({
      state: STATE.ONHOLD,
      localHold: true,
      device: { side: 'L' },
    })
    const remoteHold = createSession({
      state: STATE.ONHOLD,
      localHold: false,
      device: { side: 'L' },
    })

    // Act
    const localTone = getActivityMonitorQueueCardTone(localHold)
    const remoteTone = getActivityMonitorQueueCardTone(remoteHold)

    // Assert
    expect(localTone.iconName).toBe('micPauseLeftF')
    expect(remoteTone.iconName).toBe('micPauseLeftM')
  })

  it('should use warncon arrow for ringing incoming and waitcon arrow for outgoing progress', () => {
    // Arrange
    const incoming = createSession({
      state: STATE.RINGING,
      direction: 'incoming',
      device: { side: 'L' },
    })
    const outgoing = createSession({
      state: STATE.PROGRESS,
      direction: 'outgoing',
      device: { side: 'L' },
    })

    // Act
    const incomingTone = getActivityMonitorQueueCardTone(incoming)
    const outgoingTone = getActivityMonitorQueueCardTone(outgoing)

    // Assert
    expect(incomingTone.root).toBe('bg-card-am-queue-bg-def border border-card-am-queue-brd-def')
    expect(incomingTone.iconName).toBe('arrowSouthWestM')
    expect(incomingTone.iconClass).toBe('text-pinnedline-btn-warncon-icon-def')
    expect(outgoingTone.iconName).toBe('arrowNorthEastM')
    expect(outgoingTone.iconClass).toBe('text-pinnedline-btn-waitcon-icon-def')
  })

  it('should mirror ringing and progress arrows for right side', () => {
    // Arrange
    const incoming = createSession({
      state: STATE.RINGING,
      direction: 'incoming',
      device: { side: 'R' },
    })
    const outgoing = createSession({
      state: STATE.PROGRESS,
      direction: 'outgoing',
      device: { side: 'R' },
    })

    // Act
    const incomingTone = getActivityMonitorQueueCardTone(incoming)
    const outgoingTone = getActivityMonitorQueueCardTone(outgoing)

    // Assert
    expect(incomingTone.iconName).toBe('arrowSouthEastM')
    expect(outgoingTone.iconName).toBe('arrowNorthWestM')
  })

  it('should use micLeftF for pinned ringing session', () => {
    // Arrange
    mocks.isPinnedPanelSessionIdMock.mockReturnValue(true)
    const session = createSession({
      state: STATE.RINGING,
      direction: 'incoming',
      device: { side: 'L' },
    })

    // Act
    const tone = getActivityMonitorQueueCardTone(session)

    // Assert
    expect(tone.iconName).toBe('micLeftF')
    expect(tone.iconClass).toBe('text-pinnedline-btn-warncon-icon-def')
  })
})
