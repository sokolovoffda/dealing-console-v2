export const normalizeBaseUrl = (value?: string): string | undefined => {
  const normalized = value?.trim()
  if (!normalized) return undefined
  return normalized.replace(/\/+$/, '')
}
