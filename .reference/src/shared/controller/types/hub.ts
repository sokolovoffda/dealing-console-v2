import { HUB } from '../constants'

export type SenderHub = typeof HUB

export enum HubButtons {
  LEFT = `${HUB}:key_left`, // Уменьшение громкости
  RIGHT = `${HUB}:key_right`, // Увеличение громкости
}

