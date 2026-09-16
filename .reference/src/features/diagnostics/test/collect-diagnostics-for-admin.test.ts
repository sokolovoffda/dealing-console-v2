import { vi } from 'vitest'

import { diagnosticCategories, diagnosticPeriodPresets, type DiagnosticHarArtifact, type DiagnosticSnapshot } from '@/features/diagnostics'
import type { CollectDiagnosticsRequestedPayload } from '@/shared/turret-admin-ws'

import {
  buildDiagnosticsUploadDocument,
  createCollectSnapshotRequest,
  prepareSnapshotForUpload,
  stripHarBodyPreview,
} from '../model/collect-diagnostics-for-admin'

const NOW = '2026-08-13T12:00:00.000Z'

const createHarArtifact = (): DiagnosticHarArtifact => ({
  collectedAt: NOW,
  entryCount: 1,
  log: {
    version: '1.2',
    creator: {
      name: 'dealing-console-ui',
      version: '1.0.0',
    },
    entries: [
      {
        startedDateTime: NOW,
        time: 120,
        request: {
          method: 'POST',
          url: 'https://example.test/api',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          queryString: [],
          headersSize: 12,
          bodySize: 18,
          postData: {
            mimeType: 'application/json',
            text: '{"password":"secret"}',
          },
        },
        response: {
          status: 200,
          statusText: 'OK',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          content: {
            size: 24,
            mimeType: 'application/json',
            text: '{"token":"abc"}',
          },
          redirectURL: '',
          headersSize: 20,
          bodySize: 24,
        },
        cache: {},
        timings: {
          send: 0,
          wait: 100,
          receive: 20,
        },
      },
    ],
  },
})

const createSnapshot = (networkHar: DiagnosticHarArtifact | null): DiagnosticSnapshot => ({
  version: 1,
  platform: 'electron',
  period: {
    from: '2026-08-13T11:00:00.000Z',
    to: NOW,
    preset: diagnosticPeriodPresets.CUSTOM,
  },
  metadata: {
    appVersion: '1.0.0',
    platform: 'win32',
    collectedAt: NOW,
    networkState: 'online',
  },
  categories: [],
  artifacts: {
    networkHar,
  },
})

describe('createCollectSnapshotRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps periodMinutes to a custom time range', () => {
    // Arrange
    const payload: CollectDiagnosticsRequestedPayload = {
      correlationId: 'corr-1',
      kind: 'har',
      periodMinutes: 30,
    }

    // Act
    const request = createCollectSnapshotRequest(payload)

    // Assert
    expect(request.filter.period).toEqual({
      from: '2026-08-13T11:30:00.000Z',
      to: NOW,
      preset: diagnosticPeriodPresets.CUSTOM,
    })
    expect(request.filter.limit).toBe(500)
    expect(request.filter.categories).toBeUndefined()
  })

  it('falls back to 60 minutes when periodMinutes is missing or not positive', () => {
    // Arrange
    const withoutPeriod: CollectDiagnosticsRequestedPayload = {
      correlationId: 'corr-2',
      kind: 'snapshot',
    }
    const zeroPeriod: CollectDiagnosticsRequestedPayload = {
      correlationId: 'corr-3',
      kind: 'archive',
      periodMinutes: 0,
    }

    // Act
    const defaultRequest = createCollectSnapshotRequest(withoutPeriod)
    const zeroRequest = createCollectSnapshotRequest(zeroPeriod)

    // Assert
    expect(defaultRequest.filter.period.from).toBe('2026-08-13T11:00:00.000Z')
    expect(zeroRequest.filter.period.from).toBe('2026-08-13T11:00:00.000Z')
  })

  it('keeps only known diagnostic categories', () => {
    // Arrange
    const payload: CollectDiagnosticsRequestedPayload = {
      correlationId: 'corr-4',
      kind: 'snapshot',
      categories: [diagnosticCategories.NETWORK, 'not-a-category', diagnosticCategories.WEBSOCKET],
    }

    // Act
    const request = createCollectSnapshotRequest(payload)

    // Assert
    expect(request.filter.categories).toEqual([
      diagnosticCategories.NETWORK,
      diagnosticCategories.WEBSOCKET,
    ])
  })

  it('omits categories when the command has none that are valid', () => {
    // Arrange
    const payload: CollectDiagnosticsRequestedPayload = {
      correlationId: 'corr-5',
      kind: 'har',
      categories: ['unknown'],
    }

    // Act
    const request = createCollectSnapshotRequest(payload)

    // Assert
    expect(request.filter.categories).toBeUndefined()
  })
})

describe('stripHarBodyPreview', () => {
  it('drops request postData text and response body text, keeping mime types', () => {
    // Arrange
    const artifact = createHarArtifact()

    // Act
    const stripped = stripHarBodyPreview(artifact)

    // Assert
    expect(stripped.log.entries[0].request.postData).toEqual({
      mimeType: 'application/json',
    })
    expect(stripped.log.entries[0].response.content).toEqual({
      size: 24,
      mimeType: 'application/json',
    })
    expect(artifact.log.entries[0].request.postData?.text).toBe('{"password":"secret"}')
  })
})

describe('prepareSnapshotForUpload', () => {
  it('strips HAR bodies unless includeBodyPreview is true', () => {
    // Arrange
    const snapshot = createSnapshot(createHarArtifact())

    // Act
    const withoutPreview = prepareSnapshotForUpload(snapshot, false)
    const withPreview = prepareSnapshotForUpload(snapshot, true)

    // Assert
    expect(withoutPreview.artifacts.networkHar?.log.entries[0].request.postData?.text).toBeUndefined()
    expect(withPreview.artifacts.networkHar?.log.entries[0].request.postData?.text).toBe('{"password":"secret"}')
  })

  it('leaves a snapshot without HAR unchanged', () => {
    // Arrange
    const snapshot = createSnapshot(null)

    // Act
    const result = prepareSnapshotForUpload(snapshot, false)

    // Assert
    expect(result).toBe(snapshot)
  })
})

describe('buildDiagnosticsUploadDocument', () => {
  it('maps har kind to a HAR log document', () => {
    // Arrange
    const snapshot = createSnapshot(createHarArtifact())

    // Act
    const document = buildDiagnosticsUploadDocument('har', snapshot)

    // Assert
    expect(document).toEqual({ log: snapshot.artifacts.networkHar?.log })
  })

  it('falls back to the snapshot for har kind when HAR is missing (web without electronAPI)', () => {
    // Arrange
    const snapshot = createSnapshot(null)

    // Act
    const document = buildDiagnosticsUploadDocument('har', snapshot)

    // Assert
    expect(document).toBe(snapshot)
  })

  it('maps snapshot kind to the snapshot document', () => {
    // Arrange
    const snapshot = createSnapshot(createHarArtifact())

    // Act
    const document = buildDiagnosticsUploadDocument('snapshot', snapshot)

    // Assert
    expect(document).toBe(snapshot)
  })

  it('maps archive kind to snapshot plus HAR log', () => {
    // Arrange
    const snapshot = createSnapshot(createHarArtifact())

    // Act
    const document = buildDiagnosticsUploadDocument('archive', snapshot)

    // Assert
    expect(document).toEqual({
      snapshot,
      har: { log: snapshot.artifacts.networkHar?.log },
    })
  })

  it('maps archive kind to null HAR when the artifact is missing', () => {
    // Arrange
    const snapshot = createSnapshot(null)

    // Act
    const document = buildDiagnosticsUploadDocument('archive', snapshot)

    // Assert
    expect(document).toEqual({
      snapshot,
      har: null,
    })
  })
})
