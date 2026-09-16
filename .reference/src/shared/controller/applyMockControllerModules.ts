import {
  type ControllerMediaModule,
  useDevicesSessionsStore,
  useDevicesStore,
} from '@/shared/composables'
import { ControllerEvents } from '@/shared/controller/types'

import { syncAllGooseMicrophoneHardware } from './event-handlers/gooseEventHandler'

let areMockControllerModulesApplied = false

/** Подставляет mock-модули, если контроллер недоступен и модулей ещё нет. */
export const applyMockControllerModules = async (): Promise<boolean> => {
  const devicesStore = useDevicesStore()

  if (areMockControllerModulesApplied || devicesStore.controllerModules.length) {
    return false
  }

  areMockControllerModulesApplied = true
  const { controllerMediaDevice } = await import('@/__mocks_/mock-media-devices')
  devicesStore.setControllerModules(controllerMediaDevice as ControllerMediaModule[], { mock: true })

  // Без железа нет события pickup — иначе handset-сессии остаются muted.
  const { setHandsetState, getDeviceSessionKey } = useDevicesSessionsStore()
  devicesStore.handsetDevices.forEach((device) => {
    setHandsetState({
      device: getDeviceSessionKey(device),
      state: ControllerEvents.PICKUP,
    })
  })

  syncAllGooseMicrophoneHardware()

  return true
}
