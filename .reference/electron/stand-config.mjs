import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'

export const STAND_CONFIG_IPC_CHANNELS = {
  GET: 'standConfig:get',
  SET: 'standConfig:set',
  PING: 'standConfig:ping',
}

const STAND_CONFIG_FILE_NAME = 'config.json'
const STAND_CONFIG_MODES = new Set(['optimistic', 'manual'])
const PING_TIMEOUT_MS = 5_000
const APS_DEFAULT_PORT = 3000
const RTU_DEFAULT_PORT = 6001
const APS_HEALTH_PATH = '/api/health'
const RTU_PROBE_PATH = '/api/user/login'
const APS_SERVICE_NAME = 'dealing-admin'

const getConfigFilePath = (app) => path.join(app.getPath('userData'), STAND_CONFIG_FILE_NAME)

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const normalizeMode = (value) => {
  if (typeof value !== 'string') {
    return null
  }

  return STAND_CONFIG_MODES.has(value) ? value : null
}

export const normalizeStandConfig = (input) => {
  if (!input || typeof input !== 'object') {
    return null
  }

  const host = normalizeOptionalString(input.host)
  const rtuBaseUrl = normalizeOptionalString(input.rtuBaseUrl)
  const apsBaseUrl = normalizeOptionalString(input.apsBaseUrl)
  const mode = normalizeMode(input.mode)

  if (!rtuBaseUrl && !apsBaseUrl && !host && !mode) {
    return null
  }

  return {
    host,
    rtuBaseUrl,
    apsBaseUrl,
    mode,
  }
}

export const readStandConfig = (app) => {
  const filePath = getConfigFilePath(app)

  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return normalizeStandConfig(parsed)
  } catch (error) {
    console.error('[stand-config] failed to read config.json', error)
    return null
  }
}

export const writeStandConfig = (app, input) => {
  const normalized = normalizeStandConfig(input)
  if (!normalized) {
    throw new Error('Invalid stand config payload')
  }

  const filePath = getConfigFilePath(app)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}

const stripTrailingSlashes = (value) => value.replace(/\/+$/, '')

export const normalizeHostInput = (raw) => {
  const value = normalizeOptionalString(raw)
  if (!value) {
    return null
  }

  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).hostname
    }
  } catch {
    // fall through
  }

  const withoutPath = value.split('/')[0] ?? value
  // IPv4/hostname:port → hostname. IPv6 in brackets not supported in optimistic MVP.
  if (/^\[[^\]]+\]/.test(withoutPath)) {
    return withoutPath.replace(/\]:\d+$/, ']')
  }

  return withoutPath.replace(/:\d+$/, '')
}

