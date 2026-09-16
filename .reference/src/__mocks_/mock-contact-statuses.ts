import { Ref, shallowRef } from 'vue'

import { CallStatusState, SubscriberStatus } from '@/entities/contact'

export const mockContactStatuses: Ref<Record<string, SubscriberStatus>> = shallowRef({
  '3450': {
    internalNumber: '3450',
    targetNumber: '4498',
    fromNumber: undefined,
    callId: 'call-id 1',
    registered: true,
    remote: 'early' as CallStatusState,
  },
  '4498': {
    internalNumber: '4498',
    targetNumber: undefined,
    fromNumber: '3450',
    callId: 'call-id 2',
    registered: true,
    remote: 'confirmed' as CallStatusState,
  },
})
