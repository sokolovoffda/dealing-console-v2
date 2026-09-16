import {
  diagnosticCategories,
  diagnosticLogLevels,
  type DiagnosticLogRecord,
} from '../model'

import { normalizeDiagnosticValue } from './normalize-diagnostic-value'

export type DiagnosticWebRtcSessionInput = {
  sessionId: string,
  callId?: string,
  pServed?: string,
  connection?: RTCPeerConnection | null,
}

let webrtcStatsSequence = 0

const createRecordId = () => {
  webrtcStatsSequence += 1
  return `webrtc-stats-${Date.now()}-${webrtcStatsSequence}`
}

export const collectWebRtcStatsRecords = async (
  sessions: DiagnosticWebRtcSessionInput[],
): Promise<DiagnosticLogRecord[]> => {
  const records = await Promise.all(sessions.map(async (session) => {
    const connection = session.connection

    if (!connection || typeof connection.getStats !== 'function') {
      return {
        id: createRecordId(),
        timestamp: new Date().toISOString(),
        category: diagnosticCategories.WEB_RTC,
        level: diagnosticLogLevels.INFO,
        source: 'webrtc-stats',
        message: 'WebRTC stats are unavailable for session',
        payload: normalizeDiagnosticValue({
          sessionId: session.sessionId,
          callId: session.callId ?? null,
          pServed: session.pServed ?? null,
        }),
        tags: ['webrtc-stats', 'unavailable'],
      } satisfies DiagnosticLogRecord
    }

    try {
      const report = await connection.getStats()
      const reportTypeCounters: Record<string, number> = {}

      report.forEach((stats) => {
        reportTypeCounters[stats.type] = (reportTypeCounters[stats.type] ?? 0) + 1
      })

      return {
        id: createRecordId(),
        timestamp: new Date().toISOString(),
        category: diagnosticCategories.WEB_RTC,
        level: diagnosticLogLevels.INFO,
        source: 'webrtc-stats',
        message: 'Collected WebRTC stats snapshot for session',
        payload: normalizeDiagnosticValue({
          sessionId: session.sessionId,
          callId: session.callId ?? null,
          pServed: session.pServed ?? null,
          connectionState: connection.connectionState,
          iceConnectionState: connection.iceConnectionState,
          iceGatheringState: connection.iceGatheringState,
          signalingState: connection.signalingState,
          reportCount: report.size,
          reportTypes: reportTypeCounters,
        }),
        tags: ['webrtc-stats', 'snapshot'],
      } satisfies DiagnosticLogRecord
    } catch (error) {
      return {
        id: createRecordId(),
        timestamp: new Date().toISOString(),
        category: diagnosticCategories.WEB_RTC,
        level: diagnosticLogLevels.ERROR,
        source: 'webrtc-stats',
        message: 'Failed to collect WebRTC stats for session',
        payload: normalizeDiagnosticValue({
          sessionId: session.sessionId,
          callId: session.callId ?? null,
          pServed: session.pServed ?? null,
          error,
        }),
        tags: ['webrtc-stats', 'error'],
      } satisfies DiagnosticLogRecord
    }
  }))

  return records
}