export const normalizeBaseUrlInput = (raw) => {
  const value = normalizeOptionalString(raw)
  if (!value) {
    return null
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`

  try {
    const parsed = new URL(withProtocol)
    return stripTrailingSlashes(parsed.origin)
  } catch {
    return null
  }
}

const createFailedTarget = (url, error) => ({
  ok: false,
  url,
  statusCode: null,
  error,
  identity: null,
})

const detectApsIdentity = (body) => {
  if (!body) {
    return null
  }

  try {
    const parsed = JSON.parse(body)
    if (parsed && typeof parsed === 'object' && parsed.service === APS_SERVICE_NAME) {
      return 'aps'
    }
  } catch {
    // not JSON health
  }

  return null
}

const requestGet = (url) => new Promise((resolve) => {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    resolve(createFailedTarget(url, 'Invalid URL'))
    return
  }

  const transport = parsed.protocol === 'https:' ? https : http
  const request = transport.get(url, {
    timeout: PING_TIMEOUT_MS,
    rejectUnauthorized: false,
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  }, (response) => {
    const chunks = []
    let totalSize = 0

    response.on('data', (chunk) => {
      if (totalSize > 64_000) {
        return
      }
      chunks.push(chunk)
      totalSize += chunk.length
    })

    response.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      resolve({
        ok: true,
        url,
        statusCode: response.statusCode ?? null,
        error: null,
        identity: detectApsIdentity(body),
        body,
      })
    })
  })

  request.on('timeout', () => {
    request.destroy()
    resolve(createFailedTarget(url, 'Connection timeout'))
  })

  request.on('error', (error) => {
    resolve(createFailedTarget(url, error instanceof Error ? error.message : 'Request failed'))
  })
})

const probeWithSchemeFallback = async (buildUrl) => {
  const httpUrl = buildUrl('http:')
  const httpResult = await requestGet(httpUrl)
  if (httpResult.ok) {
    return httpResult
  }

  const httpsUrl = buildUrl('https:')
  if (httpsUrl === httpUrl) {
    return httpResult
  }

  const httpsResult = await requestGet(httpsUrl)
  if (httpsResult.ok) {
    return httpsResult
  }

  return {
    ...httpsResult,
    error: `http: ${httpResult.error}; https: ${httpsResult.error}`,
  }
}

const toTargetResult = (probe, role) => {
  if (!probe.ok) {
    return {
      ok: false,
      url: probe.url,
      statusCode: probe.statusCode,
      error: probe.error,
      identity: probe.identity ?? null,
    }
  }

  if (role === 'aps') {
    const isAps = probe.identity === 'aps'
    return {
      ok: isAps,
      url: probe.url,
      statusCode: probe.statusCode,
      error: isAps ? null : 'APS health identity mismatch',
      identity: probe.identity ?? 'unknown',
    }
  }

  // RTU: any HTTP response is reachability OK; APS health on RTU URL = swapped.
  if (probe.identity === 'aps') {
    return {
      ok: false,
      url: probe.url,
      statusCode: probe.statusCode,
      error: 'RTU URL looks like APS (identity mismatch)',
      identity: 'aps',
    }
  }

  return {
    ok: true,
    url: probe.url,
    statusCode: probe.statusCode,
    error: null,
    identity: probe.identity ?? 'unknown',
  }
}

export const resolveFailure = (rtu, aps) => {
  if (rtu.ok && aps.ok) {
    return 'none'
  }

  const identityIssue =
    rtu.identity === 'aps'
    || (aps.error === 'APS health identity mismatch')

  if (identityIssue && (!rtu.ok || !aps.ok)) {
    return 'identity'
  }

  if (!rtu.ok && !aps.ok) {
    return 'both'
  }

  if (!rtu.ok) {
    return 'rtu'
  }

  return 'aps'
}

const originFromProbeUrl = (probeUrl, pathSuffix) => {
  if (!probeUrl) {
    return null
  }

  try {
    const parsed = new URL(probeUrl)
    if (parsed.pathname.endsWith(pathSuffix)) {
      parsed.pathname = parsed.pathname.slice(0, -pathSuffix.length) || '/'
    }
    return stripTrailingSlashes(parsed.origin)
  } catch {
    return null
  }
}

export const pingStandTargets = async (payload = {}) => {
  const host = normalizeHostInput(payload.host)
  const manualRtu = normalizeBaseUrlInput(payload.rtuBaseUrl)
  const manualAps = normalizeBaseUrlInput(payload.apsBaseUrl)
  const isManual = Boolean(manualRtu || manualAps)

  if (isManual && (!manualRtu || !manualAps)) {
    return {
      ok: false,
      mode: 'manual',
      host: null,
      rtuBaseUrl: manualRtu,
      apsBaseUrl: manualAps,
      rtu: createFailedTarget(manualRtu, manualRtu ? null : 'rtuBaseUrl is required'),
      aps: createFailedTarget(manualAps, manualAps ? null : 'apsBaseUrl is required'),
      failure: !manualRtu && !manualAps ? 'both' : (!manualRtu ? 'rtu' : 'aps'),
    }
  }

  if (!isManual && !host) {
    return {
      ok: false,
      mode: 'optimistic',
      host: null,
      rtuBaseUrl: null,
      apsBaseUrl: null,
      rtu: createFailedTarget(null, 'host is required'),
      aps: createFailedTarget(null, 'host is required'),
      failure: 'both',
    }
  }

  const mode = isManual ? 'manual' : 'optimistic'

  const [rtuProbe, apsProbe] = await Promise.all([
    isManual
      ? requestGet(`${manualRtu}${RTU_PROBE_PATH}`)
      : probeWithSchemeFallback((scheme) => `${scheme}//${host}:${RTU_DEFAULT_PORT}${RTU_PROBE_PATH}`),
    isManual
      ? requestGet(`${manualAps}${APS_HEALTH_PATH}`)
      : probeWithSchemeFallback((scheme) => `${scheme}//${host}:${APS_DEFAULT_PORT}${APS_HEALTH_PATH}`),
  ])

  const rtu = toTargetResult(rtuProbe, 'rtu')
  const aps = toTargetResult(apsProbe, 'aps')
  const failure = resolveFailure(rtu, aps)
  const ok = failure === 'none'

  return {
    ok,
    mode,
    host: isManual ? null : host,
    rtuBaseUrl: isManual ? manualRtu : originFromProbeUrl(rtu.url, RTU_PROBE_PATH),
    apsBaseUrl: isManual ? manualAps : originFromProbeUrl(aps.url, APS_HEALTH_PATH),
    rtu,
    aps,
    failure,
  }
}

export const registerStandConfigIpcHandlers = ({ app, ipcMain }) => {
  ipcMain.handle(STAND_CONFIG_IPC_CHANNELS.GET, () => readStandConfig(app))

  ipcMain.handle(STAND_CONFIG_IPC_CHANNELS.SET, (_, payload) => writeStandConfig(app, payload))

  ipcMain.handle(STAND_CONFIG_IPC_CHANNELS.PING, (_, payload) => pingStandTargets(payload))
}
