import { ref } from 'vue'

import { HandsetButtonValue } from '@/shared/controller'

type CallBack = (number: string) => unknown

const TIMEOUT = 1000 // 1 секунда
const DEFAULT_TIMER = 5000 // 5 секунд
let timerId: number | null = null
let timer = DEFAULT_TIMER
const telephoneNumber = ref('')

export const useHandsetPickupHangupHandler = () => {
  const _timerHandler = (callback?: CallBack) => {
    _clearTimer()

    timerId = window.setInterval(() => {
      timer -= TIMEOUT
      if (timer <= 0) {
        callback?.(telephoneNumber.value)
        _clearTimer()
      }
    }, TIMEOUT)
  }

  const _clearTimer = () => {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
      timer = DEFAULT_TIMER
    }
  }

  const hangupHandsetHandler = () => {
    _clearTimer()
    telephoneNumber.value = ''
  }

  const pickupHandsetHandler = (button: HandsetButtonValue, callback?: CallBack) => {
    if (button === 'decline' || button === 'answer') return

    telephoneNumber.value += button
    _timerHandler(callback)
  }

  const refreshTimer = () => {
    _timerHandler()
  }

  return {
    refreshTimer,
    hangupHandsetHandler,
    pickupHandsetHandler,
    telephoneNumber,
  }
}
