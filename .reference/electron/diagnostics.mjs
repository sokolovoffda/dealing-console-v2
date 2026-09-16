import { redactDiagnosticSnapshot } from './diagnostics-redaction.mjs'
import { buildDiagnosticHarArtifact } from './har-builder.mjs'

const DIAGNOSTIC_IPC_CHANNELS = {
  GET_SNAPSHOT: 'diagnostics:get-snapshot',
}

const DIAGNOSTIC_CATEGORIES = {
  CONSOLE: 'console',
  NETWORK: 'network',
  WEBSOCKET: 'websocket',
  WEB_RTC: 'webrtc',
  SYSTEM: 'system',
  APP_METADATA: 'app-metadata',
}

const DIAGNOSTIC_SNAPSHOT_VERSION = 1
const DIAGNOSTIC_PLATFORM = 'electron'
const RING_BUFFER_LIMIT = 500
const HAR_CAPTURE_LIMIT = 300
const HAR_TEXT_PREVIEW_LIMIT = 16 * 1024

const records = []
const activeHarRequests = new Map()
const completedHarRequests = []
let sequence = 0
let harNetworkCaptureInstalled = false

const createRecordId = () => {
  sequence += 1
  return `main-${Date.now()}-${sequence}`
}

const toDiagnosticValue = (value) => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null,
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => toDiagnosticValue(item))
  }

  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return String(value)
    }
  }

  return String(value)
}

const appendRecord = ({
  category = DIAGNOSTIC_CATEGORIES.SYSTEM,
  level = 'info',
  source = 'electron-main',
  message,
  payload,
  tags,
}) => {
  const record = {
    id: createRecordId(),
    timestamp: new Date().toISOString(),
    category,
    level,
    source,
    message,
    payload: toDiagnosticValue(payload),
    tags,
  }

  records.push(record)

  if (records.length > RING_BUFFER_LIMIT) {
    records.splice(0, records.length - RING_BUFFER_LIMIT)
  }

  return record
}

const cloneHeaders = (headers) => {
  if (!headers || typeof headers !== 'object') {
    return {}
  }

  return Object.entries(headers).reduce((acc, [name, value]) => {
    if (Array.isArray(value)) {
      acc[name] = [ ...value ]
      return acc
    }

    if (typeof value === 'string') {
      acc[name] = value
      return acc
    }

    acc[name] = value == null ? '' : String(value)
    return acc
  }, {})
}

const toUploadDataPreview = (uploadData = []) => {
  return uploadData.map((item) => {
    if (item.file) {
      return {
        type: 'file',
        file: item.file,
      }
    }

    if (item.bytes) {
      const bytesBuffer = Buffer.from(item.bytes)
      return {
        type: 'bytes',
        bytesLength: bytesBuffer.byteLength,
        textPreview: bytesBuffer.byteLength <= HAR_TEXT_PREVIEW_LIMIT
          ? bytesBuffer.toString('utf8')
          : undefined,
      }
    }

    if (item.blobUUID) {
      return {
        type: 'blob',
        blobUUID: item.blobUUID,
      }
    }

    return {
      type: 'unknown',
    }
  })
}

const getRequestBodySize = (uploadData = []) => {
  return uploadData.reduce((acc, item) => {
    if (item.bytes) {
      return acc + Buffer.byteLength(Buffer.from(item.bytes))
    }

    return acc
  }, 0)
}

const ensureHarRequest = (requestId, details = {}) => {
  const existingEntry = activeHarRequests.get(requestId)
  if (existingEntry) {
    return existingEntry
  }

  const entry = {
    requestId,
    startedAt: details.timestamp ?? Date.now(),
    startedDateTime: new Date(details.timestamp ?? Date.now()).toISOString(),
    url: details.url ?? '',
    method: details.method ?? 'GET',
    resourceType: details.resourceType ?? 'unknown',
    referrer: details.referrer,
    webContentsId: details.webContentsId,
    frame: {
      frame: details.frame,
      frameRoutingId: details.frameRoutingId,
      frameProcessId: details.frameProcessId,
      parentFrameRoutingId: details.parentFrameRoutingId,
      parentFrameProcessId: details.parentFrameProcessId,
    },
    requestHeaders: {},
    requestBodySize: 0,
    requestUploadData: [],
    responseHeaders: {},
    responseStatusCode: undefined,
    responseStatusLine: undefined,
    responseFromCache: false,
    responseIPAddress: undefined,
    responseMimeType: undefined,
    responseCharset: undefined,
    redirectURL: undefined,
    responseStartedAt: undefined,
    completedAt: undefined,
    error: undefined,
  }

  activeHarRequests.set(requestId, entry)
  return entry
}

