import type {
  DiagnosticAppMetadata,
  DiagnosticCategorySnapshot,
  DiagnosticHarArtifact,
  DiagnosticLogRecord,
  DiagnosticSnapshot,
  DiagnosticValue,
} from '../model'

import {
  DIAGNOSTIC_REDACTION_MASK,
  diagnosticSensitiveKeys,
  type DiagnosticRedactionContext,
  type DiagnosticRedactionRule,
  type DiagnosticRedactor,
} from './redaction-contract'


const defaultDiagnosticRedactionRules: DiagnosticRedactionRule[] = [
  {
    name: 'sensitive-keys',
    keys: [ ...diagnosticSensitiveKeys ],
  },
  {
    name: 'bearer-token',
    patterns: [ /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi ],
    scopes: ['message', 'payload', 'metadata', 'har'],
  },
  {
    name: 'basic-auth',
    patterns: [ /Basic\s+[A-Za-z0-9+/=]+/gi ],
    scopes: ['message', 'payload', 'metadata', 'har'],
  },
  {
    name: 'query-secret',
    patterns: [ /([?&](?:token|access_token|refresh_token|password|api[_-]?key)=)[^&\s]+/gi ],
    scopes: ['message', 'payload', 'metadata', 'har'],
  },
  {
    name: 'json-secret',
    patterns: [ /("(?:token|access_token|refresh_token|password|api[_-]?key)"\s*:\s*")[^"]+(")/gi ],
    scopes: ['message', 'payload', 'metadata', 'har'],
  },
  {
    name: 'cookie-like',
    patterns: [ /((?:^|;\s*)(?:token|session|sid|jwt|refresh_token|access_token)=[^;]+)/gi ],
    scopes: ['message', 'payload', 'metadata', 'har'],
  },
]

const shouldApplyRuleToScope = (rule: DiagnosticRedactionRule, scope: DiagnosticRedactionContext['scope']): boolean => {
  return !rule.scopes?.length || rule.scopes.includes(scope)
}

const redactStringByRules = (
  value: string,
  context: DiagnosticRedactionContext,
  rules: DiagnosticRedactionRule[],
): string => {
  return rules.reduce((acc, rule) => {
    if (!rule.patterns?.length || !shouldApplyRuleToScope(rule, context.scope)) {
      return acc
    }

    return rule.patterns.reduce((inner, pattern) => {
      return inner.replace(pattern, (match, prefix) => {
        if (typeof prefix === 'string') {
          return `${prefix}${rule.replacement ?? DIAGNOSTIC_REDACTION_MASK}`
        }

        return rule.replacement ?? DIAGNOSTIC_REDACTION_MASK
      })
    }, acc)
  }, value)
}

const isSensitiveKey = (key: string, rules: DiagnosticRedactionRule[]): boolean => {
  const normalizedKey = key.toLowerCase()

  return rules.some((rule) => {
    return rule.keys?.some((sensitiveKey) => sensitiveKey.toLowerCase() === normalizedKey)
  })
}

export const redactDiagnosticValue = (
  value: DiagnosticValue | undefined,
  context: DiagnosticRedactionContext,
  rules: DiagnosticRedactionRule[] = defaultDiagnosticRedactionRules,
): DiagnosticValue | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return redactStringByRules(value, context, rules)
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactDiagnosticValue(item, context, rules) ?? null)
  }

  return Object.entries(value).reduce<Record<string, DiagnosticValue>>((acc, [key, entryValue]) => {
    if (isSensitiveKey(key, rules)) {
      acc[key] = DIAGNOSTIC_REDACTION_MASK
      return acc
    }

    if (
      key === 'value'
      && typeof entryValue === 'string'
      && typeof value.name === 'string'
      && isSensitiveKey(value.name, rules)
    ) {
      acc[key] = DIAGNOSTIC_REDACTION_MASK
      return acc
    }

    acc[key] = redactDiagnosticValue(entryValue, context, rules) ?? null
    return acc
  }, {})
}

export const redactDiagnosticRecord = (
  record: DiagnosticLogRecord,
  rules: DiagnosticRedactionRule[] = defaultDiagnosticRedactionRules,
): DiagnosticLogRecord => {
  const baseContext = {
    category: record.category,
    source: record.source,
  } as const

  return {
    ...record,
    message: redactStringByRules(record.message, { ...baseContext, scope: 'message' }, rules),
    payload: redactDiagnosticValue(record.payload, { ...baseContext, scope: 'payload' }, rules),
  }
}

export const redactDiagnosticMetadata = (
  metadata: DiagnosticAppMetadata,
  rules: DiagnosticRedactionRule[] = defaultDiagnosticRedactionRules,
): DiagnosticAppMetadata => {
  const redacted = redactDiagnosticValue(metadata as DiagnosticValue, {
    category: 'app-metadata',
    source: 'diagnostic-snapshot',
    scope: 'metadata',
  }, rules)

  return redacted as DiagnosticAppMetadata
}

export const redactDiagnosticCategories = (
  categories: DiagnosticCategorySnapshot[],
  rules: DiagnosticRedactionRule[] = defaultDiagnosticRedactionRules,
): DiagnosticCategorySnapshot[] => {
  return categories.map((category) => ({
    ...category,
    records: category.records.map((record) => redactDiagnosticRecord(record, rules)),
  }))
}

export const redactDiagnosticHarArtifact = (
  harArtifact: DiagnosticHarArtifact | null,
  rules: DiagnosticRedactionRule[] = defaultDiagnosticRedactionRules,
): DiagnosticHarArtifact | null => {
  if (!harArtifact) {
    return null
  }

  const redactedLog = redactDiagnosticValue(harArtifact.log as DiagnosticValue, {
    category: 'network',
    source: 'diagnostic-har',
    scope: 'har',
  }, rules)

  return {
    ...harArtifact,
    log: redactedLog as DiagnosticHarArtifact['log'],
  }
}

export const redactDiagnosticSnapshot = (
  snapshot: DiagnosticSnapshot,
  rules: DiagnosticRedactionRule[] = defaultDiagnosticRedactionRules,
): DiagnosticSnapshot => {
  return {
    ...snapshot,
    metadata: redactDiagnosticMetadata(snapshot.metadata, rules),
    categories: redactDiagnosticCategories(snapshot.categories, rules),
    artifacts: {
      ...snapshot.artifacts,
      networkHar: redactDiagnosticHarArtifact(snapshot.artifacts.networkHar, rules),
    },
  }
}

export const redactDiagnosticString: DiagnosticRedactor = (value, context, rules = defaultDiagnosticRedactionRules) => {
  if (typeof value !== 'string') {
    return value
  }

  return redactStringByRules(value, context, rules) as typeof value
}

export { defaultDiagnosticRedactionRules }
