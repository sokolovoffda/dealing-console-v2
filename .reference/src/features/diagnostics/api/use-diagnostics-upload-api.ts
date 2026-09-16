import axios, { AxiosResponse } from 'axios'

import type { DiagnosticsKind } from '@/shared/turret-admin-ws'
import { getAdditionalApiURL } from '@/shared/url-helper'

const DIAGNOSTICS_UPLOAD_PATH = '/api/v1/me/diagnostics/upload'

export type DiagnosticsUploadRequest = {
  correlationId: string
  kind: DiagnosticsKind
  file: Blob
  filename?: string
  connectionId?: string
  hardwareMac?: string
  hardwareSerial?: string
  consoleType?: 'dealing' | 'sods'
  metadata?: Record<string, unknown>
}

export type DiagnosticsUploadDto = {
  id: string
  correlationId: string
  actorId: string
  kind: DiagnosticsKind
  consoleType: 'dealing' | 'sods' | null
  connectionId: string | null
  hardwareMac: string | null
  hardwareSerial: string | null
  originalFilename: string
  contentType: string
  byteSize: number
  metadata: Record<string, unknown>
  downloadUrl: string
  expiresAt: string
  createdAt: string
}

export type DiagnosticsUploadResponse = {
  schemaVersion: 1
  upload: DiagnosticsUploadDto
}

const appendOptionalField = (formData: FormData, name: string, value?: string) => {
  if (!value) {
    return
  }

  formData.append(name, value)
}

export const uploadDiagnosticsArchive = (
  request: DiagnosticsUploadRequest,
): Promise<AxiosResponse<DiagnosticsUploadResponse>> => {
  const filename = request.filename ?? `${request.kind}-${request.correlationId}.json`
  const file = request.file.type
    ? request.file
    : new Blob([request.file], { type: 'application/json' })

  const formData = new FormData()
  formData.append('file', file, filename)
  formData.append('correlationId', request.correlationId)
  formData.append('kind', request.kind)
  appendOptionalField(formData, 'connectionId', request.connectionId)
  appendOptionalField(formData, 'hardwareMac', request.hardwareMac)
  appendOptionalField(formData, 'hardwareSerial', request.hardwareSerial)
  appendOptionalField(formData, 'consoleType', request.consoleType)
  if (request.metadata) {
    formData.append('metadata', JSON.stringify(request.metadata))
  }

  return axios.post<DiagnosticsUploadResponse>(
    getAdditionalApiURL({ pathName: DIAGNOSTICS_UPLOAD_PATH }),
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
}
