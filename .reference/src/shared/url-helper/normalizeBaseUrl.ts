export const normalizeBaseUrl = (value?: string): string | undefined => {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    return undefined
  }

  return normalizedValue.replace(/\/+$/, '')
}
