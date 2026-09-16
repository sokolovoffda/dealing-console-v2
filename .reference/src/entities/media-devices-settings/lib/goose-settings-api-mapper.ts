import type { GooseMicMode, GoosePttScope, GooseSettings, GooseSettingsPutBody } from '../types'

/** Wire DTO: GET/PUT response OpenAPI `GooseSettings` */
export type GooseSettingsApiDto = {
  schemaVersion: 1
  preferredGooseModuleId: string | null
  mode: GooseMicMode
  pttScope: GoosePttScope
}

/** Wire DTO: PUT body OpenAPI `GooseSettingsPutBody` */
export type GooseSettingsApiPutBody = {
  schemaVersion?: 1
  preferredGooseModuleId?: string | null
  mode?: GooseMicMode
  pttScope?: GoosePttScope
}

const GOOSE_MIC_MODES = new Set<GooseMicMode>(['stateful', 'pushToTalk'])
const GOOSE_PTT_SCOPES = new Set<GoosePttScope>(['standard', 'activePinned'])

export const createDefaultGooseSettings = (): GooseSettings => ({
  schemaVersion: 1,
  preferredGooseId: null,
  mode: 'stateful',
  pttScope: 'standard',
})

const normalizePreferredGooseId = (value: string | null | undefined): string | null => {
  if (value == null || value === '') return null
  return value
}

const normalizeGooseMode = (value: unknown, fallback: GooseMicMode): GooseMicMode => {
  if (typeof value === 'string' && GOOSE_MIC_MODES.has(value as GooseMicMode)) {
    return value as GooseMicMode
  }

  if (value !== fallback) {
    console.warn('[goose-settings] Unknown mode from API, fallback applied:', value, '→', fallback)
  }

  return fallback
}

const normalizeGoosePttScope = (value: unknown, fallback: GoosePttScope): GoosePttScope => {
  if (typeof value === 'string' && GOOSE_PTT_SCOPES.has(value as GoosePttScope)) {
    return value as GoosePttScope
  }

  if (value !== fallback) {
    console.warn('[goose-settings] Unknown pttScope from API, fallback applied:', value, '→', fallback)
  }

  return fallback
}

export const normalizeGooseSettingsFromApi = (data: GooseSettingsApiDto): GooseSettings => {
  const defaults = createDefaultGooseSettings()

  return {
    schemaVersion: 1,
    preferredGooseId: normalizePreferredGooseId(data.preferredGooseModuleId),
    mode: normalizeGooseMode(data.mode, defaults.mode),
    pttScope: normalizeGoosePttScope(data.pttScope, defaults.pttScope),
  }
}

export const sanitizeGooseSettingsPutForApi = (body: GooseSettingsPutBody): GooseSettingsApiPutBody => {
  const result: GooseSettingsApiPutBody = {}

  if (body.schemaVersion !== undefined) {
    result.schemaVersion = body.schemaVersion
  }

  if (body.preferredGooseId !== undefined) {
    result.preferredGooseModuleId = normalizePreferredGooseId(body.preferredGooseId)
  }

  if (body.mode !== undefined) {
    result.mode = body.mode
  }

  if (body.pttScope !== undefined) {
    result.pttScope = body.pttScope
  }

  return result
}
