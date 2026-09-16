export const TURRET_SCHEMA_VERSION = '3.0.0'

export type TurretSessionStage =
  | 'DISCONNECTED'
  | 'CONNECTED_UNAUTH'
  | 'AUTHENTICATED'
  | 'CONTROLLER_ONLINE'
  | 'READY'

export type TurretAdminWsConnectionState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'closed'
  | 'error'

export type TurretWsMessageBase<TType extends string, TPayload extends Record<string, unknown>> = {
  schemaVersion: typeof TURRET_SCHEMA_VERSION
  messageId: string
  type: TType
  occurredAt: string
  payload: TPayload
}

export type SessionHelloPayload = {
  clientVersion?: string
  userAgent?: string
}

export type SessionUpgradePayload = {
  token: string
}

export type SessionStageChangedPayload = {
  stage: TurretSessionStage
  hardwareMac?: string
  hardwareSerial?: string
  subscriberId?: string
  subscriberLogin?: string
  capabilities?: Record<string, unknown>
}

export type SessionHeartbeatPayload = {
  occurredAt?: string
}

export type ControllerCommandLoggedPayload = {
  correlationId?: string
  wireModel: string
  wireName: string
  wirePayload: Record<string, unknown>
  direction?: 'console_to_hardware' | 'hardware_to_console'
}

export type DebugSnapshotPayload = {
  correlationId?: string
  snapshot: Record<string, unknown>
}

export type DiagnosticsKind = 'har' | 'snapshot' | 'archive'

export type DiagnosticsUploadReportedPayload = {
  correlationId: string
  uploadId: string
  kind: DiagnosticsKind
  byteSize: number
}

export type CollectDiagnosticsRequestedPayload = {
  correlationId: string
  kind: DiagnosticsKind
  periodMinutes?: number
  categories?: string[]
  includeBodyPreview?: boolean
}

export type TurretWsInboundMessage =
  | TurretWsMessageBase<'SessionHello', SessionHelloPayload>
  | TurretWsMessageBase<'SessionUpgrade', SessionUpgradePayload>
  | TurretWsMessageBase<'SessionStageChanged', SessionStageChangedPayload>
  | TurretWsMessageBase<'SessionHeartbeat', SessionHeartbeatPayload>
  | TurretWsMessageBase<'ControllerCommandLogged', ControllerCommandLoggedPayload>
  | TurretWsMessageBase<'DebugSnapshot', DebugSnapshotPayload>
  | TurretWsMessageBase<'DiagnosticsUploadReported', DiagnosticsUploadReportedPayload>

export type SessionAckPayload = {
  connectionId: string
  stage: TurretSessionStage
  serverTime: string
}

export type SessionUpgradeAckPayload = {
  subscriberId: string
  subscriberLogin: string
  stage: TurretSessionStage
}

export type SessionUpgradeRejectedPayload = {
  reason: 'INVALID_TOKEN'
}

export type SessionErrorPayload = {
  code: 'INVALID_MESSAGE' | 'UNSUPPORTED_MESSAGE' | 'HEARTBEAT_TIMEOUT'
  message: string
}

export type PongPayload = {
  serverTime: string
}

export type TurretWsOutboundMessage =
  | TurretWsMessageBase<'SessionAck', SessionAckPayload>
  | TurretWsMessageBase<'SessionUpgradeAck', SessionUpgradeAckPayload>
  | TurretWsMessageBase<'SessionUpgradeRejected', SessionUpgradeRejectedPayload>
  | TurretWsMessageBase<'SessionError', SessionErrorPayload>
  | TurretWsMessageBase<'Pong', PongPayload>
  | TurretWsMessageBase<'CollectDiagnosticsRequested', CollectDiagnosticsRequestedPayload>