const pushCompletedHarRequest = (entry) => {
  completedHarRequests.push(entry)

  if (completedHarRequests.length > HAR_CAPTURE_LIMIT) {
    completedHarRequests.splice(0, completedHarRequests.length - HAR_CAPTURE_LIMIT)
  }
}

const finalizeHarRequest = (requestId, patch = {}) => {
  const entry = activeHarRequests.get(requestId)
  if (!entry) {
    return
  }

  const completedEntry = {
    ...entry,
    ...patch,
    completedAt: patch.completedAt ?? Date.now(),
  }

  activeHarRequests.delete(requestId)
  pushCompletedHarRequest(completedEntry)
}

export const trackDiagnosticEvent = (message, options = {}) => {
  return appendRecord({
    message,
    ...options,
  })
}

export const installMainProcessConsoleCapture = () => {
  const consoleMethods = ['log', 'info', 'warn', 'error', 'debug']

  consoleMethods.forEach((method) => {
    const originalMethod = console[method].bind(console)

    console[method] = (...args) => {
      appendRecord({
        category: DIAGNOSTIC_CATEGORIES.SYSTEM,
        level: method,
        source: 'electron-main-console',
        message: args.map((arg) => {
          if (typeof arg === 'string') {
            return arg
          }

          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        }).join(' '),
        payload: args.map((arg) => toDiagnosticValue(arg)),
        tags: ['main-process-console'],
      })

      originalMethod(...args)
    }
  })
}

const filterRecordsByRequest = (filter = {}) => {
  const selectedCategories = Array.isArray(filter.categories) && filter.categories.length
    ? filter.categories
    : Object.values(DIAGNOSTIC_CATEGORIES)

  const fromMs = filter.period?.from ? Date.parse(filter.period.from) : Number.NEGATIVE_INFINITY
  const toMs = filter.period?.to ? Date.parse(filter.period.to) : Number.POSITIVE_INFINITY
  const search = typeof filter.search === 'string' ? filter.search.trim().toLowerCase() : ''

  const filtered = records.filter((record) => {
    const timestampMs = Date.parse(record.timestamp)

    if (!selectedCategories.includes(record.category)) {
      return false
    }

    if (timestampMs < fromMs || timestampMs > toMs) {
      return false
    }

    if (!search) {
      return true
    }

    const haystack = `${record.message} ${JSON.stringify(record.payload ?? '')}`.toLowerCase()
    return haystack.includes(search)
  })

  const limited = typeof filter.limit === 'number' && filter.limit > 0
    ? filtered.slice(-filter.limit)
    : filtered

  return selectedCategories.map((category) => {
    const categoryRecords = limited.filter((record) => record.category === category)

    return {
      category,
      records: categoryRecords,
      total: categoryRecords.length,
    }
  })
}

export const createMainDiagnosticsSnapshot = (request = {}, metadata = {}) => {
  const period = request.filter?.period ?? {
    from: new Date(0).toISOString(),
    to: new Date().toISOString(),
    preset: 'custom',
  }

  const snapshot = {
    version: DIAGNOSTIC_SNAPSHOT_VERSION,
    platform: DIAGNOSTIC_PLATFORM,
    period,
    metadata: {
      appVersion: metadata.appVersion ?? '',
      platform: metadata.platform ?? process.platform,
      collectedAt: new Date().toISOString(),
      route: metadata.route,
      hostname: metadata.hostname,
      userLogin: metadata.userLogin,
      userNumber: metadata.userNumber,
      networkState: metadata.networkState ?? 'unknown',
    },
    categories: filterRecordsByRequest(request.filter),
    artifacts: {
      networkHar: buildDiagnosticHarArtifact(getCapturedHarRequests(), {
        filter: request.filter,
        appVersion: metadata.appVersion,
        electronVersion: process.versions.electron,
        collectedAt: new Date().toISOString(),
      }),
    },
  }

  return redactDiagnosticSnapshot(snapshot)
}

