import { normalizeBaseUrl } from '@/shared/stand-config/normalize-base-url'
import type { StandConfigSnapshot } from '@/shared/stand-config/types'

export const getRtuBaseUrl = (): string | undefined => {
  return normalizeBaseUrl(import.meta.env.VITE_API_DEV_SERVER)
}

export const getApsBaseUrl = (): string | undefined => {
  return normalizeBaseUrl(import.meta.env.VITE_ADDITIONAL_API_URL)
}

export const getStandConfigSnapshot = (): StandConfigSnapshot => {
  return {
    environmentName: import.meta.env.VITE_ENVIRONMENT_NAME?.trim() || undefined,
    rtuBaseUrl: getRtuBaseUrl(),
    apsBaseUrl: getApsBaseUrl(),
  }
}
