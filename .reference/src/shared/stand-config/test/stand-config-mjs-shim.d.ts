declare module '*stand-config.mjs' {
  export const normalizeStandConfig: (input: unknown) => {
    host: string | null
    rtuBaseUrl: string | null
    apsBaseUrl: string | null
    mode: 'optimistic' | 'manual' | null
  } | null

  export const normalizeHostInput: (raw: unknown) => string | null
  export const normalizeBaseUrlInput: (raw: unknown) => string | null

  export const resolveFailure: (
    rtu: {
      ok: boolean
      url: string | null
      statusCode: number | null
      error: string | null
      identity: string | null
    },
    aps: {
      ok: boolean
      url: string | null
      statusCode: number | null
      error: string | null
      identity: string | null
    },
  ) => 'none' | 'rtu' | 'aps' | 'both' | 'identity'
}
