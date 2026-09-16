import { vi } from 'vitest'

type MockWebSocketMessage = {
  data: string
}

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readonly sentMessages: string[] = []
  readonly url: string
  onclose: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MockWebSocketMessage) => void) | null = null
  onopen: ((event: Event) => void) | null = null
  readyState = MockWebSocket.CONNECTING

  constructor (url: string) {
    this.url = url
    mockWebSocketInstances.push(this)
  }

  close () {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new Event('close'))
  }

  open () {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  receive (message: unknown) {
    const data = typeof message === 'string' ? message : JSON.stringify(message)
    this.onmessage?.({ data })
  }

  send (data: string) {
    this.sentMessages.push(data)
  }

  serverClose () {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new Event('close'))
  }
}

const mockWebSocketInstances: MockWebSocket[] = []

vi.mock('@/shared/url-helper', () => ({
  getAdditionalApiWebSocketURL: () => 'ws://localhost:5558/ws/turret',
}))

const loadTurretAdminWs = async () => {
  vi.resetModules()
  return await import('./useTurretAdminWs')
}

const parseSentMessage = (websocket: MockWebSocket, index: number) => {
  return JSON.parse(websocket.sentMessages[index]) as {
    type: string
    payload: Record<string, unknown>
  }
}

const createOutboundMessage = (type: string, payload: Record<string, unknown>) => ({
  schemaVersion: '3.0.0',
  messageId: crypto.randomUUID(),
  type,
  occurredAt: new Date().toISOString(),
  payload,
})

