import { diagnosticCategories, diagnosticLogLevels, type DiagnosticSnapshot } from '@/features/diagnostics'
import {
  DIAGNOSTIC_REDACTION_MASK,
  redactDiagnosticSnapshot,
} from '@/features/diagnostics'

describe('redactDiagnosticSnapshot', () => {
  it('masks sensitive keys in payload and metadata', () => {
    const snapshot: DiagnosticSnapshot = {
      version: 1,
      platform: 'electron',
      period: {
        from: '2026-05-19T10:00:00.000Z',
        to: '2026-05-19T11:00:00.000Z',
        preset: 'custom',
      },
      metadata: {
        appVersion: '1.0.0',
        platform: 'win32',
        collectedAt: '2026-05-19T11:00:00.000Z',
        route: '/main',
        userLogin: 'tester',
        userNumber: '1001',
        networkState: 'online',
      },
      categories: [
        {
          category: diagnosticCategories.NETWORK,
          total: 1,
          records: [
            {
              id: '1',
              timestamp: '2026-05-19T10:30:00.000Z',
              category: diagnosticCategories.NETWORK,
              level: diagnosticLogLevels.INFO,
              source: 'window.fetch',
              message: 'Request completed',
              payload: {
                authorization: 'Bearer super-secret-token',
                cookie: 'session=abc',
                nested: {
                  refreshToken: 'refresh-value',
                },
              },
            },
          ],
        },
      ],
      artifacts: {
        networkHar: null,
      },
    }

    const result = redactDiagnosticSnapshot(snapshot)
    const payload = result.categories[0].records[0].payload as Record<string, unknown>

    expect(payload.authorization).toBe(DIAGNOSTIC_REDACTION_MASK)
    expect(payload.cookie).toBe(DIAGNOSTIC_REDACTION_MASK)
    expect((payload.nested as Record<string, unknown>).refreshToken).toBe(DIAGNOSTIC_REDACTION_MASK)
    expect(result.metadata.userLogin).toBe('tester')
  })

  it('masks sensitive token fragments inside strings', () => {
    const snapshot: DiagnosticSnapshot = {
      version: 1,
      platform: 'electron',
      period: {
        from: '2026-05-19T10:00:00.000Z',
        to: '2026-05-19T11:00:00.000Z',
        preset: 'custom',
      },
      metadata: {
        appVersion: '1.0.0',
        platform: 'linux',
        collectedAt: '2026-05-19T11:00:00.000Z',
        networkState: 'offline',
      },
      categories: [
        {
          category: diagnosticCategories.SYSTEM,
          total: 1,
          records: [
            {
              id: '2',
              timestamp: '2026-05-19T10:40:00.000Z',
              category: diagnosticCategories.SYSTEM,
              level: diagnosticLogLevels.ERROR,
              source: 'auth',
              message: 'Authorization failed for Bearer secret-token-value',
              payload: {
                url: 'https://example.test?token=top-secret&foo=bar',
              },
            },
          ],
        },
      ],
      artifacts: {
        networkHar: {
          collectedAt: '2026-05-19T11:00:00.000Z',
          entryCount: 1,
          log: {
            version: '1.2',
            creator: {
              name: 'diagnostics',
              version: '1.0.0',
            },
            entries: [
              {
                startedDateTime: '2026-05-19T10:40:00.000Z',
                time: 123,
                request: {
                  method: 'GET',
                  url: 'https://example.test?token=top-secret&foo=bar',
                  httpVersion: 'HTTP/1.1',
                  cookies: [],
                  headers: [
                    { name: 'Authorization', value: 'Bearer har-secret-token' },
                  ],
                  queryString: [
                    { name: 'token', value: 'top-secret' },
                  ],
                  headersSize: -1,
                  bodySize: 0,
                },
                response: {
                  status: 200,
                  statusText: 'OK',
                  httpVersion: 'HTTP/1.1',
                  cookies: [],
                  headers: [
                    { name: 'set-cookie', value: 'session=secret-session' },
                  ],
                  content: {
                    size: 10,
                    mimeType: 'application/json',
                    text: '{"token":"top-secret"}',
                  },
                  redirectURL: '',
                  headersSize: -1,
                  bodySize: 10,
                },
                cache: {},
                timings: {
                  send: 1,
                  wait: 120,
                  receive: 2,
                },
              },
            ],
          },
        },
      },
    }

    const result = redactDiagnosticSnapshot(snapshot)
    const record = result.categories[0].records[0]

    expect(record.message).toContain(DIAGNOSTIC_REDACTION_MASK)
    expect(JSON.stringify(record.payload)).toContain(DIAGNOSTIC_REDACTION_MASK)
    expect(JSON.stringify(result.artifacts.networkHar)).toContain(DIAGNOSTIC_REDACTION_MASK)
    expect(record.message).not.toContain('secret-token-value')
    expect(JSON.stringify(record.payload)).not.toContain('top-secret')
    expect(JSON.stringify(result.artifacts.networkHar)).not.toContain('har-secret-token')
    expect(JSON.stringify(result.artifacts.networkHar)).not.toContain('top-secret')
  })
})
