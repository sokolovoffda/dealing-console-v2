#!/usr/bin/env node

import http from 'node:http'
import https from 'node:https'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'

const DEFAULT_BASE_URL = 'http://192.168.232.234:6001'
const DEFAULT_SPEC_URL = 'http://192.168.232.234:6001/swagger/v1/swagger.json'

type JsonObject = Record<string, unknown>

type OpenApiSpec = {
  openapi?: string
  swagger?: string
  info?: {
    title?: string
    version?: string
  }
  servers?: Array<{
    url?: string
    description?: string
  }>
  tags?: Array<{
    name?: string
    description?: string
  }>
  paths?: Record<string, Record<string, OperationObject | unknown>>
  components?: {
    schemas?: Record<string, unknown>
  }
  security?: unknown
}

type OperationObject = {
  operationId?: string
  tags?: string[]
  summary?: string
  description?: string
  parameters?: unknown[]
  requestBody?: unknown
  responses?: Record<string, unknown>
  security?: unknown
}

type EndpointMatch = {
  method: string
  path: string
  operationId?: string
  tags?: string[]
  summary?: string
  description?: string
  requestBodySchema?: unknown
  responseSchemas?: Record<string, unknown>
}

type ApiGetResponse = {
  status: number
  contentType: string | null
  body: string
}

const HTTP_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
])

const baseUrl = process.env.SWAGGER_BASE_URL ?? DEFAULT_BASE_URL
const specUrl = process.env.SWAGGER_SPEC_URL ?? DEFAULT_SPEC_URL
const swaggerToken = process.env.SWAGGER_TOKEN

let cachedSpec: OpenApiSpec | null = null

const server = new Server(
  {
    name: 'org-swagger-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

const tools: Tool[] = [
  {
    name: 'get_openapi_spec',
    description:
      'Loads OpenAPI JSON from SWAGGER_SPEC_URL. Returns a summary by default, or the full spec when full=true.',
    inputSchema: {
      type: 'object',
      properties: {
        full: {
          type: 'boolean',
          description: 'Return the full OpenAPI specification instead of a compact summary.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_api',
    description:
      'Searches OpenAPI endpoints by path, method, operationId, tags, summary, and description.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'describe_endpoint',
    description:
      'Returns detailed OpenAPI information for a specific endpoint method and path.',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          description: 'HTTP method, for example GET or POST.',
        },
        path: {
          type: 'string',
          description: 'OpenAPI path, for example /api/groups/{id}.',
        },
      },
      required: ['method', 'path'],
      additionalProperties: false,
    },
  },
  {
    name: 'call_api_get',
    description:
      'Performs a GET request to SWAGGER_BASE_URL + path. Adds Authorization: Bearer token when SWAGGER_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative API path starting with /. Absolute URLs are rejected.',
        },
        query: {
          type: 'object',
          description: 'Optional query parameters.',
          additionalProperties: true,
        },
        headers: {
          type: 'object',
          description: 'Optional request headers. Authorization is controlled only by SWAGGER_TOKEN.',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
]

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async request => {
  const args = asObject(request.params.arguments)

  try {
    switch (request.params.name) {
      case 'get_openapi_spec':
        return jsonResult(await getOpenApiSpec(args.full === true))
      case 'search_api':
        return jsonResult(await searchApi(getRequiredString(args, 'query')))
      case 'describe_endpoint':
        return jsonResult(
          await describeEndpoint(
            getRequiredString(args, 'method'),
            getRequiredString(args, 'path'),
          ),
        )
      case 'call_api_get':
        return jsonResult(
          await callApiGet(
            getRequiredString(args, 'path'),
            asOptionalObject(args.query),
            asOptionalHeaders(args.headers),
          ),
        )
      default:
        return errorResult(`Unknown tool: ${request.params.name}`)
    }
  } catch (error) {
    return errorResult(toSafeErrorMessage(error))
  }
})

const getOpenApiSpec = async (full: boolean): Promise<JsonObject> => {
  const spec = await loadSpec()

  if (full) {
    return withTokenWarning({
      spec,
    })
  }

  return withTokenWarning({
    title: spec.info?.title ?? null,
    version: spec.info?.version ?? null,
    servers: spec.servers ?? [],
    pathsCount: Object.keys(spec.paths ?? {}).length,
    tags: getMainTags(spec),
  })
}

const searchApi = async (query: string): Promise<JsonObject> => {
  const spec = await loadSpec()
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    throw new Error('query must not be empty')
  }

  const matches = collectEndpoints(spec)
    .filter(endpoint => endpointMatches(endpoint, normalizedQuery))
    .slice(0, 50)
    .map(endpoint => ({
      endpoint: `${endpoint.method} ${endpoint.path}`,
      operationId: endpoint.operationId ?? null,
      tags: endpoint.tags ?? [],
      summary: endpoint.summary ?? null,
      requestBodySchema: endpoint.requestBodySchema ?? null,
      responseSchemas: endpoint.responseSchemas ?? {},
    }))

  return withTokenWarning({
    query,
    count: matches.length,
    matches,
  })
}

const describeEndpoint = async (
  method: string,
  path: string,
): Promise<JsonObject> => {
  const spec = await loadSpec()
  const normalizedMethod = method.toLocaleLowerCase()
  const pathItem = spec.paths?.[path]

  if (!pathItem) {
    throw new Error(`Endpoint path not found: ${path}`)
  }

  if (!HTTP_METHODS.has(normalizedMethod)) {
    throw new Error(`Unsupported OpenAPI method: ${method}`)
  }

  const operation = pathItem[normalizedMethod]

  if (!isOperationObject(operation)) {
    throw new Error(`Endpoint operation not found: ${method.toUpperCase()} ${path}`)
  }

  return withTokenWarning({
    endpoint: `${normalizedMethod.toUpperCase()} ${path}`,
    operationId: operation.operationId ?? null,
    tags: operation.tags ?? [],
    summary: operation.summary ?? null,
    description: operation.description ?? null,
    parameters: operation.parameters ?? [],
    requestBody: operation.requestBody ?? null,
    responses: operation.responses ?? {},
    schemas: collectReferencedSchemas(spec, operation),
    security: {
      operation: operation.security ?? null,
      global: spec.security ?? null,
    },
  })
}

const callApiGet = async (
  path: string,
  query?: JsonObject,
  headers?: Record<string, string>,
): Promise<JsonObject> => {
  const url = buildSafeApiUrl(path, query)
  const requestHeaders: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLocaleLowerCase() === 'authorization') continue
    requestHeaders[key] = value
  }

  if (swaggerToken) {
    requestHeaders.Authorization = `Bearer ${swaggerToken}`
  }

  const response = await requestApiGet(url, requestHeaders)

  return withTokenWarning({
    status: response.status,
    headers: {
      'content-type': response.contentType,
    },
    body: parseBody(response.body, response.contentType),
  })
}

