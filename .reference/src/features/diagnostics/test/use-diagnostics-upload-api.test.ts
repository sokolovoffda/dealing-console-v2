import { vi } from 'vitest'

import { uploadDiagnosticsArchive } from '@/features/diagnostics'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  getAdditionalApiURL: vi.fn(({ pathName }: { pathName: string }) => `https://admin.test${pathName}`),
}))

vi.mock('axios', () => ({
  default: {
    post: mocks.post,
  },
}))

vi.mock('@/shared/url-helper', () => ({
  getAdditionalApiURL: mocks.getAdditionalApiURL,
}))

describe('uploadDiagnosticsArchive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.post.mockResolvedValue({ data: { schemaVersion: 1, upload: { id: 'upload-1' } } })
  })

  it('posts multipart fields required by the admin upload contract', async () => {
    // Arrange
    const file = new Blob(['{"ok":true}'], { type: 'application/json' })

    // Act
    await uploadDiagnosticsArchive({
      correlationId: 'corr-1',
      kind: 'har',
      file,
      filename: 'har-corr-1.json',
      connectionId: 'conn-1',
      consoleType: 'dealing',
      metadata: {
        periodMinutes: 30,
      },
    })

    // Assert
    expect(mocks.getAdditionalApiURL).toHaveBeenCalledWith({
      pathName: '/api/v1/me/diagnostics/upload',
    })
    expect(mocks.post).toHaveBeenCalledTimes(1)

    const [url, formData, config] = mocks.post.mock.calls[0]
    expect(url).toBe('https://admin.test/api/v1/me/diagnostics/upload')
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('correlationId')).toBe('corr-1')
    expect(formData.get('kind')).toBe('har')
    expect(formData.get('connectionId')).toBe('conn-1')
    expect(formData.get('consoleType')).toBe('dealing')
    expect(formData.get('metadata')).toBe(JSON.stringify({ periodMinutes: 30 }))
    expect(formData.has('hardwareMac')).toBe(false)
    expect(formData.has('hardwareSerial')).toBe(false)
    expect((formData.get('file') as File).name).toBe('har-corr-1.json')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
  })

  it('uses a kind-correlation filename when none is provided', async () => {
    // Arrange
    const file = new Blob(['{"ok":true}'], { type: 'application/json' })

    // Act
    await uploadDiagnosticsArchive({
      correlationId: 'corr-2',
      kind: 'snapshot',
      file,
    })

    // Assert
    const formData = mocks.post.mock.calls[0][1] as FormData
    expect((formData.get('file') as File).name).toBe('snapshot-corr-2.json')
  })
})
