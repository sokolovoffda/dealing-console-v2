export type AppModalProps = {
  title: string
  cancelText?: string
  confirmText?: string
  confirmDisabled?: boolean
  loading?: boolean
  /**
   * Если true (по умолчанию), confirm закрывает диалог с `true`.
   * Выключить, когда parent сам закрывает диалог с полезной нагрузкой.
   */
  autoCloseOnConfirm?: boolean
}

export type AppModalEmits = {
  cancel: []
  confirm: []
}
