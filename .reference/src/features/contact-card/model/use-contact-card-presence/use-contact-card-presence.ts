import { storeToRefs } from 'pinia'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { useContactStatusState, type Contact } from '@/entities/contact'

import { CONTACT_PRESENCES, type ContactPresence } from '../contact-card-tone'

export const useContactCardPresence = (contact: MaybeRefOrGetter<Contact>) => {
  const { contactStatuses } = storeToRefs(useContactStatusState())

  const presence = computed<ContactPresence>(() => {
    const internalNumber = toValue(contact).internalNumber

    if (!internalNumber) {
      return CONTACT_PRESENCES.offline
    }

    return contactStatuses.value[internalNumber]?.registered === true
      ? CONTACT_PRESENCES.online
      : CONTACT_PRESENCES.offline
  })

  return {
    presence,
  }
}
