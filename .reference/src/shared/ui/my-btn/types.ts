import type { WuiBtn } from '@wui/common-library'

type WuiBtnProps = InstanceType<typeof WuiBtn>['$props']

export type MyBtnMode = 'button' | 'toggle'

export type MyBtnTone = 'base' | 'dark' | 'alpha'

export type MyBtnActiveTone = 'default' | 'alpha-neg'

export type MyBtnIconTone =
  | 'def'
  | 'neg'
  | 'soft'
  | 'neutcon'
  | 'waitcon'
  | 'callcon'
  | 'warncon'
  | 'negcon'

export type MyBtnVariant =
  | 'neutcon'
  | 'brandcon'
  | 'waitcon'
  | 'callcon'
  | 'poscon'
  | 'warncon'
  | 'negcon'
  | 'twolinecon'

export type MyBtnSize = 24 | 32 | 40 | 48 | 72

export type MyBtnHeight = 80

export type MyBtnContentAlign = NonNullable<WuiBtnProps['contentAlign']>

export type MyBtnIconName = WuiBtnProps['prependIcon']

export type MyBtnProps = {
  variant?: MyBtnVariant
  tone?: MyBtnTone
  activeTone?: MyBtnActiveTone
  iconTone?: MyBtnIconTone
  mode?: MyBtnMode
  active?: boolean
  selected?: boolean
  size?: MyBtnSize
  height?: MyBtnHeight
  fixedSize?: boolean
  icon?: boolean
  prependIcon?: MyBtnIconName
  appendIcon?: MyBtnIconName
  disabled?: boolean
  contentAlign?: MyBtnContentAlign
}
