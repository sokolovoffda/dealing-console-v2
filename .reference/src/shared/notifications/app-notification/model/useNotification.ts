import { v4 as uuidv4 } from 'uuid'
import { shallowRef, triggerRef } from 'vue'

import { AppNotification, AppNotificationPayload } from '../types'

const notifications = shallowRef(new Map<string, AppNotification>())

export const useNotification = () => {
  const setNotification = ({ type, message, timeout = 5000 }: AppNotificationPayload) => {
    const notification: AppNotification = {
      type,
      message,
      id: uuidv4(),
      timeout,
    }
    notifications.value.set(notification.id, notification)
    triggerRef(notifications)

    if (timeout > 0) {
      setTimeout(() => {
        deleteNotification(notification.id)
      }, timeout)
    }
  }
  const deleteNotification = (id: string) => {
    if (notifications.value.has(id)) {
      notifications.value.delete(id)
      triggerRef(notifications)
    }
  }

  return {
    notifications,
    showNotification: setNotification,
    deleteNotification: deleteNotification,
  }
}
