import { version } from '@/../package.json'

import { normalizeDiagnosticValue, redactDiagnosticSnapshot } from '../lib'

import {
  DIAGNOSTIC_PLATFORM,
  DIAGNOSTIC_SNAPSHOT_VERSION,
  diagnosticCategories,
  diagnosticLogLevels,
  diagnosticPeriodPresets,
  type DiagnosticAppMetadata,
  type DiagnosticCategory,
  type DiagnosticCategorySnapshot,
  type DiagnosticLogFilter,
  type DiagnosticLogLevel,
  type DiagnosticLogRecord,
  type DiagnosticSnapshot,
  type DiagnosticSnapshotRequest,
} from './types'

const RENDERER_RING_BUFFER_LIMIT = 1000

type DiagnosticMetadataProvider = () => Partial<DiagnosticAppMetadata>
type DiagnosticDynamicRecordsProvider = () => Promise<DiagnosticLogRecord[]> | DiagnosticLogRecord[]
type TrackDiagnosticEventInput = Omit<DiagnosticLogRecord, 'id' | 'timestamp' | 'payload'> & {
  payload?: unknown,
}

type DiagnosticXHR = XMLHttpRequest & {
  __diagnosticMethod?: string,
  __diagnosticUrl?: string,
  __diagnosticStartedAt?: number,
}

const records: DiagnosticLogRecord[] = []
const metadataProviders = new Set<DiagnosticMetadataProvider>()
const dynamicRecordsProviders = new Map<DiagnosticCategory, DiagnosticDynamicRecordsProvider>()

let rendererSequence = 0
let consoleCaptureInstalled = false
let networkCaptureInstalled = false
let browserEventsInstalled = false

const createRecordId = () => {
  rendererSequence += 1
  return `renderer-${Date.now()}-${rendererSequence}`
}

const appendRecord = (input: TrackDiagnosticEventInput): DiagnosticLogRecord => {
  const record: DiagnosticLogRecord = {
    id: createRecordId(),
    timestamp: new Date().toISOString(),
    category: input.category,
    level: input.level,
    source: input.source,
    message: input.message,
    payload: input.payload === undefined ? undefined : normalizeDiagnosticValue(input.payload),
    tags: input.tags,
  }

  records.push(record)

  if (records.length > RENDERER_RING_BUFFER_LIMIT) {
    records.splice(0, records.length - RENDERER_RING_BUFFER_LIMIT)
  }

  return record
}

const filterRecords = (sourceRecords: DiagnosticLogRecord[], filter: DiagnosticLogFilter): DiagnosticCategorySnapshot[] => {
  const selectedCategories = filter.categories?.length
    ? filter.categories
    : Object.values(diagnosticCategories)

  const fromMs = Date.parse(filter.period.from)
  const toMs = Date.parse(filter.period.to)
  const search = filter.search?.trim().toLowerCase() ?? ''

  const filteredRecords = sourceRecords.filter((record) => {
    if (!selectedCategories.includes(record.category)) {
      return false
    }

    const timestampMs = Date.parse(record.timestamp)

    if (timestampMs < fromMs || timestampMs > toMs) {
      return false
    }

    if (!search) {
      return true
    }

    const haystack = `${record.message} ${JSON.stringify(record.payload ?? '')}`.toLowerCase()
    return haystack.includes(search)
  })

  const limitedRecords = typeof filter.limit === 'number' && filter.limit > 0
    ? filteredRecords.slice(-filter.limit)
    : filteredRecords

  return selectedCategories.map((category) => {
    const categoryRecords = limitedRecords.filter((record) => record.category === category)

    return {
      category,
      records: categoryRecords,
      total: categoryRecords.length,
    }
  })
}

const createDefaultFilter = (): DiagnosticLogFilter => ({
  period: {
    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    preset: diagnosticPeriodPresets.LAST_24_HOURS,
  },
})