const loadSpec = async (): Promise<OpenApiSpec> => {
  if (cachedSpec) return cachedSpec

  const response = await fetch(specUrl, {
    headers: swaggerToken
      ? {
          Authorization: `Bearer ${swaggerToken}`,
        }
      : undefined,
  })

  if (!response.ok) {
    throw new Error(`Failed to load OpenAPI spec: HTTP ${response.status}`)
  }

  const data = (await response.json()) as unknown

  if (!isObject(data)) {
    throw new Error('OpenAPI spec response is not an object')
  }

  cachedSpec = data as OpenApiSpec

  return cachedSpec
}

const collectEndpoints = (spec: OpenApiSpec): EndpointMatch[] => {
  const endpoints: EndpointMatch[] = []

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!isObject(pathItem)) continue

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !isOperationObject(operation)) continue

      endpoints.push({
        method: method.toUpperCase(),
        path,
        operationId: operation.operationId,
        tags: operation.tags,
        summary: operation.summary,
        description: operation.description,
        requestBodySchema: extractRequestBodySchema(operation.requestBody),
        responseSchemas: extractResponseSchemas(operation.responses),
      })
    }
  }

  return endpoints
}

const endpointMatches = (
  endpoint: EndpointMatch,
  normalizedQuery: string,
): boolean => {
  const searchableText = [
    endpoint.method,
    endpoint.path,
    endpoint.operationId,
    ...(endpoint.tags ?? []),
    endpoint.summary,
    endpoint.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()

  return searchableText.includes(normalizedQuery)
}

const collectReferencedSchemas = (
  spec: OpenApiSpec,
  operation: OperationObject,
): JsonObject => {
  const refs = new Set<string>()
  collectRefs(operation.parameters, refs)
  collectRefs(operation.requestBody, refs)
  collectRefs(operation.responses, refs)

  const schemas: JsonObject = {}

  for (const ref of refs) {
    const schemaName = ref.replace('#/components/schemas/', '')
    const schema = spec.components?.schemas?.[schemaName]
    if (schema) schemas[schemaName] = schema
  }

  return schemas
}

const collectRefs = (value: unknown, refs: Set<string>): void => {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs)
    return
  }

  if (!isObject(value)) return

  const ref = value.$ref
  if (typeof ref === 'string' && ref.startsWith('#/components/schemas/')) {
    refs.add(ref)
  }

  for (const item of Object.values(value)) collectRefs(item, refs)
}

