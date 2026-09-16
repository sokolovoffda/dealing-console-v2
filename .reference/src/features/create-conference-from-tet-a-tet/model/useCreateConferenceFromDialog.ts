import { ConferenceType, PServed, useIM } from '@wui/im'
import { storeToRefs } from 'pinia'
import { readonly, ref } from 'vue'

import { type SessionMediaDevice } from '@/entities/call-session'
import { Contact } from '@/entities/contact'

import {
  useAppStore,
  useAutoAnswer,
  useDevicesStore,
} from '@/shared/composables'

const chosenContacts = ref(new Map<PServed, Contact>())
const isCreating = ref(false)

export const useCreateConferenceFromTetATet = () => {
  const loading = ref(false)

  const setContact = (contact: Contact) => {
    if (!chosenContacts.value.has(contact.pServed)) {
      chosenContacts.value.set(contact.pServed, contact)
    }
  }

  const removeContact = ({ pServed }: Contact) => {
    if (chosenContacts.value.has(pServed)) {
      chosenContacts.value.delete(pServed)
    }
  }

  const toggleContact = (contact: Contact) => {
    if (chosenContacts.value.has(contact.pServed)) {
      removeContact(contact)
    } else {
      setContact(contact)
    }
  }

  const startCreating = () => {
    isCreating.value = true
  }

  const clearChosenContacts = () => {
    chosenContacts.value.clear()
  }

  const finishCreating = () => {
    isCreating.value = false
    clearChosenContacts()
  }

  const createGroupCallFromTetATet = async (replaceableCallId: string, device: SessionMediaDevice | null) => {
    const { currentUser } = storeToRefs(useAppStore())
    const { createConference } = useIM()
    const { registerAutoAnswer } = useAutoAnswer()
    const { readyQueueDevices } = useDevicesStore()

    if (!currentUser.value || loading.value) {
      return
    }

    if (!chosenContacts.value.size) {
      console.warn('No contacts are selected to create a conference from a conversation')
      return
    }

    try {
      loading.value = true
      const userList = []
      userList.push({
        name: currentUser.value.name,
        phoneNumber: currentUser.value.internalNumber,
      })

      for (const contact of chosenContacts.value.values()) {
        const number = 'isExternal' in contact && contact.isExternal ? 'PSTNGUEST-' + contact.internalNumber : contact.internalNumber
        userList.push({
          name: contact.name,
          phoneNumber: number,
        })
      }
      const chatName = userList.reduce((acc, user, index) => {
        if (!index) {
          acc += user.name
        } else {
          acc += `, ${user.name}`
        }
        return acc
      }, '')
      const numberList = userList.map((item) => item.phoneNumber)
      const res = await createConference({
        mode: ConferenceType.FREE_FOR_ALL,
        name: chatName,
        subscribers: numberList.map((number) => ({ number, role: currentUser.value?.internalNumber === number ? 'Owner' : 'User' })),
        replaceableCallId,
      })
      registerAutoAnswer(res.item.pServed, device ?? readyQueueDevices[0])
    } catch (e: unknown) {
      console.error(e)
    } finally {
      loading.value = false
      finishCreating()
    }
  }

  return {
    contacts: readonly(chosenContacts),
    creating: readonly(isCreating),
    loading: readonly(loading),
    setContact,
    toggleContact,
    removeContact,
    startCreating,
    clearContacts: clearChosenContacts,
    finishCreating,
    create: createGroupCallFromTetATet,
  }
}
