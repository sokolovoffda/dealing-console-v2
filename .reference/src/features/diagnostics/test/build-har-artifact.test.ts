// @ts-expect-error Electron-side builder is implemented as an ESM .mjs module.
import { buildDiagnosticHarArtifact } from '../../../../electron/har-builder.mjs'

describe('buildDiagnosticHarArtifact', () => {
  it('builds a HAR artifact from captured Electron requests', () => {
    const artifact = buildDiagnosticHarArtifact([
      {
        requestId: 1,
        startedAt: Date.parse('2026-05-19T10:00:00.000Z'),
        startedDateTime: '2026-05-19T10:00:00.000Z',
        completedAt: Date.parse('2026-05-19T10:00:01.000Z'),
        responseStartedAt: Date.parse('2026-05-19T10:00:00.900Z'),
        url: 'https://example.test/api?token=secret&mode=full',
        method: 'POST',
        resourceType: 'xhr',
        requestHeaders: {
          'content-type': 'application/json; charset=utf-8',
          cookie: 'session=abc123; theme=dark',
        },
        requestBodySize: 18,
        requestUploadData: [
          {
            type: 'bytes',
            textPreview: '{"password":"123"}',
          },
        ],
        responseHeaders: {
          'content-type': 'application/json; charset=utf-8',
          'content-length': '24',
          'set-cookie': [
            'session=next-token; Path=/; HttpOnly; Secure; SameSite=Strict',
          ],
        },
        responseStatusCode: 200,
        responseStatusLine: 'HTTP/1.1 200 OK',
        responseFromCache: false,
        responseIPAddress: '127.0.0.1',
        responseMimeType: 'application/json',
      },
    ], {
      appVersion: '3.0.0-alpha.1',
      electronVersion: '33.0.2',
      collectedAt: '2026-05-19T10:05:00.000Z',
      filter: {
        period: {
          from: '2026-05-19T09:59:00.000Z',
          to: '2026-05-19T10:10:00.000Z',
          preset: 'custom',
        },
      },
    })

    expect(artifact?.entryCount).toBe(1)
    expect(artifact?.log.creator.version).toBe('3.0.0-alpha.1')
    expect(artifact?.log.browser?.version).toBe('33.0.2')
    expect(artifact?.log.entries[0].request.cookies).toEqual([
      { name: 'session', value: 'abc123' },
      { name: 'theme', value: 'dark' },
    ])
    expect(artifact?.log.entries[0].request.queryString).toEqual([
      { name: 'token', value: 'secret' },
      { name: 'mode', value: 'full' },
    ])
    expect(artifact?.log.entries[0].request.postData?.text).toBe('{"password":"123"}')
    expect(artifact?.log.entries[0].response.cookies[0]).toMatchObject({
      name: 'session',
      value: 'next-token',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    })
    expect(artifact?.log.entries[0].response.content).toEqual({
      size: 24,
      mimeType: 'application/json',
    })
    expect(artifact?.log.entries[0].timings).toEqual({
      send: 0,
      wait: 900,
      receive: 100,
    })
    expect(artifact?.log.entries[0].serverIPAddress).toBe('127.0.0.1')
  })

  it('filters HAR requests by category, period, limit and search', () => {
    const baseRequests = [
      {
        requestId: 1,
        startedAt: Date.parse('2026-05-19T10:00:00.000Z'),
        startedDateTime: '2026-05-19T10:00:00.000Z',
        completedAt: Date.parse('2026-05-19T10:00:01.000Z'),
        responseStartedAt: Date.parse('2026-05-19T10:00:00.800Z'),
        url: 'https://example.test/first',
        method: 'GET',
        resourceType: 'xhr',
        requestHeaders: {},
        requestBodySize: 0,
        requestUploadData: [],
        responseHeaders: {},
        responseStatusCode: 200,
        responseStatusLine: 'HTTP/1.1 200 OK',
      },
      {
        requestId: 2,
        startedAt: Date.parse('2026-05-19T10:05:00.000Z'),
        startedDateTime: '2026-05-19T10:05:00.000Z',
        completedAt: Date.parse('2026-05-19T10:05:01.000Z'),
        responseStartedAt: Date.parse('2026-05-19T10:05:00.700Z'),
        url: 'https://example.test/second?search=match',
        method: 'GET',
        resourceType: 'fetch',
        requestHeaders: {},
        requestBodySize: 0,
        requestUploadData: [],
        responseHeaders: {},
        responseStatusCode: 200,
        responseStatusLine: 'HTTP/1.1 200 OK',
      },
    ]

    const filteredArtifact = buildDiagnosticHarArtifact(baseRequests, {
      filter: {
        categories: ['network'],
        period: {
          from: '2026-05-19T10:01:00.000Z',
          to: '2026-05-19T10:10:00.000Z',
          preset: 'custom',
        },
        limit: 1,
        search: 'match',
      },
    })

    const skippedArtifact = buildDiagnosticHarArtifact(baseRequests, {
      filter: {
        categories: ['system'],
        period: {
          from: '2026-05-19T10:00:00.000Z',
          to: '2026-05-19T10:10:00.000Z',
          preset: 'custom',
        },
      },
    })

    expect(filteredArtifact?.entryCount).toBe(1)
    expect(filteredArtifact?.log.entries[0].request.url).toContain('match')
    expect(skippedArtifact).toBeNull()
  })
})
