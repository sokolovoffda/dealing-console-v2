import type { DiagnosticValue } from '../model'

export const normalizeDiagnosticValue = (value: unknown): DiagnosticValue => {
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
    return value.map((item) => normalizeDiagnosticValue(item))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
      return [key, normalizeDiagnosticValue(entryValue)] as const
    })

    return Object.fromEntries(entries)
  }

  return String(value)
}
