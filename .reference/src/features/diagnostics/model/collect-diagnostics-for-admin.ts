import type { CollectDiagnosticsRequestedPayload, DiagnosticsKind } from '@/shared/turret-admin-ws'

import {
  diagnosticCategories,
  diagnosticPeriodPresets,
  type DiagnosticCategory,
  type DiagnosticHarArtifact,
  type DiagnosticSnapshot,
  type DiagnosticSnapshotRequest,
} from './types'

const DEFAULT_PERIOD_MINUTES = 60
const COLLECT_RECORD_LIMIT = 500

const diagnosticCategoryValues = new Set<string>(Object.values(diagnosticCategories))

const isDiagnosticCategory = (value: string): value is DiagnosticCategory => {
  return diagnosticCategoryValues.has(value)
}

export const createCollectSnapshotRequest = (
  payload: CollectDiagnosticsRequestedPayload,
): DiagnosticSnapshotRequest => {
  const to = new Date()
  const periodMinutes = payload.periodMinutes && payload.periodMinutes > 0
    ? payload.periodMinutes
    : DEFAULT_PERIOD_MINUTES
  const from = new Date(to.getTime() - periodMinutes * 60 * 1000)
  const categories = payload.categories?.filter(isDiagnosticCategory)

  return {
    filter: {
      ...(categories?.length ? { categories } : {}),
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        preset: diagnosticPeriodPresets.CUSTOM,
      },
      limit: COLLECT_RECORD_LIMIT,
    },
  }
}

export const stripHarBodyPreview = (artifact: DiagnosticHarArtifact): DiagnosticHarArtifact => {
  return {
    ...artifact,
    log: {
      ...artifact.log,
      entries: artifact.log.entries.map((entry) => ({
        ...entry,
        request: {
          ...entry.request,
          postData: entry.request.postData
            ? { mimeType: entry.request.postData.mimeType }
            : undefined,
        },
        response: {
          ...entry.response,
          content: {
            size: entry.response.content.size,
            mimeType: entry.response.content.mimeType,
          },
        },
      })),
    },
  }
}

export const prepareSnapshotForUpload = (
  snapshot: DiagnosticSnapshot,
  includeBodyPreview: boolean,
): DiagnosticSnapshot => {
  if (includeBodyPreview || !snapshot.artifacts.networkHar) {
    return snapshot
  }

  return {
    ...snapshot,
    artifacts: {
      networkHar: stripHarBodyPreview(snapshot.artifacts.networkHar),
    },
  }
}

export const buildDiagnosticsUploadDocument = (
  kind: DiagnosticsKind,
  snapshot: DiagnosticSnapshot,
): unknown => {
  const har = snapshot.artifacts.networkHar

  if (kind === 'har') {
    return har ? { log: har.log } : snapshot
  }

  if (kind === 'snapshot') {
    return snapshot
  }

  return {
    snapshot,
    har: har ? { log: har.log } : null,
  }
}
