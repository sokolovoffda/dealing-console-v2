import { readonly, ref } from 'vue'

import { useCallManagerState } from '@/widgets/call-manager'

import { useSessionStore } from '@/entities/call-session'
import { Contact } from '@/entities/contact'

type ReferType = 'blind' | 'consultation' | null

const selectedContact = ref<Contact | undefined>()
const selectedReferType = ref<ReferType>(null)

export const useReferCallState = () => {
  const startProcess = (state: ReferType) => {
    selectedReferType.value = state
  }

  const finishProcess = () => {
    selectedReferType.value = null
  }

  const setContact = (contact: Contact) => {
    selectedContact.value = contact
  }

  const removeContact = () => {
    selectedContact.value = undefined
  }

  const executeRefer = (contact?: Contact | string) => {
    const { selectedSession } = useCallManagerState()

    if (!selectedSession.value) {
      console.warn('There is no session to perform the function: ', selectedSession.value)
      return
    }

    const isConsultation = !!selectedSession.value.referCallId.value

    if (selectedReferType.value === 'blind') {
      const number = typeof contact === 'string' ? contact : typeof contact === 'object' ? contact.internalNumber : null
      if (!number) return
      selectedSession.value.refer({
        targetNumber: number,
      })
    } else if (isConsultation) {
      const { getSessionById } = useSessionStore()
      const toSessionId = selectedSession.value.referCallId.value
      if (!toSessionId) return
      const toSession = getSessionById(toSessionId)
      if (!toSession) return
      selectedSession.value.refer({
        toSession: toSession,
      })
    }

    finishProcess()
  }

  return {
    selected: readonly(selectedContact),
    selectedReferType: readonly(selectedReferType),
    setContact,
    removeContact,
    startProcess,
    finishProcess,
    executeRefer,
  }
}