const extractRequestBodySchema = (requestBody: unknown): unknown => {
  if (!isObject(requestBody) || !isObject(requestBody.content)) return null
  return Object.fromEntries(
    Object.entries(requestBody.content).map(([contentType, mediaType]) => [
      contentType,
      isObject(mediaType) ? (mediaType.schema ?? null) : null,
    ]),
  )
}

const extractResponseSchemas = (
  responses: OperationObject['responses'],
): Record<string, unknown> => {
  if (!responses) return {}

  return Object.fromEntries(
    Object.entries(responses).map(([status, response]) => [
      status,
      extractResponseSchema(response),
    ]),
  )
}

const extractResponseSchema = (response: unknown): unknown => {
  if (!isObject(response) || !isObject(response.content)) return null

  return Object.fromEntries(
    Object.entries(response.content).map(([contentType, mediaType]) => [
      contentType,
      isObject(mediaType) ? (mediaType.schema ?? null) : null,
    ]),
  )
}

const buildSafeApiUrl = (path: string, query?: JsonObject): string => {
  if (!path.startsWith('/')) {
    throw new Error('path must start with /')
  }

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(path) || path.startsWith('//')) {
    throw new Error('absolute URLs are not allowed in path')
  }

  const base = new URL(baseUrl)
  const url = new URL(path, base)

  if (url.origin !== base.origin) {
    throw new Error('path resolves outside SWAGGER_BASE_URL host')
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item))
      continue
    }
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

const requestApiGet = (
  url: string,
  headers: Record<string, string>,
): Promise<ApiGetResponse> =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const transport = parsedUrl.protocol === 'https:' ? https : http

    const request = transport.request(
      parsedUrl,
      {
        method: 'GET',
        headers,
      },
      response => {
        const chunks: Buffer[] = []

        response.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            contentType: normalizeHeader(response.headers['content-type']),
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )

    request.on('error', reject)
    request.end()
  })

const normalizeHeader = (header: string | string[] | undefined): string | null => {
  if (Array.isArray(header)) return header.join(', ')
  return header ?? null
}

const parseBody = (body: string, contentType: string | null): unknown => {
  if (!body) return null
  if (!contentType?.toLocaleLowerCase().includes('application/json')) return body

  try {
    return JSON.parse(body) as unknown
  } catch {
    return body
  }
}

const getMainTags = (spec: OpenApiSpec): string[] => {
  const explicitTags = (spec.tags ?? [])
    .map(tag => tag.name)
    .filter((tag): tag is string => Boolean(tag))

  if (explicitTags.length > 0) return explicitTags.slice(0, 50)

  return Array.from(
    new Set(
      collectEndpoints(spec)
        .flatMap(endpoint => endpoint.tags ?? [])
        .filter(Boolean),
    ),
  ).slice(0, 50)
}

const withTokenWarning = (payload: JsonObject): JsonObject => {
  if (swaggerToken) return payload

  return {
    warning:
      'SWAGGER_TOKEN is not set. Protected endpoints or protected OpenAPI specs may fail.',
    ...payload,
  }
}

const jsonResult = (payload: unknown): CallToolResult => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(payload, null, 2),
    },
  ],
})

const errorResult = (message: string): CallToolResult => ({
  isError: true,
  content: [
    {
      type: 'text',
      text: JSON.stringify({ error: message }, null, 2),
    },
  ],
})

const asObject = (value: unknown): JsonObject =>
  isObject(value) ? value : {}

const asOptionalObject = (value: unknown): JsonObject | undefined => {
  if (value === undefined) return undefined
  if (!isObject(value)) throw new Error('query must be an object')
  return value
}

const asOptionalHeaders = (
  value: unknown,
): Record<string, string> | undefined => {
  if (value === undefined) return undefined
  if (!isObject(value)) throw new Error('headers must be an object')

  return Object.fromEntries(
    Object.entries(value).map(([key, headerValue]) => [
      key,
      String(headerValue),
    ]),
  )
}

const getRequiredString = (args: JsonObject, name: string): string => {
  const value = args[name]

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} must be a non-empty string`)
  }

  return value
}

const isOperationObject = (value: unknown): value is OperationObject =>
  isObject(value)

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toSafeErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  return swaggerToken ? message.replaceAll(swaggerToken, '[redacted]') : message
}

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(error => {
  console.error(toSafeErrorMessage(error))
  process.exit(1)
})
