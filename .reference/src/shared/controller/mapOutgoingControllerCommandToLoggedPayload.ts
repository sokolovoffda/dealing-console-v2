import type { ControllerCommandLoggedPayload } from '@/shared/turret-admin-ws'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const mapOutgoingControllerCommandToLoggedPayload = (
  data: unknown,
): ControllerCommandLoggedPayload | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  const wire = data as Record<string, unknown>
  const wireModel = typeof wire.model === 'string' ? wire.model.trim() : ''
  const wireName = typeof wire.name === 'string' ? wire.name.trim() : ''
  if (!wireModel || !wireName) {
    return null
  }

  const wirePayload = { ...wire }
  delete wirePayload.model
  delete wirePayload.name
  const uid = typeof wire.uid === 'string' ? wire.uid : ''

  return {
    wireModel,
    wireName,
    wirePayload,
    direction: 'console_to_hardware',
    ...(UUID_PATTERN.test(uid) ? { correlationId: uid } : {}),
  }
}
