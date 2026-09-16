const DIAGNOSTIC_REDACTION_MASK = '[REDACTED]'

const diagnosticSensitiveKeys = [
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
]

const defaultDiagnosticRedactionRules = [
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

const shouldApplyRuleToScope = (rule, scope) => {
  return !rule.scopes?.length || rule.scopes.includes(scope)
}

const redactStringByRules = (value, context, rules) => {
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

const isSensitiveKey = (key, rules) => {
  const normalizedKey = key.toLowerCase()

  return rules.some((rule) => {
    return rule.keys?.some((sensitiveKey) => sensitiveKey.toLowerCase() === normalizedKey)
  })
}

const redactDiagnosticValue = (value, context, rules = defaultDiagnosticRedactionRules) => {
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

  return Object.entries(value).reduce((acc, [key, entryValue]) => {
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

const redactDiagnosticRecord = (record, rules = defaultDiagnosticRedactionRules) => {
  const baseContext = {
    category: record.category,
    source: record.source,
  }

  return {
    ...record,
    message: redactStringByRules(record.message, { ...baseContext, scope: 'message' }, rules),
    payload: redactDiagnosticValue(record.payload, { ...baseContext, scope: 'payload' }, rules),
  }
}

const redactDiagnosticMetadata = (metadata, rules = defaultDiagnosticRedactionRules) => {
  return redactDiagnosticValue(metadata, {
    category: 'app-metadata',
    source: 'diagnostic-snapshot',
    scope: 'metadata',
  }, rules)
}

const redactDiagnosticHarArtifact = (harArtifact, rules = defaultDiagnosticRedactionRules) => {
  if (!harArtifact) {
    return null
  }

  return {
    ...harArtifact,
    log: redactDiagnosticValue(harArtifact.log, {
      category: 'network',
      source: 'diagnostic-har',
      scope: 'har',
    }, rules),
  }
}

export const redactDiagnosticSnapshot = (snapshot, rules = defaultDiagnosticRedactionRules) => {
  return {
    ...snapshot,
    metadata: redactDiagnosticMetadata(snapshot.metadata, rules),
    categories: snapshot.categories.map((category) => ({
      ...category,
      records: category.records.map((record) => redactDiagnosticRecord(record, rules)),
    })),
    artifacts: {
      ...snapshot.artifacts,
      networkHar: redactDiagnosticHarArtifact(snapshot.artifacts.networkHar, rules),
    },
  }
}
