export type StandConfigMode = 'optimistic' | 'manual'

export type StandConfig = {
  host: string | null
  rtuBaseUrl: string | null
  apsBaseUrl: string | null
  mode: StandConfigMode | null
}

export type StandPingFailure = 'none' | 'rtu' | 'aps' | 'both' | 'identity'

export type StandPingTargetResult = {
  ok: boolean
  url: string | null
  statusCode: number | null
  error: string | null
  identity: 'aps' | 'unknown' | null
}

export type StandPingRequest = {
  host?: string | null
  rtuBaseUrl?: string | null
  apsBaseUrl?: string | null
}

export type StandPingResult = {
  ok: boolean
  mode: StandConfigMode
  host: string | null
  rtuBaseUrl: string | null
  apsBaseUrl: string | null
  rtu: StandPingTargetResult
  aps: StandPingTargetResult
  failure: StandPingFailure
}
