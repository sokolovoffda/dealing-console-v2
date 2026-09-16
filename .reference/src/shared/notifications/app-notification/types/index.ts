export interface AppNotificationPayload {
  type: 'success' | 'error',
  message: string,
  timeout?: number
}

export interface AppNotification extends AppNotificationPayload {
  id: string
}
