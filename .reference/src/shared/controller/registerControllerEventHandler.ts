import { useController } from '@/shared/controller/useController'
import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'
import { emitter, EmitterEvents } from '@/shared/services/emitter'
import { useTurretAdminWs } from '@/shared/turret-admin-ws'

import { RegisterControllerEvent } from './types'

export const registerControllerEventHandler = (event: RegisterControllerEvent) => {
  const { close, controllerIsConnected, getNetworkInformation, getModulesInformation } = useController()
  const { t } = useLocalization()
  const { showNotification } = useNotification()
  if (event.state === 'accept_registration') {
    controllerIsConnected.value = true

    getNetworkInformation()
    getModulesInformation()
    useTurretAdminWs().sendControllerOnlineStage()

    emitter.emit(EmitterEvents.CONTROLLER_CONNECTED, event)
  } else {
    controllerIsConnected.value = false

    close() // Если регистрация отклоняется, закрываем данное соединение
    showNotification({
      type: 'error',
      message: t('TheControllerRejectedTheRegistration'),
    })

    emitter.emit(EmitterEvents.CONTROLLER_DISCONNECTED, event)
  }
}
