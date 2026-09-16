import { PServed, useIM } from '@wui/im'

const TICK_INTERVAL = 1000
const REQUEST_INTERVAL = 60 * 1000 * 2

const { subscribeOnConferenceUpdates } = useIM()

const subscriberCountMap = new Map<PServed, number>()
const contactLastRequestTimestamp = new Map<PServed, number>()

const requestStatusWithDebounce = (pServed: string) => {
  const now = performance.now()
  const lastRequestTimestamp = contactLastRequestTimestamp.get(pServed)
  if (!lastRequestTimestamp || now - lastRequestTimestamp > REQUEST_INTERVAL) {
    subscribeOnConferenceUpdates({ pServed }).catch((e) => {
      console.warn(`request status error: ${e}`)
    })
    contactLastRequestTimestamp.set(pServed, now)
  }
}
const handleTick = (): void => {
  subscriberCountMap.forEach((count, key) => {
    requestStatusWithDebounce(key)
  })
}

const subscribe = (pServed: string) => {
  const count = subscriberCountMap.get(pServed) || 0
  subscriberCountMap.set(pServed, count + 1)
}

const unsubscribe = (pServed: string): void => {
  const count = subscriberCountMap.get(pServed) || 0
  if (count > 1) {
    subscriberCountMap.set(pServed, count - 1)
  } else if (count <= 1) {
    subscriberCountMap.delete(pServed)
  }
}

const clearAllSubscribers = (ids?: Array<PServed>): void => {
  if (ids !== undefined) {
    ids.forEach((pServed) => {
      subscriberCountMap.delete(pServed)
      contactLastRequestTimestamp.delete(pServed)
    })
  } else {
    subscriberCountMap.clear()
    contactLastRequestTimestamp.clear()
  }
}

let timerId: NodeJS.Timeout
const startSubscribeHandler = (): void => {
  timerId = setInterval(handleTick, TICK_INTERVAL)
}
const stopSubscribeHandler = (): void => {
  clearInterval(timerId)
}

export function useStatusSubscribe () {
  return {
    subscribe,
    unsubscribe,
    startSubscribeHandler,
    stopSubscribeHandler,
    clearAllSubscribers,
  }
}
