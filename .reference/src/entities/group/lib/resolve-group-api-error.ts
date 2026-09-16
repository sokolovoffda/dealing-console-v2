import axios from 'axios'

/**
 * Коды ошибок API групп — расширяемый словарь для явных нотификаций.
 * Новые статусы/кейсы добавлять в GROUP_API_STATUS_MESSAGE_KEYS.
 */
export const GROUP_API_ERROR_CODES = {
  duplicateName: 'duplicateName',
  unknown: 'unknown',
} as const

export type GroupApiErrorCode = typeof GROUP_API_ERROR_CODES[keyof typeof GROUP_API_ERROR_CODES]

export type GroupApiErrorInfo = {
  code: GroupApiErrorCode
  /** Ключ i18n или готовый fallback-текст для unknown */
  messageKey?: string
  fallbackMessage: string
}

/** HTTP status → явное пользовательское сообщение (locale key). */
export const GROUP_API_STATUS_MESSAGE_KEYS: Partial<Record<number, {
  code: GroupApiErrorCode
  messageKey: string
}>> = {
  409: {
    code: GROUP_API_ERROR_CODES.duplicateName,
    messageKey: 'GroupNameAlreadyExists',
  },
}

export const resolveGroupApiError = (error: unknown): GroupApiErrorInfo => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const mapped = status != null ? GROUP_API_STATUS_MESSAGE_KEYS[status] : undefined

    if (mapped) {
      return {
        code: mapped.code,
        messageKey: mapped.messageKey,
        fallbackMessage: mapped.messageKey,
      }
    }

    return {
      code: GROUP_API_ERROR_CODES.unknown,
      fallbackMessage: error.message || 'Network Error',
    }
  }

  if (error instanceof Error && error.message) {
    return {
      code: GROUP_API_ERROR_CODES.unknown,
      fallbackMessage: error.message,
    }
  }

  return {
    code: GROUP_API_ERROR_CODES.unknown,
    fallbackMessage: 'Неизвестная ошибка',
  }
}
