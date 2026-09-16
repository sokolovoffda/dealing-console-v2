import { storeToRefs } from 'pinia'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import {
  resolveContactCardDeviceKind,
  resolveContactCardDeviceSide,
} from '@/features/contact-card'

import type { RTCSessionFacade } from '@/entities/call-session'
import { useContactCachedStore } from '@/entities/contact'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'


import { getActivityMonitorQueueCardTone } from './activity-monitor-queue-card-tone'

export const useActivityMonitorQueueCard = (
  session: MaybeRefOrGetter<RTCSessionFacade>,
) => {
  const { contacts } = storeToRefs(useContactCachedStore())
  const pinnedCallsPanelStore = usePinnedCallsPanelStore()

  const contact = computed(() => {
    const sessionValue = toValue(session)
    return contacts.value.get(sessionValue.pServed)
  })

  const displayName = computed(() => {
    return contact.value?.name || toValue(session).number || '—'
  })

  const displayNumber = computed(() => {
    const sessionValue = toValue(session)
    return contact.value?.internalNumber
      || contact.value?.mobilePhone
      || sessionValue.number
      || '—'
  })

  const duration = computed(() => {
    return toValue(session).timer?.duration.value ?? '00:00:00'
  })

  const tone = computed(() => getActivityMonitorQueueCardTone(toValue(session)))

  const deviceSide = computed(() => {
    return resolveContactCardDeviceSide(toValue(session).currentDevice.value)
  })

  const deviceKind = computed(() => {
    return resolveContactCardDeviceKind(toValue(session).currentDevice.value)
  })

  const isPinnedSession = computed(() => {
    return pinnedCallsPanelStore.isPinnedPanelSessionId(toValue(session).sessionId)
  })

  return {
    displayName,
    displayNumber,
    duration,
    tone,
    deviceSide,
    deviceKind,
    isPinnedSession,
  }
}
