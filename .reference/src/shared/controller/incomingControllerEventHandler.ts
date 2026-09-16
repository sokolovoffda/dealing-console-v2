import { emitter, EmitterEvents } from '@/shared/services/emitter'

import { GOOSE, HANDSET, HUB, PULT } from './constants'
import { gooseEventHandler } from './event-handlers/gooseEventHandler'
import { handsetEventHandler } from './event-handlers/handsetEventHandler'
import { IncomingControllerEvent } from './types'

export const incomingControllerEventHandler = (e: IncomingControllerEvent) => {
  if (e.sender.startsWith(HUB)) {
    const event = e as IncomingControllerEvent<'hub'>
    emitter.emit(EmitterEvents.HUB, event.target)
  } else if (e.sender.startsWith(HANDSET)) {
    const event = e as IncomingControllerEvent<'handset'>
    handsetEventHandler(event)
  } else if (e.sender.startsWith(GOOSE)) {
    const event = e as IncomingControllerEvent<'goose'>
    gooseEventHandler(event)
  } else if (e.sender.startsWith(PULT)) {
    // ничего не делаем
  } else {
    console.warn('Unknown sender', e)
  }
}
