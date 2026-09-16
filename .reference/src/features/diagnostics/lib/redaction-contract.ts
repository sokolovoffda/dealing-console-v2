import type { DiagnosticCategory, DiagnosticValue } from '../model'

export const DIAGNOSTIC_REDACTION_MASK = '[REDACTED]' as const

export const diagnosticSensitiveKeys = [
  'password',
  'pass',
  'pwd',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'apiKey',
  'sessionId',
  'sipAuthorization',
] as const

export type DiagnosticRedactionScope = 'message' | 'payload' | 'metadata' | 'har'
export type DiagnosticSensitiveKey = typeof diagnosticSensitiveKeys[number]

export type DiagnosticRedactionContext = {
  category: DiagnosticCategory,
  source: string,
  scope: DiagnosticRedactionScope,
}

export type DiagnosticRedactionRule = {
  name: string,
  keys?: DiagnosticSensitiveKey[],
  patterns?: RegExp[],
  scopes?: DiagnosticRedactionScope[],
  replacement?: string,
}

export type DiagnosticRedactor = <T extends DiagnosticValue | string | undefined>(
  value: T,
  context: DiagnosticRedactionContext,
  rules?: DiagnosticRedactionRule[],
) => T
