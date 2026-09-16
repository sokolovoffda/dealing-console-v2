import {
  onCollectDiagnosticsRequested,
  useTurretAdminWs,
  type CollectDiagnosticsRequestedPayload,
} from '@/shared/turret-admin-ws'
import { isElectron } from '@/shared/utils/electron-helpers'

import { uploadDiagnosticsArchive } from '../api'

import {
  buildDiagnosticsUploadDocument,
  createCollectSnapshotRequest,
  prepareSnapshotForUpload,
} from './collect-diagnostics-for-admin'
import { mergeDiagnosticSnapshots } from './merge-diagnostic-snapshots'
import { createRendererDiagnosticsSnapshot, trackRendererDiagnosticEvent } from './renderer-diagnostics'
import {
  diagnosticCategories,
  diagnosticLogLevels,
  type DiagnosticSnapshot,
  type DiagnosticSnapshotRequest,
} from './types'

let isCollectHandlerStarted = false

const fetchMainDiagnosticsSnapshot = async (
  request: DiagnosticSnapshotRequest,
): Promise<DiagnosticSnapshot | null> => {
  if (!isElectron() || typeof window.electronAPI?.getDiagnosticsSnapshot !== 'function') {
    return null
  }

  try {
    return await window.electronAPI.getDiagnosticsSnapshot(request) as DiagnosticSnapshot
  } catch (error) {
    console.warn('Failed to load Electron diagnostics snapshot', error)
    return null
  }
}

const collectMergedSnapshot = async (
  request: DiagnosticSnapshotRequest,
): Promise<DiagnosticSnapshot> => {
  const rendererSnapshot = await createRendererDiagnosticsSnapshot(request)
  const mainSnapshot = await fetchMainDiagnosticsSnapshot(request)

  if (!mainSnapshot) {
    return rendererSnapshot
  }

  return mergeDiagnosticSnapshots(rendererSnapshot, mainSnapshot)
}

const handleCollectDiagnosticsRequested = async (
  payload: CollectDiagnosticsRequestedPayload,
): Promise<void> => {
  const includeBodyPreview = payload.includeBodyPreview === true

  try {
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.SYSTEM,
      level: diagnosticLogLevels.INFO,
      source: 'diagnostics-admin-collect',
      message: 'CollectDiagnosticsRequested received',
      payload: {
        correlationId: payload.correlationId,
        kind: payload.kind,
        periodMinutes: payload.periodMinutes ?? null,
        includeBodyPreview,
      },
      tags: ['diagnostics-collect'],
    })

    const request = createCollectSnapshotRequest(payload)
    const snapshot = prepareSnapshotForUpload(
      await collectMergedSnapshot(request),
      includeBodyPreview,
    )
    const document = buildDiagnosticsUploadDocument(payload.kind, snapshot)
    const file = new Blob([JSON.stringify(document)], { type: 'application/json' })
    const { connectionId, sendDiagnosticsUploadReported } = useTurretAdminWs()

    const response = await uploadDiagnosticsArchive({
      correlationId: payload.correlationId,
      kind: payload.kind,
      file,
      filename: `${payload.kind}-${payload.correlationId}.json`,
      connectionId: connectionId.value ?? undefined,
      consoleType: 'dealing',
      metadata: {
        periodMinutes: payload.periodMinutes ?? null,
        categories: payload.categories ?? null,
        includeBodyPreview,
        collectedAt: snapshot.metadata.collectedAt,
      },
    })

    sendDiagnosticsUploadReported({
      correlationId: payload.correlationId,
      uploadId: response.data.upload.id,
      kind: payload.kind,
      byteSize: response.data.upload.byteSize,
    })
  } catch (error) {
    console.warn('Diagnostics collect/upload failed', error)
    trackRendererDiagnosticEvent({
      category: diagnosticCategories.SYSTEM,
      level: diagnosticLogLevels.WARN,
      source: 'diagnostics-admin-collect',
      message: 'Diagnostics collect/upload failed',
      payload: {
        correlationId: payload.correlationId,
        kind: payload.kind,
        error: error instanceof Error ? error.message : String(error),
      },
      tags: ['diagnostics-collect', 'diagnostics-upload-failed'],
    })
  }
}

export const startDiagnosticsAdminCollect = (): void => {
  if (isCollectHandlerStarted) {
    return
  }

  isCollectHandlerStarted = true
  onCollectDiagnosticsRequested((payload) => {
    void handleCollectDiagnosticsRequested(payload)
  })
}
