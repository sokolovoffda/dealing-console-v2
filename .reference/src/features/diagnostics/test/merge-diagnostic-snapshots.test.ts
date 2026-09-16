import {
  diagnosticCategories,
  diagnosticLogLevels,
  mergeDiagnosticSnapshots,
  type DiagnosticSnapshot,
} from '@/features/diagnostics'

describe('mergeDiagnosticSnapshots', () => {
  it('merges records from renderer and main snapshots by category and sorts them by timestamp', () => {
    const rendererSnapshot: DiagnosticSnapshot = {
      version: 1,
      platform: 'electron',
      period: {
        from: '2026-05-19T10:00:00.000Z',
        to: '2026-05-19T11:00:00.000Z',
        preset: 'last-hour',
      },
      metadata: {
        appVersion: '1.0.0',
        platform: 'renderer',
        collectedAt: '2026-05-19T10:59:00.000Z',
        route: '/main/settings',
        userLogin: 'renderer-user',
        networkState: 'offline',
      },
      categories: [
        {
          category: diagnosticCategories.CONSOLE,
          total: 1,
          records: [
            {
              id: 'renderer-1',
              timestamp: '2026-05-19T10:30:00.000Z',
              category: diagnosticCategories.CONSOLE,
              level: diagnosticLogLevels.INFO,
              source: 'renderer',
              message: 'Renderer event',
            },
          ],
        },
        {
          category: diagnosticCategories.SYSTEM,
          total: 0,
          records: [],
        },
      ],
      artifacts: {
        networkHar: null,
      },
    }

    const mainSnapshot: DiagnosticSnapshot = {
      version: 1,
      platform: 'electron',
      period: {
        from: '2026-05-19T10:00:00.000Z',
        to: '2026-05-19T11:00:00.000Z',
        preset: 'last-hour',
      },
      metadata: {
        appVersion: '1.0.0',
        platform: 'main',
        collectedAt: '2026-05-19T11:00:00.000Z',
        hostname: 'controller-01',
        userNumber: '1001',
        networkState: 'online',
      },
      categories: [
        {
          category: diagnosticCategories.CONSOLE,
          total: 1,
          records: [
            {
              id: 'main-1',
              timestamp: '2026-05-19T10:45:00.000Z',
              category: diagnosticCategories.CONSOLE,
              level: diagnosticLogLevels.WARN,
              source: 'main',
              message: 'Main event',
            },
          ],
        },
        {
          category: diagnosticCategories.SYSTEM,
          total: 1,
          records: [
            {
              id: 'main-2',
              timestamp: '2026-05-19T10:50:00.000Z',
              category: diagnosticCategories.SYSTEM,
              level: diagnosticLogLevels.ERROR,
              source: 'main',
              message: 'System event',
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
              name: 'dispatch-console-ui diagnostics',
              version: '1.0.0',
            },
            entries: [
              {
                startedDateTime: '2026-05-19T10:45:00.000Z',
                time: 100,
                request: {
                  method: 'GET',
                  url: 'https://example.test/api',
                  httpVersion: 'HTTP/1.1',
                  cookies: [],
                  headers: [],
                  queryString: [],
                  headersSize: -1,
                  bodySize: 0,
                },
                response: {
                  status: 200,
                  statusText: 'OK',
                  httpVersion: 'HTTP/1.1',
                  cookies: [],
                  headers: [],
                  content: {
                    size: 0,
                    mimeType: 'application/json',
                  },
                  redirectURL: '',
                  headersSize: -1,
                  bodySize: 0,
                },
                cache: {},
                timings: {
                  send: 0,
                  wait: 90,
                  receive: 10,
                },
              },
            ],
          },
        },
      },
    }

    const result = mergeDiagnosticSnapshots(rendererSnapshot, mainSnapshot)
    const consoleCategory = result.categories.find((item) => item.category === diagnosticCategories.CONSOLE)
    const systemCategory = result.categories.find((item) => item.category === diagnosticCategories.SYSTEM)

    expect(result.metadata.collectedAt).toBe('2026-05-19T11:00:00.000Z')
    expect(result.metadata.route).toBe('/main/settings')
    expect(result.metadata.hostname).toBe('controller-01')
    expect(result.metadata.userLogin).toBe('renderer-user')
    expect(result.metadata.userNumber).toBe('1001')
    expect(result.metadata.networkState).toBe('online')

    expect(consoleCategory?.records.map((record) => record.id)).toEqual(['main-1', 'renderer-1'])
    expect(consoleCategory?.total).toBe(2)
    expect(systemCategory?.records.map((record) => record.id)).toEqual(['main-2'])
    expect(systemCategory?.total).toBe(1)
    expect(result.artifacts.networkHar?.entryCount).toBe(1)
    expect(result.artifacts.networkHar?.log.entries[0].request.url).toBe('https://example.test/api')
  })
})
