export const DIAGNOSTIC_SNAPSHOT_VERSION = 1 as const
export const DIAGNOSTIC_PLATFORM = 'electron' as const

export const diagnosticCategories = {
  CONSOLE: 'console',
  NETWORK: 'network',
  WEBSOCKET: 'websocket',
  WEB_RTC: 'webrtc',
  SYSTEM: 'system',
  APP_METADATA: 'app-metadata',
} as const

export const diagnosticLogLevels = {
  LOG: 'log',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
} as const

export const diagnosticPeriodPresets = {
  LAST_15_MINUTES: 'last-15-minutes',
  LAST_HOUR: 'last-hour',
  LAST_24_HOURS: 'last-24-hours',
  CUSTOM: 'custom',
} as const

export type DiagnosticCategory = typeof diagnosticCategories[keyof typeof diagnosticCategories]
export type DiagnosticLogLevel = typeof diagnosticLogLevels[keyof typeof diagnosticLogLevels]
export type DiagnosticPeriodPreset = typeof diagnosticPeriodPresets[keyof typeof diagnosticPeriodPresets]
export type DiagnosticPlatform = typeof DIAGNOSTIC_PLATFORM

export type DiagnosticPrimitive = string | number | boolean | null
export type DiagnosticValue = DiagnosticPrimitive | DiagnosticValue[] | { [key: string]: DiagnosticValue }

export type DiagnosticHarNameValuePair = {
  name: string,
  value: string,
}

export type DiagnosticHarCookie = DiagnosticHarNameValuePair & {
  path?: string,
  domain?: string,
  expires?: string | null,
  httpOnly?: boolean,
  secure?: boolean,
  sameSite?: string,
}

export type DiagnosticHarPostData = {
  mimeType: string,
  text?: string,
  params?: DiagnosticHarNameValuePair[],
}

export type DiagnosticHarContent = {
  size: number,
  mimeType: string,
  text?: string,
  encoding?: string,
}

export type DiagnosticHarRequest = {
  method: string,
  url: string,
  httpVersion: string,
  cookies: DiagnosticHarCookie[],
  headers: DiagnosticHarNameValuePair[],
  queryString: DiagnosticHarNameValuePair[],
  headersSize: number,
  bodySize: number,
  postData?: DiagnosticHarPostData,
}

export type DiagnosticHarResponse = {
  status: number,
  statusText: string,
  httpVersion: string,
  cookies: DiagnosticHarCookie[],
  headers: DiagnosticHarNameValuePair[],
  content: DiagnosticHarContent,
  redirectURL: string,
  headersSize: number,
  bodySize: number,
}

export type DiagnosticHarTimings = {
  blocked?: number,
  dns?: number,
  connect?: number,
  send: number,
  wait: number,
  receive: number,
  ssl?: number,
}

export type DiagnosticHarEntry = {
  startedDateTime: string,
  time: number,
  request: DiagnosticHarRequest,
  response: DiagnosticHarResponse,
  cache: Record<string, DiagnosticValue>,
  timings: DiagnosticHarTimings,
  pageref?: string,
  serverIPAddress?: string,
  connection?: string,
  comment?: string,
}

export type DiagnosticHarPageTimings = {
  onContentLoad?: number,
  onLoad?: number,
}

export type DiagnosticHarPage = {
  startedDateTime: string,
  id: string,
  title: string,
  pageTimings: DiagnosticHarPageTimings,
}

export type DiagnosticHarLog = {
  version: string,
  creator: {
    name: string,
    version: string,
  },
  browser?: {
    name: string,
    version: string,
  },
  pages?: DiagnosticHarPage[],
  entries: DiagnosticHarEntry[],
  comment?: string,
}

export type DiagnosticHarArtifact = {
  collectedAt: string,
  entryCount: number,
  log: DiagnosticHarLog,
}

export type DiagnosticSnapshotArtifacts = {
  networkHar: DiagnosticHarArtifact | null,
}

export type DiagnosticLogRecord = {
  id: string,
  timestamp: string,
  category: DiagnosticCategory,
  level: DiagnosticLogLevel,
  source: string,
  message: string,
  payload?: DiagnosticValue,
  tags?: string[],
}

export type DiagnosticTimeRange = {
  from: string,
  to: string,
  preset: DiagnosticPeriodPreset,
}

export type DiagnosticLogFilter = {
  categories?: DiagnosticCategory[],
  period: DiagnosticTimeRange,
  limit?: number,
  search?: string,
}

export type DiagnosticCategorySnapshot = {
  category: DiagnosticCategory,
  records: DiagnosticLogRecord[],
  total: number,
}

export type DiagnosticAppMetadata = {
  appVersion: string,
  platform: string,
  collectedAt: string,
  route?: string,
  hostname?: string,
  userLogin?: string,
  userNumber?: string,
  networkState?: 'online' | 'offline' | 'unknown',
}

export type DiagnosticSnapshot = {
  version: typeof DIAGNOSTIC_SNAPSHOT_VERSION,
  platform: DiagnosticPlatform,
  period: DiagnosticTimeRange,
  metadata: DiagnosticAppMetadata,
  categories: DiagnosticCategorySnapshot[],
  artifacts: DiagnosticSnapshotArtifacts,
}

export type DiagnosticSnapshotRequest = {
  filter: DiagnosticLogFilter,
}
