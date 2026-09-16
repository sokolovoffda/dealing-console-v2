import { vi } from 'vitest'
import { ref } from 'vue'

import { diagnosticPeriodPresets, startDiagnosticsAdminCollect, type DiagnosticSnapshot } from '@/features/diagnostics'
import type { CollectDiagnosticsRequestedPayload } from '@/shared/turret-admin-ws'

const mocks = vi.hoisted(() => {
  const state = {
    collectHandler: null as null | ((payload: CollectDiagnosticsRequestedPayload) => void),
    onCollectDiagnosticsRequested: vi.fn((handler: (payload: CollectDiagnosticsRequestedPayload) => void) => {
      state.collectHandler = handler
      return () => {
        state.collectHandler = null
      }
    }),
    sendDiagnosticsUploadReported: vi.fn(),
    uploadDiagnosticsArchive: vi.fn(),
    createRendererDiagnosticsSnapshot: vi.fn(),
    trackRendererDiagnosticEvent: vi.fn(),
    isElectron: vi.fn(() => false),
    getDiagnosticsSnapshot: vi.fn(),
  }

  return state
})

vi.mock('@/shared/turret-admin-ws', () => ({
  onCollectDiagnosticsRequested: mocks.onCollectDiagnosticsRequested,
  useTurretAdminWs: () => ({
    connectionId: ref('conn-1'),
    sendDiagnosticsUploadReported: mocks.sendDiagnosticsUploadReported,
  }),
}))

vi.mock('@/shared/utils/electron-helpers', () => ({
  isElectron: () => mocks.isElectron(),
}))

vi.mock('../api', () => ({
  uploadDiagnosticsArchive: mocks.uploadDiagnosticsArchive,
}))

vi.mock('../model/renderer-diagnostics', () => ({
  createRendererDiagnosticsSnapshot: mocks.createRendererDiagnosticsSnapshot,
  trackRendererDiagnosticEvent: mocks.trackRendererDiagnosticEvent,
}))

const createRendererSnapshot = (): DiagnosticSnapshot => ({
  version: 1,
  platform: 'electron',
  period: {
    from: '2026-08-13T11:00:00.000Z',
    to: '2026-08-13T12:00:00.000Z',
    preset: diagnosticPeriodPresets.CUSTOM,
  },
  metadata: {
    appVersion: '1.0.0',
    platform: 'web',
    collectedAt: '2026-08-13T12:00:00.000Z',
    networkState: 'online',
  },
  categories: [],
  artifacts: {
    networkHar: null,
  },
})

const invokeCollect = async (payload: CollectDiagnosticsRequestedPayload) => {
  mocks.collectHandler?.(payload)
  await vi.waitFor(() => {
    const isFinished = mocks.sendDiagnosticsUploadReported.mock.calls.length > 0
      || mocks.trackRendererDiagnosticEvent.mock.calls.some((call) => {
        const event = call[0] as { message?: string }
        return event.message === 'Diagnostics collect/upload failed'
      })

    expect(isFinished).toBe(true)
  })
}

describe('startDiagnosticsAdminCollect', () => {
  beforeAll(() => {
    startDiagnosticsAdminCollect()
  })

  beforeEach(() => {
    mocks.sendDiagnosticsUploadReported.mockClear()
    mocks.uploadDiagnosticsArchive.mockClear()
    mocks.createRendererDiagnosticsSnapshot.mockClear()
    mocks.trackRendererDiagnosticEvent.mockClear()
    mocks.getDiagnosticsSnapshot.mockClear()
    mocks.isElectron.mockReturnValue(false)
    mocks.createRendererDiagnosticsSnapshot.mockResolvedValue(createRendererSnapshot())
    mocks.uploadDiagnosticsArchive.mockResolvedValue({
      data: {
        schemaVersion: 1,
        upload: {
          id: 'upload-1',
          byteSize: 128,
        },
      },
    })
    window.electronAPI = {
      getDiagnosticsSnapshot: mocks.getDiagnosticsSnapshot,
    } as unknown as Window['electronAPI']
  })

  it('registers the collect handler only once', () => {
    // Arrange
    const handler = mocks.collectHandler

    // Act
    startDiagnosticsAdminCollect()
    startDiagnosticsAdminCollect()

    // Assert
    expect(handler).toEqual(expect.any(Function))
    expect(mocks.collectHandler).toBe(handler)
    expect(mocks.onCollectDiagnosticsRequested).toHaveBeenCalledTimes(1)
  })

  it('uploads the renderer snapshot without calling electronAPI on web', async () => {
    // Arrange
    const payload: CollectDiagnosticsRequestedPayload = {
      correlationId: 'corr-web',
      kind: 'har',
      periodMinutes: 30,
    }

    // Act
    await invokeCollect(payload)

    // Assert
    expect(mocks.getDiagnosticsSnapshot).not.toHaveBeenCalled()
    expect(mocks.createRendererDiagnosticsSnapshot).toHaveBeenCalledWith({
      filter: expect.objectContaining({
        period: expect.objectContaining({
          preset: diagnosticPeriodPresets.CUSTOM,
        }),
        limit: 500,
      }),
    })
    expect(mocks.uploadDiagnosticsArchive).toHaveBeenCalledTimes(1)

    const uploadRequest = mocks.uploadDiagnosticsArchive.mock.calls[0][0]
    expect(uploadRequest.correlationId).toBe('corr-web')
    expect(uploadRequest.kind).toBe('har')
    expect(uploadRequest.filename).toBe('har-corr-web.json')
    expect(uploadRequest.connectionId).toBe('conn-1')
    expect(uploadRequest.consoleType).toBe('dealing')

    expect(uploadRequest.file).toBeInstanceOf(Blob)
    expect(uploadRequest.file.type).toBe('application/json')
    expect(mocks.sendDiagnosticsUploadReported).toHaveBeenCalledWith({
      correlationId: 'corr-web',
      uploadId: 'upload-1',
      kind: 'har',
      byteSize: 128,
    })
  })

  it('does not send DiagnosticsUploadReported when upload fails', async () => {
    // Arrange
    mocks.uploadDiagnosticsArchive.mockRejectedValue(new Error('upload failed'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    // Act
    await invokeCollect({
      correlationId: 'corr-fail',
      kind: 'snapshot',
    })

    // Assert
    expect(mocks.sendDiagnosticsUploadReported).not.toHaveBeenCalled()
    expect(mocks.trackRendererDiagnosticEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Diagnostics collect/upload failed',
        payload: expect.objectContaining({
          correlationId: 'corr-fail',
          kind: 'snapshot',
        }),
      }),
    )
    warnSpy.mockRestore()
  })
})
