import { useDialog } from '@wui/common-library'
import { PServed } from '@wui/im'
import { storeToRefs } from 'pinia'
import { ComponentOptions, computed, ComputedRef, ref, Ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useCallManagerState, CallManagerState } from '@/widgets/call-manager'

import { RTCSessionFacade } from '@/entities/call-session'
import { Contact, useContactCachedStore } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'
import { useNotification } from '@/shared/notifications'
import { ChangeContactsModal } from '@/shared/ui'
import { toConferenceContact } from '@/shared/utils/contact'

import { useRoomControl } from '../lib/use-room-control'
import { ConferenceDto, ConferenceContact, SubscriberDto } from '../types'

import { default as useConferenceState } from './use-conference-state'
import useConferenceSubscriberStatusState from './use-conference-subscriber-status-state'

export function useConferenceHandler (conference: Ref<ConferenceDto>, facade: ComputedRef<RTCSessionFacade | undefined> | Ref<RTCSessionFacade | undefined>) {
  const { currentUser } = storeToRefs(useAppStore())
  const { removeSubscriberFromConference, addSubscriberToConference } = useConferenceState()
  const router = useRouter()
  const { setCallManagerState } = useCallManagerState()
  const { memberMute, memberUnmute, memberKick, memberCall, pauseConference, continueConference } = useRoomControl()
  const { setMemberAudioMuted } = useConferenceSubscriberStatusState()
  const { showNotification } = useNotification()
  const contactCachedStore = useContactCachedStore()
  const { fetchContactsBySomeIds } = contactCachedStore
  const { loading } = storeToRefs(contactCachedStore)

  const subscribers = computed(() => {
    if (!conference?.value?.pServed) return []

    const conferencePServed = conference?.value.pServed
    return conference?.value.subscribers.map(({ pServed }) => toConferenceContact(conferencePServed, pServed))
  })

  const pServedUser = computed(() => conference?.value?.pServed)
  const selfPServed = currentUser.value?.imLogin

  const holdState: Ref<'disabled' | 'processed' | 'enabled'> = ref('disabled')
  const conferenceHoldLoading = ref(false)

  const isHoldDisabled = computed(() => {
    return holdState.value === 'processed'
  })

  const manageSubscribers = async () => {
    const { showDialog } = useDialog<Contact[] | undefined>()
    const description = '<p>Отметьте абонентов, которых вы хотите добавить в конференцию.</p><p>Если абонент не найден в справочнике вы можете добавить его как внешний номер, написав номер в поиске и нажав кнопку добавить</p>'
    const contactsWithoutSelf = conference.value?.subscribers?.map((c) => c.pServed).filter(pServed => pServed !== selfPServed) ?? []
    const result = await showDialog(ChangeContactsModal as ComponentOptions, {
      title: 'Управление участниками конференции',
      contactsPServed: contactsWithoutSelf,
      description: description,
      hasOverlay: true,
    })
    if (result?.length) {
      updateSubscribers(result)
    }
  }
  const updateSubscribers = (updatedContacts: Contact[]) => {
    const oldContacts: SubscriberDto[] = conference.value.subscribers.filter(c => c.pServed !== selfPServed)
    const oldContactsPServed: PServed[] = oldContacts.map(c => c.pServed)
    const updatedContactsPServed: PServed[] = updatedContacts.map(c => c.pServed)

    const addedContacts: Contact[] = updatedContacts.filter(c => !oldContactsPServed.includes(c.pServed))
    console.info('added: ', addedContacts)
    const removedContacts: SubscriberDto[] = oldContacts.filter(c => !updatedContactsPServed.includes(c.pServed))
    console.info('removed: ', removedContacts)

    const conferencePServed = conference?.value?.pServed
    if(!conferencePServed) { console.warn('conferencePServed is not defined'); return }

    if(removedContacts.length) {
      removedContacts.forEach(contact => {
        let number = contact.phoneNumber
        if(contact.type === 'pstnGuest') {
          number = 'PSTNGUEST-' + number
        }
        removeSubscriberFromConference(conferencePServed, number).then()
      })
    }
    if(addedContacts.length) {
      addedContacts.forEach(contact => {
        let number = contact.internalNumber
        if('isExternal' in contact && contact.isExternal) {
          number = 'PSTNGUEST-' + number
        }
        addSubscriberToConference(conferencePServed, number).then()
      })
    }
  }

  const onDelete = (contact: ConferenceContact) => {
    const conferencePServed = conference?.value?.pServed
    if (conferencePServed) {
      removeSubscriberFromConference(conferencePServed, contact.internalNumber).then()
    } else {
      console.warn(`Can't remove subscriber: number = ${contact.internalNumber}, conferencePServed = ${conferencePServed}`)
    }
  }

  const goToConference = () => {
    if (conference?.value && facade.value) {
      const conferencePServed = conference?.value.pServed
      router.push({ name: 'Conference', params: { conferencePServed } }).then()
    } else {
      console.warn('Can\'t route to not existed or not started conference')
      setCallManagerState(CallManagerState.INITIAL)
    }
  }

  const toggleHold = async () => {
    if (holdState.value === 'processed') return
    try {
      holdState.value = 'processed'
      const isOnHold = facade.value?.isConfOnHold.value
      await facade.value?.toggleHold()
      holdState.value = isOnHold ? 'disabled' : 'enabled'
    } catch (e) {
      console.error(e)
      showNotification({
        type: 'error',
        message: (e as Error).message,
      })
    }
  }

  const toggleMute = ([contact, setMuted]: [ConferenceContact, boolean | undefined]) => {
    const needMute = setMuted !== undefined ? setMuted : facade.value?.isMuted.value
    console.debug('toggleMute', needMute)

    // Optimistic: иконка меняется сразу (серверный mutedMyAudio deprecated / может не прийти)
    if (pServedUser.value && contact.internalNumber) {
      setMemberAudioMuted(pServedUser.value, contact.internalNumber, !!needMute)
    }

    if (needMute) {
      memberMute(pServedUser.value, contact.internalNumber)
    } else {
      memberUnmute(pServedUser.value, contact.internalNumber)
    }

    // Для себя — синхронизация SIP-микрофона с кнопкой mute в списке
    if (contact.internalNumber === currentUser.value?.internalNumber && facade.value) {
      if (needMute) {
        facade.value.mute()
      } else {
        facade.value.unmute()
      }
    }
  }

  const onKick = (contact: ConferenceContact) => {
    memberKick(pServedUser.value, contact.internalNumber)
  }

  const onCall = (contact: ConferenceContact) => {
    memberCall(pServedUser.value, contact.internalNumber)
  }

  const toggleConferenceHold = async () => {
    try {
      conferenceHoldLoading.value = true
      if (conference.value.isPause) {
        await continueConference(pServedUser.value)
      } else {
        await pauseConference(pServedUser.value)
      }
    } catch (e) {
      console.error(e)
      showNotification({
        type: 'error',
        message: (e as unknown as Error).message,
      })
    } finally {
      conferenceHoldLoading.value = false
    }
  }
  watch(subscribers, () => {
    fetchContactsBySomeIds(conference.value.subscribers.map(({ pServed }) => pServed))
  }, { immediate: true })

  return {
    subscribers,
    pServedUser,
    holdState,
    isHoldDisabled,
    onDelete,
    goToConference,
    toggleHold,
    conferenceHoldLoading,
    toggleConferenceHold,
    toggleMute,
    onKick,
    onCall,
    manageSubscribers,
    facade,
    loading,
  }
}
