import type {
  DiagnosticHarArtifact,
  DiagnosticLogFilter,
} from '../src/features/diagnostics/model/types'

type CapturedHarUploadDataItem = {
  type: string,
  file?: string,
  blobUUID?: string,
  bytesLength?: number,
  textPreview?: string,
}

type CapturedHarRequest = {
  requestId: number | string,
  startedAt?: number,
  startedDateTime?: string,
  completedAt?: number,
  responseStartedAt?: number,
  url?: string,
  method?: string,
  resourceType?: string,
  requestHeaders?: Record<string, string | string[]>,
  requestBodySize?: number,
  requestUploadData?: CapturedHarUploadDataItem[],
  responseHeaders?: Record<string, string | string[]>,
  responseStatusCode?: number,
  responseStatusLine?: string,
  responseFromCache?: boolean,
  responseIPAddress?: string,
  responseMimeType?: string,
  redirectURL?: string,
  error?: string,
}

type BuildDiagnosticHarArtifactOptions = {
  filter?: Partial<DiagnosticLogFilter>,
  appVersion?: string,
  electronVersion?: string,
  collectedAt?: string,
  comment?: string,
}

export function buildDiagnosticHarArtifact(
  requests?: CapturedHarRequest[],
  options?: BuildDiagnosticHarArtifactOptions,
): DiagnosticHarArtifact | null
