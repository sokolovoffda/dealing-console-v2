import { UserInfo } from '@wui/common-library'
import { ConferenceType, CreateConferencePayload, useIM } from '@wui/im'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, readonly, ref, Ref, shallowRef, triggerRef } from 'vue'

import { Contact } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'
import { contactNumberToPServed } from '@/shared/services'

import { ConferenceDto, RoomMemberRole } from '../types'

import { default as useConferenceState } from './use-conference-state'

const innerData: Ref<ConferenceDto | undefined> = shallowRef()
const loading: Ref<boolean> = ref(false)

const conferenceDraft = readonly(innerData)
const isActive = computed(() => innerData.value)
const init = (conference?: ConferenceDto) => {
  if (conference) {
    innerData.value = conference
  } else {
    const randomPServed = uuidv4()
    innerData.value = {
      pServed: randomPServed,
      capacity: 9999,
      domainPath: 'ROOT',
      selectorMode: ConferenceType.FREE_FOR_ALL,
      name: '',
      subscribers: [],
      subscribersCount: 0,
    }
  }
}

const cancelConferenceDraft = () => {
  innerData.value = undefined
}

const setConfDraftName = (name: string) => {
  if (innerData.value) {
    innerData.value.name = name
  }
  triggerRef(innerData)
}

const addDraftConferenceSubscriber = (subscriber: Contact | UserInfo) => {
  if (innerData.value) {
    const isExternal = 'isExternal' in subscriber && subscriber.isExternal

    innerData.value.subscribers.push({
      pServed: contactNumberToPServed(subscriber.internalNumber),
      guid: contactNumberToPServed(subscriber.internalNumber),
      name: subscriber.name,
      phoneNumber: isExternal ? 'PSTNGUEST-' + subscriber.internalNumber : subscriber.internalNumber,
      email: subscriber.email || 'Неизвестный',
      type: isExternal ? 'pstnGuest' : 'member',
      role: RoomMemberRole.User,
    })
    triggerRef(innerData)
  }
}

const deleteDraftConferenceSubscriber = (subscriber: Contact | UserInfo) => {
  if (innerData.value) {
    const index = innerData.value.subscribers.findIndex((s) => s.phoneNumber === subscriber.internalNumber)
    innerData.value.subscribers.splice(index, 1)
  }
  triggerRef(innerData)
}

const persist = async (): Promise<ConferenceDto> => {
  const { currentUser } = storeToRefs(useAppStore())

  return new Promise((resolve, reject) => {
    if (!innerData.value) {
      reject('No conference draft available')
      return
    }

    if (!innerData.value?.name || !innerData.value?.name?.trim()) {
      setConfDraftName('Конференция')
    }

    loading.value = true
    const { createConference } = useIM()
    const isCurrentUserNotAdded = innerData.value.subscribers.findIndex(({ phoneNumber }) => currentUser.value?.internalNumber === phoneNumber) < 0
    if (currentUser.value && isCurrentUserNotAdded) {
      innerData.value.subscribers.push({
        pServed: currentUser.value.imLogin,
        guid: currentUser.value.imLogin,
        name: currentUser.value.name,
        phoneNumber: currentUser.value.internalNumber,
        email: currentUser.value.email || '',
        type: 'member',
        role: RoomMemberRole.User,
      })
    }

    const payload: CreateConferencePayload = {
      mode: ConferenceType.FREE_FOR_ALL,
      name: innerData.value?.name ?? 'Конференция',
      subscribers: innerData.value.subscribers.map((s) => ({
        number: s.phoneNumber,
        role: RoomMemberRole.User,
      })),
    }
    createConference(payload).then((response) => {
      cancelConferenceDraft()
      const newConf: ConferenceDto = {
        name: payload.name,
        pServed: response.item.pServed,
        capacity: 9999,
        domainPath: 'ROOT',
        selectorMode: payload.mode,
        subscribers: payload.subscribers.map(({ number }) => ({
          pServed: contactNumberToPServed(number),
          guid: contactNumberToPServed(number),
          email: '',
          name: number,
          phoneNumber: number,
          type: 'member',
          role: RoomMemberRole.User,
        })),
        subscribersCount: payload.subscribers.length,
      }
      useConferenceState().addConference(newConf)
      resolve(newConf)
    }).finally(() => {
      loading.value = false
    })
  })
}

export default () => ({
  conferenceDraft,
  isActive,
  init,
  persist,
  loading,
  cancelConferenceDraft,
  addDraftConferenceSubscriber,
  deleteDraftConferenceSubscriber,
  setConfDraftName,
})
