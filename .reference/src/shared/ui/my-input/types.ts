import type { WuiInput } from '@wui/common-library'

type WuiInputProps = InstanceType<typeof WuiInput>['$props']

export type MyInputIconName = WuiInputProps['prependIcon']

export type MyInputAppendAction = 'emit' | 'backspace'

export type MyInputProps = {
  modelValue?: string | number
  appendIcon?: MyInputIconName
  prependIcon?: MyInputIconName
  placeholder?: string
  title?: string
  supportingText?: string
  withClear?: boolean
  withLabel?: boolean
  disabled?: boolean
  error?: boolean
  appendAction?: MyInputAppendAction
}

export type MyInputActionPayload = {
  value: string
  selectionStart: number | null
  selectionEnd: number | null
}