describe('useTurretAdminWs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockWebSocketInstances.length = 0
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('builds typed inbound messages', async () => {
    // Arrange
    const { buildTurretAdminWsMessage } = await loadTurretAdminWs()

    // Act
    const message = buildTurretAdminWsMessage('SessionHello', {
      clientVersion: '3.0.0-alpha.1',
    })

    // Assert
    expect(message.schemaVersion).toBe('3.0.0')
    expect(message.type).toBe('SessionHello')
    expect(message.payload).toEqual({ clientVersion: '3.0.0-alpha.1' })
    expect(message.messageId).toEqual(expect.any(String))
    expect(message.occurredAt).toEqual(expect.any(String))
  })

  it('sends hello, upgrade and authenticated stage', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()

    // Act
    turretAdminWs.connect({ clientVersion: '3.0.0-alpha.1', userAgent: 'test-agent' })
    const websocket = mockWebSocketInstances[0]
    websocket.open()
    turretAdminWs.sendSessionUpgrade('access-token')
    websocket.receive(createOutboundMessage('SessionUpgradeAck', {
      subscriberId: 'user-id',
      subscriberLogin: '44946',
      stage: 'AUTHENTICATED',
    }))

    // Assert
    expect(parseSentMessage(websocket, 0)).toMatchObject({
      type: 'SessionHello',
      payload: {
        clientVersion: '3.0.0-alpha.1',
        userAgent: 'test-agent',
      },
    })
    expect(parseSentMessage(websocket, 1)).toMatchObject({
      type: 'SessionUpgrade',
      payload: { token: 'access-token' },
    })
    expect(parseSentMessage(websocket, 2)).toMatchObject({
      type: 'SessionStageChanged',
      payload: {
        stage: 'AUTHENTICATED',
        subscriberId: 'user-id',
        subscriberLogin: '44946',
      },
    })
  })

  it('sends heartbeat every 30 seconds', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect()
    const websocket = mockWebSocketInstances[0]
    websocket.open()

    // Act
    vi.advanceTimersByTime(30_000)

    // Assert
    expect(parseSentMessage(websocket, 1)).toMatchObject({
      type: 'SessionHeartbeat',
    })
  })

  it('reconnects and resends ready stage after server ack', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect({ clientVersion: '3.0.0-alpha.1' })

    const firstWebsocket = mockWebSocketInstances[0]
    firstWebsocket.open()
    turretAdminWs.sendSessionUpgrade('access-token')
    firstWebsocket.receive(createOutboundMessage('SessionUpgradeAck', {
      subscriberId: 'user-id',
      subscriberLogin: '44946',
      stage: 'AUTHENTICATED',
    }))
    turretAdminWs.updateControllerIdentity({
      hardwareMac: '48:DA:35:00:01:2E',
      hardwareSerial: 'c15d3333303038174e393733',
    })

    // Act
    firstWebsocket.serverClose()
    vi.advanceTimersByTime(1_000)
    const secondWebsocket = mockWebSocketInstances[1]
    secondWebsocket.open()
    secondWebsocket.receive(createOutboundMessage('SessionAck', {
      connectionId: 'connection-id',
      stage: 'CONNECTED_UNAUTH',
      serverTime: new Date().toISOString(),
    }))

    // Assert
    expect(parseSentMessage(secondWebsocket, 0)).toMatchObject({
      type: 'SessionHello',
    })
    expect(parseSentMessage(secondWebsocket, 1)).toMatchObject({
      type: 'SessionUpgrade',
      payload: { token: 'access-token' },
    })
    expect(parseSentMessage(secondWebsocket, 2)).toMatchObject({
      type: 'SessionStageChanged',
      payload: {
        stage: 'READY',
        subscriberId: 'user-id',
        subscriberLogin: '44946',
        hardwareMac: '48:DA:35:00:01:2E',
        hardwareSerial: 'c15d3333303038174e393733',
      },
    })
  })

  it('keeps CONTROLLER_ONLINE until both hardware identifiers are known', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect()
    const websocket = mockWebSocketInstances[0]
    websocket.open()
    turretAdminWs.sendSessionUpgrade('access-token')
    websocket.receive(createOutboundMessage('SessionUpgradeAck', {
      subscriberId: 'user-id',
      subscriberLogin: '44946',
      stage: 'AUTHENTICATED',
    }))

    // Act
    turretAdminWs.updateControllerIdentity({ hardwareMac: '48:DA:35:00:01:2E' })

    // Assert
    expect(parseSentMessage(websocket, 3)).toMatchObject({
      type: 'SessionStageChanged',
      payload: { stage: 'CONTROLLER_ONLINE' },
    })

    // Act
    turretAdminWs.updateControllerIdentity({ hardwareSerial: '0102240000000001' })

    // Assert
    expect(parseSentMessage(websocket, 4)).toMatchObject({
      type: 'SessionStageChanged',
      payload: {
        stage: 'READY',
        hardwareMac: '48:DA:35:00:01:2E',
        hardwareSerial: '0102240000000001',
      },
    })
  })

  it('sends CONNECTED_UNAUTH on logout and keeps the socket open', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect()
    const websocket = mockWebSocketInstances[0]
    websocket.open()
    turretAdminWs.sendSessionUpgrade('access-token')
    websocket.receive(createOutboundMessage('SessionUpgradeAck', {
      subscriberId: 'user-id',
      subscriberLogin: '44946',
      stage: 'AUTHENTICATED',
    }))

    // Act
    turretAdminWs.clearSessionUpgradeToken()

    // Assert
    expect(parseSentMessage(websocket, 3)).toMatchObject({
      type: 'SessionStageChanged',
      payload: { stage: 'CONNECTED_UNAUTH' },
    })
    expect(websocket.readyState).toBe(MockWebSocket.OPEN)
  })

  it('downgrades to AUTHENTICATED when controller goes offline', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect()
    const websocket = mockWebSocketInstances[0]
    websocket.open()
    turretAdminWs.sendSessionUpgrade('access-token')
    websocket.receive(createOutboundMessage('SessionUpgradeAck', {
      subscriberId: 'user-id',
      subscriberLogin: '44946',
      stage: 'AUTHENTICATED',
    }))
    turretAdminWs.updateControllerIdentity({
      hardwareMac: '48:DA:35:00:01:2E',
      hardwareSerial: '0102240000000001',
    })

    // Act
    turretAdminWs.sendControllerOfflineStage()

    // Assert
    expect(parseSentMessage(websocket, 4)).toMatchObject({
      type: 'SessionStageChanged',
      payload: { stage: 'AUTHENTICATED' },
    })
  })

  it('sends ControllerCommandLogged when the socket is open', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect()
    const websocket = mockWebSocketInstances[0]
    websocket.open()
    const payload = {
      wireModel: 'command',
      wireName: 'brightness',
      wirePayload: { attrs: { value: 50 } },
      direction: 'console_to_hardware' as const,
    }

    // Act
    const isSent = turretAdminWs.sendControllerCommandLogged(payload)

    // Assert
    expect(isSent).toBe(true)
    expect(parseSentMessage(websocket, 1)).toMatchObject({
      type: 'ControllerCommandLogged',
      payload,
    })
  })

  it('does not send ControllerCommandLogged when the socket is closed', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()

    // Act
    const isSent = turretAdminWs.sendControllerCommandLogged({
      wireModel: 'command',
      wireName: 'brightness',
      wirePayload: { attrs: { value: 50 } },
    })

    // Assert
    expect(isSent).toBe(false)
    expect(mockWebSocketInstances).toHaveLength(0)
  })

  it('notifies CollectDiagnosticsRequested subscribers and unsubscribes', async () => {
    // Arrange
    const { onCollectDiagnosticsRequested, useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect()
    const websocket = mockWebSocketInstances[0]
    websocket.open()
    const handler = vi.fn()
    const unsubscribe = onCollectDiagnosticsRequested(handler)
    const payload = {
      correlationId: 'e45cc984-5898-4a24-a04e-11c2c56dee9d',
      kind: 'har',
      periodMinutes: 30,
      includeBodyPreview: false,
    }

    // Act
    websocket.receive(createOutboundMessage('CollectDiagnosticsRequested', payload))
    unsubscribe()
    websocket.receive(createOutboundMessage('CollectDiagnosticsRequested', payload))

    // Assert
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('sends DiagnosticsUploadReported when the socket is open', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()
    turretAdminWs.connect()
    const websocket = mockWebSocketInstances[0]
    websocket.open()
    const payload = {
      correlationId: 'e45cc984-5898-4a24-a04e-11c2c56dee9d',
      uploadId: '2b29858c-2fde-4082-b83e-5061f02d07a5',
      kind: 'har' as const,
      byteSize: 128,
    }

    // Act
    const isSent = turretAdminWs.sendDiagnosticsUploadReported(payload)

    // Assert
    expect(isSent).toBe(true)
    expect(parseSentMessage(websocket, 1)).toMatchObject({
      type: 'DiagnosticsUploadReported',
      payload,
    })
  })

  it('does not send DiagnosticsUploadReported when the socket is closed', async () => {
    // Arrange
    const { useTurretAdminWs } = await loadTurretAdminWs()
    const turretAdminWs = useTurretAdminWs()

    // Act
    const isSent = turretAdminWs.sendDiagnosticsUploadReported({
      correlationId: 'e45cc984-5898-4a24-a04e-11c2c56dee9d',
      uploadId: '2b29858c-2fde-4082-b83e-5061f02d07a5',
      kind: 'har',
      byteSize: 128,
    })

    // Assert
    expect(isSent).toBe(false)
    expect(mockWebSocketInstances).toHaveLength(0)
  })
})
