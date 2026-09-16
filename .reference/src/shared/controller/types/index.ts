import { GOOSE, HANDSET, HUB } from '@/shared/controller/constants'

import { ControllerEvents } from './events'
import { gooseButtons } from './goose'
import { handsetButtons } from './handset'
import { HubButtons } from './hub'
import { GooseLedCommand, HandsetLedCommand, HubLedCommand } from './led'

export { handsetButtons, gooseButtons }
export { ControllerEvents } from './events'

export type JSON_STRING = string

export type ButtonColor = 'red' | 'green' | 'blue' | 'orange' | 'white' | 'black'

export interface RegisterControllerEvent {
  sender: 'core',
  uid: string,
  timestamp: string,
  state: 'accept_registration' | 'decline_registration',
  message: string,
  model: 'register_answer',
  version: string
}

type SenderType = typeof HUB | typeof HANDSET | typeof GOOSE
type StringKeysHandset = Extract<keyof typeof handsetButtons, string>;
export type HandsetButtons = Exclude<StringKeysHandset, 'transformValues'>
type StringKeysGoose = Extract<keyof typeof gooseButtons, string>;
export type GooseButtons = Exclude<StringKeysGoose, 'transformValues' | 'getValues'>

export interface IncomingControllerEvent<T extends SenderType = never> {
  message: null
  model: 'event',
  name: ControllerEvents, // Имя события
  sender: string,
  target: T extends 'hub' ? HubButtons : T extends 'handset' ? HandsetButtons : T extends 'goose' ? GooseButtons : never,
  timestamp: string,
  uid: string,
  version: string
}

export interface OutgoingControllerPayload {
  target: string,
  color?: ButtonColor,
  freq?: number // 0-8,
  index?: HubLedCommand | HandsetLedCommand | GooseLedCommand,
  value?: number // 0-255
}

export type MelodyName = 'scale' | 'alarm' | 'notify' | 'warning'

export interface OutgoingControllerCommand {
  model: 'command',
  version: string | '1.0',
  name: 'effect' | 'animation' | 'brightness' | 'get' | 'play_melody' | 'play_tone',
  sender: 'core' | 'input' | string,
  target: string,
  uid: string,
  timestamp: string,
  recipients: Array<string>,
  attrs: ({
    index: HubLedCommand | HandsetLedCommand | GooseLedCommand,
    value?: never,
    r?: never,
    g?: never,
    b?: never,
    freq?: never,
  } | {
    index?: never,
    value?: never
    r: number, // 0-255
    g: number, // 0-255
    b: number, // 0-255
    freq: number // период вычисляется по формуле period = (33 / 2 / freq_hz), где freq_hz – частота в Гц
  } | {
    value: number, // Яркость подсветки
    index?: never,
    r?: never,
    g?: never,
    b?: never,
    period?: never
    freq?: never
  } | {
      name: MelodyName
  } | {
      freq: number,
      length: number,
      reps: number,
      delay: number,
      end_delay: boolean
  } | [])
}