const collectDynamicRecords = async (categories?: DiagnosticCategory[]): Promise<DiagnosticLogRecord[]> => {
  const targetCategories = categories?.length ? categories : Array.from(dynamicRecordsProviders.keys())
  const dynamicRecords = await Promise.all(targetCategories.map(async (category) => {
    const provider = dynamicRecordsProviders.get(category)
    if (!provider) {
      return []
    }

    const result = await provider()
    return result
  }))

  return dynamicRecords.flat()
}

const createMetadata = (): DiagnosticAppMetadata => {
  const metadata = Array.from(metadataProviders).reduce<Partial<DiagnosticAppMetadata>>((acc, provider) => {
    return {
      ...acc,
      ...provider(),
    }
  }, {})

  return {
    appVersion: metadata.appVersion ?? version,
    platform: metadata.platform ?? DIAGNOSTIC_PLATFORM,
    collectedAt: new Date().toISOString(),
    route: metadata.route,
    hostname: metadata.hostname,
    userLogin: metadata.userLogin,
    userNumber: metadata.userNumber,
    networkState: metadata.networkState ?? (navigator.onLine ? 'online' : 'offline'),
  }
}

export const trackRendererDiagnosticEvent = (input: TrackDiagnosticEventInput): DiagnosticLogRecord => {
  return appendRecord(input)
}

export const registerRendererDiagnosticMetadataProvider = (provider: DiagnosticMetadataProvider): (() => void) => {
  metadataProviders.add(provider)
  return () => metadataProviders.delete(provider)
}

export const registerRendererDiagnosticDynamicRecordsProvider = (
  category: DiagnosticCategory,
  provider: DiagnosticDynamicRecordsProvider,
): (() => void) => {
  dynamicRecordsProviders.set(category, provider)
  return () => dynamicRecordsProviders.delete(category)
}

export const installRendererConsoleCapture = (): void => {
  if (consoleCaptureInstalled) {
    return
  }

  consoleCaptureInstalled = true

  const consoleMethods: DiagnosticLogLevel[] = ['log', 'info', 'warn', 'error', 'debug']

  consoleMethods.forEach((method) => {
    const originalMethod = console[method].bind(console)

    console[method] = (...args: unknown[]) => {
      appendRecord({
        category: diagnosticCategories.CONSOLE,
        level: method,
        source: 'renderer-console',
        message: args.map((arg) => typeof arg === 'string' ? arg : String(arg)).join(' '),
        payload: args,
        tags: ['renderer-console'],
      })

      originalMethod(...args)
    }
  })
}

export const installRendererNetworkCapture = (): void => {
  if (networkCaptureInstalled) {
    return
  }

  networkCaptureInstalled = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const startedAt = Date.now()
    const method = init?.method ?? 'GET'
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

    appendRecord({
      category: diagnosticCategories.NETWORK,
      level: diagnosticLogLevels.INFO,
      source: 'window.fetch',
      message: 'HTTP request started',
      payload: { method, url },
      tags: ['network-request', 'fetch'],
    })

    try {
      const response = await originalFetch(input, init)
      appendRecord({
        category: diagnosticCategories.NETWORK,
        level: response.ok ? diagnosticLogLevels.INFO : diagnosticLogLevels.WARN,
        source: 'window.fetch',
        message: 'HTTP request completed',
        payload: {
          method,
          url,
          status: response.status,
          ok: response.ok,
          durationMs: Date.now() - startedAt,
        },
        tags: ['network-response', 'fetch'],
      })

      return response
    } catch (error) {
      appendRecord({
        category: diagnosticCategories.NETWORK,
        level: diagnosticLogLevels.ERROR,
        source: 'window.fetch',
        message: 'HTTP request failed',
        payload: {
          method,
          url,
          durationMs: Date.now() - startedAt,
          error,
        },
        tags: ['network-error', 'fetch'],
      })

      throw error
    }
  }

  const xhrOpen = XMLHttpRequest.prototype.open
  const xhrSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const request = this as DiagnosticXHR
    request.__diagnosticMethod = method
    request.__diagnosticUrl = typeof url === 'string' ? url : url.toString()

    return xhrOpen.call(this, method, url, async ?? true, username ?? undefined, password ?? undefined)
  }

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const request = this as DiagnosticXHR

    request.__diagnosticStartedAt = Date.now()

    appendRecord({
      category: diagnosticCategories.NETWORK,
      level: diagnosticLogLevels.INFO,
      source: 'xml-http-request',
      message: 'XHR request started',
      payload: {
        method: request.__diagnosticMethod ?? 'GET',
        url: request.__diagnosticUrl ?? '',
        hasBody: body !== null && body !== undefined,
      },
      tags: ['network-request', 'xhr'],
    })

    request.addEventListener('loadend', () => {
      appendRecord({
        category: diagnosticCategories.NETWORK,
        level: request.status >= 400 ? diagnosticLogLevels.WARN : diagnosticLogLevels.INFO,
        source: 'xml-http-request',
        message: 'XHR request completed',
        payload: {
          method: request.__diagnosticMethod ?? 'GET',
          url: request.__diagnosticUrl ?? '',
          status: request.status,
          durationMs: Date.now() - (request.__diagnosticStartedAt ?? Date.now()),
        },
        tags: ['network-response', 'xhr'],
      })
    }, { once: true })

    request.addEventListener('error', () => {
      appendRecord({
        category: diagnosticCategories.NETWORK,
        level: diagnosticLogLevels.ERROR,
        source: 'xml-http-request',
        message: 'XHR request failed',
        payload: {
          method: request.__diagnosticMethod ?? 'GET',
          url: request.__diagnosticUrl ?? '',
          durationMs: Date.now() - (request.__diagnosticStartedAt ?? Date.now()),
        },
        tags: ['network-error', 'xhr'],
      })
    }, { once: true })

    return xhrSend.call(this, body)
  }
}

