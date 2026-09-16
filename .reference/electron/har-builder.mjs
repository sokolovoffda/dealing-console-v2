const HAR_VERSION = '1.2'
const DEFAULT_HTTP_VERSION = 'HTTP/1.1'
const DEFAULT_CONTENT_MIME_TYPE = 'application/octet-stream'
const HAR_CREATOR_NAME = 'dispatch-console-ui diagnostics'
const HAR_BROWSER_NAME = 'Electron'

const toHeaderEntries = (headers = {}) => {
  if (!headers || typeof headers !== 'object') {
    return []
  }

  return Object.entries(headers).flatMap(([name, value]) => {
    if (Array.isArray(value)) {
      return value.map((item) => ({
        name,
        value: item == null ? '' : String(item),
      }))
    }

    return [{
      name,
      value: value == null ? '' : String(value),
    }]
  })
}

const getHeaderValues = (headers = {}, headerName) => {
  const targetHeaderName = headerName.toLowerCase()

  return Object.entries(headers).flatMap(([name, value]) => {
    if (name.toLowerCase() !== targetHeaderName) {
      return []
    }

    if (Array.isArray(value)) {
      return value.map((item) => item == null ? '' : String(item))
    }

    return [value == null ? '' : String(value)]
  })
}

const getFirstHeaderValue = (headers = {}, headerName) => {
  return getHeaderValues(headers, headerName)[0] ?? ''
}

const toHarQueryString = (urlString) => {
  try {
    const url = new URL(urlString)

    return Array.from(url.searchParams.entries()).map(([name, value]) => ({
      name,
      value,
    }))
  } catch {
    return []
  }
}

const parseCookieHeader = (headerValue = '') => {
  if (!headerValue) {
    return []
  }

  return headerValue
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf('=')

      if (separatorIndex === -1) {
        return {
          name: part,
          value: '',
        }
      }

      return {
        name: part.slice(0, separatorIndex).trim(),
        value: part.slice(separatorIndex + 1).trim(),
      }
    })
}

const parseSetCookieHeader = (headerValue = '') => {
  if (!headerValue) {
    return null
  }

  const [cookiePart, ...attributeParts] = headerValue
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  if (!cookiePart) {
    return null
  }

  const separatorIndex = cookiePart.indexOf('=')

  const cookie = {
    name: separatorIndex === -1 ? cookiePart : cookiePart.slice(0, separatorIndex).trim(),
    value: separatorIndex === -1 ? '' : cookiePart.slice(separatorIndex + 1).trim(),
  }

  attributeParts.forEach((attribute) => {
    const [rawName, ...rawValueParts] = attribute.split('=')
    const name = rawName.trim().toLowerCase()
    const value = rawValueParts.join('=').trim()

    if (name === 'path') {
      cookie.path = value
      return
    }

    if (name === 'domain') {
      cookie.domain = value
      return
    }

    if (name === 'expires') {
      cookie.expires = value || null
      return
    }

    if (name === 'samesite') {
      cookie.sameSite = value
      return
    }

    if (name === 'httponly') {
      cookie.httpOnly = true
      return
    }

    if (name === 'secure') {
      cookie.secure = true
    }
  })

  return cookie
}

const parseResponseCookies = (headers = {}) => {
  return getHeaderValues(headers, 'set-cookie')
    .map((value) => parseSetCookieHeader(value))
    .filter(Boolean)
}

const resolveHttpVersion = (statusLine = '') => {
  const match = /^(\S+)/.exec(statusLine.trim())
  return match?.[1] ?? DEFAULT_HTTP_VERSION
}

const resolveStatusText = (statusLine = '') => {
  const match = /^\S+\s+\d+\s*(.*)$/.exec(statusLine.trim())
  return match?.[1] ?? ''
}

const resolveMimeType = (requestHeaders = {}, responseHeaders = {}, fallbackMimeType) => {
  const responseContentType = getFirstHeaderValue(responseHeaders, 'content-type')
  const requestContentType = getFirstHeaderValue(requestHeaders, 'content-type')
  const rawMimeType = fallbackMimeType || responseContentType || requestContentType

  if (!rawMimeType) {
    return DEFAULT_CONTENT_MIME_TYPE
  }

  return rawMimeType.split(';')[0].trim() || DEFAULT_CONTENT_MIME_TYPE
}

const resolveResponseBodySize = (responseHeaders = {}) => {
  const contentLength = Number.parseInt(getFirstHeaderValue(responseHeaders, 'content-length'), 10)
  return Number.isFinite(contentLength) ? contentLength : -1
}

const resolveResponseContentSize = (responseHeaders = {}) => {
  const contentLength = Number.parseInt(getFirstHeaderValue(responseHeaders, 'content-length'), 10)
  return Number.isFinite(contentLength) ? contentLength : 0
}