export const installHarNetworkCapture = (session) => {
  if (harNetworkCaptureInstalled || !session?.webRequest) {
    return
  }

  harNetworkCaptureInstalled = true

  session.webRequest.onBeforeRequest((details, callback) => {
    const entry = ensureHarRequest(details.id, details)
    entry.url = details.url
    entry.method = details.method
    entry.resourceType = details.resourceType
    entry.referrer = details.referrer
    entry.startedAt = details.timestamp ?? entry.startedAt
    entry.startedDateTime = new Date(entry.startedAt).toISOString()
    entry.requestBodySize = getRequestBodySize(details.uploadData)
    entry.requestUploadData = toUploadDataPreview(details.uploadData)
    callback({})
  })

  session.webRequest.onBeforeSendHeaders((details, callback) => {
    const entry = ensureHarRequest(details.id, details)
    entry.requestHeaders = cloneHeaders(details.requestHeaders)
    callback({ requestHeaders: details.requestHeaders })
  })

  session.webRequest.onSendHeaders((details) => {
    const entry = ensureHarRequest(details.id, details)
    entry.requestHeaders = cloneHeaders(details.requestHeaders)
  })

  session.webRequest.onHeadersReceived((details, callback) => {
    const entry = ensureHarRequest(details.id, details)
    entry.responseHeaders = cloneHeaders(details.responseHeaders)
    entry.responseStatusCode = details.statusCode
    entry.responseStatusLine = details.statusLine
    entry.responseMimeType = details.mimeType
    entry.responseCharset = details.charset
    callback({ responseHeaders: details.responseHeaders })
  })

  session.webRequest.onResponseStarted((details) => {
    const entry = ensureHarRequest(details.id, details)
    entry.responseHeaders = cloneHeaders(details.responseHeaders)
    entry.responseStatusCode = details.statusCode
    entry.responseStatusLine = details.statusLine
    entry.responseFromCache = Boolean(details.fromCache)
    entry.responseIPAddress = details.ip
    entry.responseStartedAt = details.timestamp ?? Date.now()
  })

  session.webRequest.onBeforeRedirect((details) => {
    const entry = ensureHarRequest(details.id, details)
    entry.responseHeaders = cloneHeaders(details.responseHeaders)
    entry.responseStatusCode = details.statusCode
    entry.responseStatusLine = details.statusLine
    finalizeHarRequest(details.id, {
      redirectURL: details.redirectURL,
      completedAt: details.timestamp ?? Date.now(),
    })
  })

  session.webRequest.onCompleted((details) => {
    const entry = ensureHarRequest(details.id, details)
    entry.responseHeaders = cloneHeaders(details.responseHeaders)
    entry.responseStatusCode = details.statusCode
    entry.responseStatusLine = details.statusLine
    entry.responseFromCache = Boolean(details.fromCache)
    entry.responseIPAddress = details.ip
    finalizeHarRequest(details.id, {
      completedAt: details.timestamp ?? Date.now(),
    })
  })

  session.webRequest.onErrorOccurred((details) => {
    finalizeHarRequest(details.id, {
      error: details.error,
      completedAt: details.timestamp ?? Date.now(),
    })
  })

  trackDiagnosticEvent('Electron HAR network capture installed', {
    source: 'electron-main-network',
    category: DIAGNOSTIC_CATEGORIES.NETWORK,
    tags: ['har-capture'],
  })
}

export const getCapturedHarRequests = () => {
  return completedHarRequests.map((entry) => ({
    ...entry,
    requestHeaders: cloneHeaders(entry.requestHeaders),
    responseHeaders: cloneHeaders(entry.responseHeaders),
    requestUploadData: entry.requestUploadData.map((item) => ({ ...item })),
  }))
}

export const registerDiagnosticsIpcHandlers = ({ app, ipcMain }) => {
  ipcMain.handle(DIAGNOSTIC_IPC_CHANNELS.GET_SNAPSHOT, (_, request = {}) => {
    return createMainDiagnosticsSnapshot(request, {
      appVersion: app.getVersion(),
      platform: process.platform,
    })
  })
}