export const installRendererBrowserEventCapture = (): void => {
  if (browserEventsInstalled) {
    return
  }

  browserEventsInstalled = true

  window.addEventListener('error', (event) => {
    appendRecord({
      category: diagnosticCategories.SYSTEM,
      level: diagnosticLogLevels.ERROR,
      source: 'window-error',
      message: event.message,
      payload: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      },
      tags: ['window-error'],
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    appendRecord({
      category: diagnosticCategories.SYSTEM,
      level: diagnosticLogLevels.ERROR,
      source: 'window-unhandledrejection',
      message: 'Unhandled promise rejection',
      payload: {
        reason: event.reason,
      },
      tags: ['unhandledrejection'],
    })
  })

  window.addEventListener('online', () => {
    appendRecord({
      category: diagnosticCategories.SYSTEM,
      level: diagnosticLogLevels.INFO,
      source: 'navigator',
      message: 'Browser network state changed to online',
      tags: ['online-status'],
    })
  })

  window.addEventListener('offline', () => {
    appendRecord({
      category: diagnosticCategories.SYSTEM,
      level: diagnosticLogLevels.WARN,
      source: 'navigator',
      message: 'Browser network state changed to offline',
      tags: ['online-status'],
    })
  })
}

export const initializeRendererDiagnostics = (): void => {
  installRendererConsoleCapture()
  installRendererNetworkCapture()
  installRendererBrowserEventCapture()

  appendRecord({
    category: diagnosticCategories.SYSTEM,
    level: diagnosticLogLevels.INFO,
    source: 'renderer-diagnostics',
    message: 'Renderer diagnostics initialized',
    payload: {
      appVersion: version,
      userAgent: navigator.userAgent,
    },
    tags: ['renderer-diagnostics'],
  })
}

export const createRendererDiagnosticsSnapshot = async (
  request: DiagnosticSnapshotRequest = { filter: createDefaultFilter() },
): Promise<DiagnosticSnapshot> => {
  const dynamicRecords = await collectDynamicRecords(request.filter.categories)
  const snapshotRecords = [...records, ...dynamicRecords]

  const snapshot: DiagnosticSnapshot = {
    version: DIAGNOSTIC_SNAPSHOT_VERSION,
    platform: DIAGNOSTIC_PLATFORM,
    period: request.filter.period,
    metadata: createMetadata(),
    categories: filterRecords(snapshotRecords, request.filter),
    artifacts: {
      networkHar: null,
    },
  }

  return redactDiagnosticSnapshot(snapshot)
}
