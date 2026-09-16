import type { LogicalMediaDevice } from './state/devices-store'

type AutoAnswerMediaDevice = LogicalMediaDevice

const autoAnswerMap = {} as { [number: string]: number }
const devicesMap = {} as { [number: string]: AutoAnswerMediaDevice }

export function useAutoAnswer () {
  const registerAutoAnswer = (
    pServedUser: string,
    device: AutoAnswerMediaDevice,
    time = 3000,
  ) => {
    if (!autoAnswerMap[pServedUser]) {
      autoAnswerMap[pServedUser] = 0
    }
    autoAnswerMap[pServedUser] = autoAnswerMap[pServedUser] + 1
    devicesMap[pServedUser] = device
    setTimeout(() => {
      autoAnswerMap[pServedUser] = Math.max(autoAnswerMap[pServedUser] - 1, 0)
    }, time)
  }

  const checkAutoAnswerAndGetDevice = (pServedUser: string): [boolean, AutoAnswerMediaDevice | null] => {
    const device = devicesMap[pServedUser]
    return autoAnswerMap[pServedUser] > 0 ? [true, device] : [false, null]
  }

  return {
    registerAutoAnswer,
    checkAutoAnswerAndGetDevice,
  }
}