const buildPostData = (requestHeaders = {}, requestUploadData = []) => {
  if (!Array.isArray(requestUploadData) || requestUploadData.length === 0) {
    return undefined
  }

  const mimeType = resolveMimeType(requestHeaders, {}, '')
  const textParts = requestUploadData
    .filter((item) => item.type === 'bytes' && typeof item.textPreview === 'string')
    .map((item) => item.textPreview)

  const postData = {
    mimeType,
  }

  if (textParts.length) {
    postData.text = textParts.join('\n')
  }

  return postData
}

const toHarEntry = (request) => {
  const startedAt = Number.isFinite(request.startedAt) ? request.startedAt : Date.parse(request.startedDateTime)
  const responseStartedAt = Number.isFinite(request.responseStartedAt) ? request.responseStartedAt : startedAt
  const completedAt = Number.isFinite(request.completedAt) ? request.completedAt : responseStartedAt

  const wait = Math.max(responseStartedAt - startedAt, 0)
  const receive = Math.max(completedAt - responseStartedAt, 0)
  const requestHeaders = request.requestHeaders ?? {}
  const responseHeaders = request.responseHeaders ?? {}
  const status = Number.isFinite(request.responseStatusCode) ? request.responseStatusCode : 0
  const statusLine = request.responseStatusLine ?? ''
  const responseBodySize = resolveResponseBodySize(responseHeaders)
  const responseContentSize = resolveResponseContentSize(responseHeaders)
  const mimeType = resolveMimeType(requestHeaders, responseHeaders, request.responseMimeType)
  const requestCookies = getHeaderValues(requestHeaders, 'cookie').flatMap((value) => parseCookieHeader(value))
  const responseCookies = parseResponseCookies(responseHeaders)
  const commentParts = [
    request.resourceType ? `resourceType=${request.resourceType}` : '',
    request.responseFromCache ? 'fromCache=true' : '',
    request.error ? `error=${request.error}` : '',
  ].filter(Boolean)

  return {
    startedDateTime: request.startedDateTime ?? new Date(startedAt).toISOString(),
    time: Math.max(completedAt - startedAt, 0),
    request: {
      method: request.method ?? 'GET',
      url: request.url ?? '',
      httpVersion: resolveHttpVersion(statusLine),
      cookies: requestCookies,
      headers: toHeaderEntries(requestHeaders),
      queryString: toHarQueryString(request.url),
      headersSize: -1,
      bodySize: request.requestBodySize ?? 0,
      postData: buildPostData(requestHeaders, request.requestUploadData),
    },
    response: {
      status,
      statusText: resolveStatusText(statusLine),
      httpVersion: resolveHttpVersion(statusLine),
      cookies: responseCookies,
      headers: toHeaderEntries(responseHeaders),
      content: {
        size: responseContentSize,
        mimeType,
      },
      redirectURL: request.redirectURL ?? '',
      headersSize: -1,
      bodySize: responseBodySize,
    },
    cache: {},
    timings: {
      send: 0,
      wait,
      receive,
    },
    serverIPAddress: request.responseIPAddress,
    comment: commentParts.length ? commentParts.join('; ') : undefined,
  }
}

const shouldIncludeHar = (filter = {}) => {
  if (!Array.isArray(filter.categories) || filter.categories.length === 0) {
    return true
  }

  return filter.categories.includes('network')
}

const filterHarRequests = (requests, filter = {}) => {
  const fromMs = filter.period?.from ? Date.parse(filter.period.from) : Number.NEGATIVE_INFINITY
  const toMs = filter.period?.to ? Date.parse(filter.period.to) : Number.POSITIVE_INFINITY
  const search = typeof filter.search === 'string' ? filter.search.trim().toLowerCase() : ''

  const filteredRequests = requests.filter((request) => {
    const startedAt = Number.isFinite(request.startedAt)
      ? request.startedAt
      : Date.parse(request.startedDateTime ?? '')

    if (startedAt < fromMs || startedAt > toMs) {
      return false
    }

    if (!search) {
      return true
    }

    const haystack = [
      request.method,
      request.url,
      request.resourceType,
      request.responseStatusLine,
      request.error,
    ].filter(Boolean).join(' ').toLowerCase()

    return haystack.includes(search)
  })

  const sortedRequests = filteredRequests.sort((left, right) => {
    return (left.startedAt ?? 0) - (right.startedAt ?? 0)
  })

  if (typeof filter.limit === 'number' && filter.limit > 0) {
    return sortedRequests.slice(-filter.limit)
  }

  return sortedRequests
}

export const buildDiagnosticHarArtifact = (requests = [], options = {}) => {
  const filter = options.filter ?? {}

  if (!shouldIncludeHar(filter)) {
    return null
  }

  const filteredRequests = filterHarRequests([ ...requests ], filter)

  return {
    collectedAt: options.collectedAt ?? new Date().toISOString(),
    entryCount: filteredRequests.length,
    log: {
      version: HAR_VERSION,
      creator: {
        name: HAR_CREATOR_NAME,
        version: options.appVersion ?? '0.0.0',
      },
      browser: {
        name: HAR_BROWSER_NAME,
        version: options.electronVersion ?? 'unknown',
      },
      entries: filteredRequests.map((request) => toHarEntry(request)),
      comment: options.comment,
    },
  }
}
