import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useWebRTC } from '@/shared/jssip/useWebRTC'
import { contactPServedToNumber } from '@/shared/services'
import { arrayBatchesHandler } from '@/shared/utils/array-batches-handler'

import type { ActivityMonitorContactGridCell } from './use-activity-monitor-grid-contacts'

const BLF_SUBSCRIBE_BATCH_SIZE = 16
const BLF_SUBSCRIBE_DELAY_MS = 1000
const BLF_SUBSCRIBE_EXPIRES_SEC = 5 * 60

const resolveBlfInternalNumber = (contact: NonNullable<ActivityMonitorContactGridCell['contact']>) => {
  if (contact.internalNumber) return contact.internalNumber
  if (!contact.pServed) return null

  const fromPServed = contactPServedToNumber(contact.pServed)
  return fromPServed || null
}

/**
 * Batch SIP/BLF presence для абонентов верхней сетки AM.
 * Паттерн как у старого ПБВ `useWorkspaceContactStatusSubscription`.
 */
export const useActivityMonitorBlfSubscription = (
  cells: MaybeRefOrGetter<ActivityMonitorContactGridCell[]>,
) => {
  const { subscribeSIP, onRegisteredSIP } = useWebRTC()
  const subscribedInternalNumbers = new Set<string>()
  let subscriptionRunId = 0

  const internalNumbers = computed(() => {
    const numbers = new Set<string>()

    toValue(cells).forEach((cell) => {
      const contact = cell.contact
      if (!contact) return

      const internalNumber = resolveBlfInternalNumber(contact)
      if (internalNumber) numbers.add(internalNumber)
    })

    return Array.from(numbers).sort()
  })

  watch(
    [internalNumbers, onRegisteredSIP],
    async ([nextInternalNumbers, isRegistered]) => {
      const currentRunId = ++subscriptionRunId

      if (!isRegistered) return

      const numbersToSubscribe = nextInternalNumbers.filter((internalNumber) => {
        return !subscribedInternalNumbers.has(internalNumber)
      })

      if (!numbersToSubscribe.length) return

      console.debug('Activity monitor BLF subscribe:', numbersToSubscribe)

      await arrayBatchesHandler({
        array: numbersToSubscribe,
        batchSize: BLF_SUBSCRIBE_BATCH_SIZE,
        delayMs: BLF_SUBSCRIBE_DELAY_MS,
        callback: (internalNumber) => {
          if (currentRunId !== subscriptionRunId) return
          if (!onRegisteredSIP.value) return

          try {
            subscribeSIP(internalNumber, BLF_SUBSCRIBE_EXPIRES_SEC)
            subscribedInternalNumbers.add(internalNumber)
          } catch (e) {
            console.error('Activity monitor BLF subscribe failed:', internalNumber, e)
          }
        },
      })
    },
    { immediate: true },
  )
}
