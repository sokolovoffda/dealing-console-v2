import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'

/** Toast when media action needs a device but none is usable (disabled / missing). */
export const notifyMediaDeviceUnavailableForCall = () => {
  const { showNotification } = useNotification()
  const { t } = useLocalization()

  showNotification({
    type: 'error',
    message: t('MediaDeviceUnavailableForCall'),
  })
}

/** Toast when user tries to turn device off while sessions are bound. */
export const notifyMediaDeviceDisableBlockedWhileInCall = () => {
  const { showNotification } = useNotification()
  const { t } = useLocalization()

  showNotification({
    type: 'error',
    message: t('MediaDeviceDisableBlockedWhileInCall'),
  })
}
