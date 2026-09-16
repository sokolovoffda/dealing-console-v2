import mitt, { Emitter } from 'mitt'

export const enum EmitterEvents {
  CONTROLLER_CONNECTED = 'controller-connected',
  CONTROLLER_DISCONNECTED = 'controller-disconnected',
  CONTROLLER_UNAVAILABLE = 'controller-unavailable',
  HANDSET_RELEASED = 'handset-released',
  HUB = 'hub'
}

export const emitter: Emitter<Record<EmitterEvents, unknown>> = mitt()
