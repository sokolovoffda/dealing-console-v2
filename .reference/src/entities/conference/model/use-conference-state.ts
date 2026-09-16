import {
  ConferenceType,
  GroupStatusEvent,
  HistoryResponse,
  PServed,
  useIM,
  ContactState,
} from '@wui/im'
import { computed, readonly, ref, ShallowRef, shallowRef, triggerRef } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { usePinnedCallsStore } from '@/entities/call-session'
import {
  ConferenceDto, ContactIdMediaStatuses, ContactMediaStatuses,
  RoomMemberRole,
  SubscriberDto,
  useConferenceSubscriberStatusState,
  useRoomControl,
} from '@/entities/conference'
import { useContactStore } from '@/entities/contact'
import { useMainSettingsStore } from '@/entities/main-settings'

import { updateObjectInMapArrayValue } from '@/shared/collections'
import { useAppStore, useStatusSubscribe } from '@/shared/composables'
import { contactNumberToPServed, contactPServedToNumber } from '@/shared/services'

import { resolveContactAudioMuted } from '../lib/resolve-contact-audio-muted'

const { requestDialogs, onConferenceCreated, onConferenceUpdated, removeSubscriber, addSubscriber, onConferenceEdited } = useIM()

const CAPACITY = 9999

const innerData: ShallowRef<ConferenceDto[]> = shallowRef([])
const conferenceContactStatuses = shallowRef(new Map<string, Map<string, ContactState>>())
const loading = ref(false)

const currentUserStatuses = shallowRef(new Map<string, ContactMediaStatuses>())
const subscribersStatuses = shallowRef(new Map<string, ContactIdMediaStatuses[]>())

const conferencesWithPServedKeys = computed(() => {
  const result: Record<PServed, ConferenceDto> = {}
  innerData.value.forEach(( item) => {
    result[item.pServed] = item
  })
  return result
})

const fetchAll = async () => {
  // TODO пример предикат в TS, надо переписать типизацию history на него
  // const isWithFile = (message: HistoryMessageItem): message is HistoryMessageItem<GroupStatusEvent> => message.item.type === 'GroupStatusEvent'
  // props.messages.filter(isWithFile)
  try {
    loading.value = true
    // @ts-expect-error несостыковка типов
    const history: HistoryResponse<GroupStatusEvent> = await requestDialogs()
    history
      .events
      .filter(({ type, item: { extendedParams } }) => type === 46 && extendedParams['isEnabled'])
      .forEach(({ item: { name, pServed, extendedParams: { mode, contacts = [], isAutoRecording, isRecording } } }) => {
        addConference({
          name,
          pServed: pServed,
          capacity: CAPACITY,
          domainPath: 'ROOT',
          selectorMode: mode as ConferenceType,
          subscribers: contacts.map(({ id, name, type, role }) => ({
            pServed: contactNumberToPServed(id),
            phoneNumber: contactPServedToNumber(id),
            guid: id,
            email: '',
            name,
            type,
            role,
          })),
          subscribersCount: contacts.length,
          isAutoRecording,
          isRecording,
        })
      })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const addConference = (conference: ConferenceDto) => {
  const { subscribe: contactStatusSubscribe } = useStatusSubscribe()
  const conferenceIndex = innerData.value.findIndex(({ pServed }) => pServed === conference.pServed)
  if (conferenceIndex > -1) {
    innerData.value[conferenceIndex] = conference
  } else {
    innerData.value.push(conference)
  }
  contactStatusSubscribe(conference.pServed)
  triggerRef(innerData)
}

const removeSubscriberFromConference = async (confPServed: string, number: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        pServed: confPServed,
        targetInternalNumber: number,
      }
      const removed = await removeSubscriber(payload)
      if (removed) {
        const confIdx = innerData.value.findIndex((item) => item.pServed === confPServed)
        if (confIdx >= 0) {
          const subscriberIndex = innerData.value[confIdx].subscribers.findIndex(({ phoneNumber }) => phoneNumber === number)
          if (subscriberIndex >= 0) {
            innerData.value[confIdx].subscribers.splice(subscriberIndex, 1)
            triggerRef(innerData)
          }
        }
      } else {
        reject()
      }
      resolve(true)
    } catch (e) {
      reject(e)
    }
  })
}

const addSubscriberToConference = async (confPServed: string, number: string, command: 'AddMember' | 'AddMemberAndInvite' = 'AddMember', temporary?: boolean) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await addSubscriber({
        pServed: confPServed,
        targetInternalNumber: number,
        needToInvite: command === 'AddMemberAndInvite',
        temporary,
      })
      if (!result) reject()

      // вручную пушить в массив мемберов не нужно, прилетает сразу событие апдейта конфы и добавляет
      resolve(true)
    } catch (e) {
      reject(e)
    }
  })
}
const updateConferenceContactStatuses = (groupStatusEvent: GroupStatusEvent) => {
  const pServedRoom = groupStatusEvent.pServed
  const contactStatuses = groupStatusEvent.extendedParams.contacts
  if (!contactStatuses) return

  if (!conferenceContactStatuses.value.has(pServedRoom)) {
    const initialMap = new Map<string, ContactState>()
    contactStatuses.forEach((state) => {
      initialMap.set(state.id, state)
    })
    conferenceContactStatuses.value.set(pServedRoom, initialMap)
  } else {
    const map = conferenceContactStatuses.value.get(pServedRoom)
    if (map) {
      contactStatuses.forEach((state) => {
        map.set(state.id, state)
      })
    }
  }
  triggerRef(conferenceContactStatuses)
}
const deleteConference = (pServed: string) => {
  const index = innerData.value.findIndex((conf) => conf.pServed === pServed)
  if (index === -1) return

  innerData.value.splice(index, 1)
  triggerRef(innerData)
}

const updateConferenceDto = (event: GroupStatusEvent) => {
  const index = innerData.value.findIndex((conf) => conf.pServed === event.pServed)
  const contacts = event.extendedParams.contacts ?? []
  const isAutoRecording = event.extendedParams.isAutoRecording
  const isRecording = event.extendedParams.isRecording
  const isPause = !event.extendedParams.isActive
  const updatedConference: ConferenceDto = {
    pServed: event.pServed,
    name: event.name,
    selectorMode: event.extendedParams.mode as ConferenceType,
    domainPath: 'ROOT',
    capacity: CAPACITY,
    subscribers: contacts.map(({ id, type, role, name }) => {
      const phoneNumber = contactPServedToNumber(id)
      const subscriber: SubscriberDto = {
        pServed: id,
        name: name ?? phoneNumber,
        email: '',
        type,
        role,
        phoneNumber,
        guid: id,
      }
      return subscriber
    }),
    subscribersCount: contacts.length,
    isAutoRecording,
    isRecording,
    isPause,
  }

  if (index === -1) {
    addConference(updatedConference)
    return
  }

  innerData.value[index] = updatedConference
  triggerRef(innerData)
}
const updateFromContactStatus = (event: GroupStatusEvent) => {
  const { extendedParams: { contacts }, pServed } = event

  if (!contacts?.length || !pServed) return

  const { currentUser } = useAppStore()

  const currentPServedUser = currentUser?.imLogin

  if (!currentPServedUser) return

  const myState = contacts.find(contact => contact.id === currentPServedUser)
  const callId = myState?.calls?.at(0)?.id

  if (!callId) return

  for (const contact of contacts) {
    const call = contact.calls?.at(0)
    if (!call) continue

    const status: ContactIdMediaStatuses = {
      id: contact.id,
      handEnabled: contact.handEnabled,
      // mutedMyAudio deprecated — mute из streams (см. resolveContactAudioMuted)
      isAudioMuted: resolveContactAudioMuted(contact),
    }

    if (contact.id === currentPServedUser) {
      currentUserStatuses.value.set(call.id, status)
      triggerRef(currentUserStatuses)
    } else {
      updateObjectInMapArrayValue(subscribersStatuses.value, callId, status, 'id')
      triggerRef(subscribersStatuses)
    }
  }
}

const getConferenceContactStatusByPServed = (pServedRoom: PServed, pServedContact: PServed) => {
  const statuses = conferenceContactStatuses.value.get(pServedRoom)
  if (statuses) {
    return statuses.get(pServedContact)
  }
}

const getConfByPServed = (pServed: string): ConferenceDto | undefined => {
  return innerData.value.find((c) => c.pServed === pServed)
}

type MediaStatus = {
  isAudioMuted: boolean
  handEnabled: boolean
}

const getMediaStatus = (callId: string, pServed: string): MediaStatus => {
  const { currentUser } = useAppStore()
  const currentPServedUser = currentUser?.imLogin

  const DEFAULT = { isAudioMuted: false, handEnabled: false }

  if (!currentPServedUser) return DEFAULT
  // Проверяем, это текущий пользователь?
  if (pServed === currentPServedUser) {
    const status = currentUserStatuses.value.get(callId)
    if (status) {
      const { isAudioMuted, handEnabled } = status
      return { isAudioMuted, handEnabled }
    }
  }
  // Ищем среди подписчиков
  const subscribersArray = subscribersStatuses.value.get(callId)
  if (subscribersArray) {
    const status = subscribersArray.find(contact => contact.id === pServed)
    if (status) {
      const { isAudioMuted, handEnabled } = status
      return { isAudioMuted, handEnabled }
    }
  }

  return DEFAULT
}
onConferenceCreated((event) => {
  console.info('on conference created: ', event)
  const { getByInternalNumberOrCreateExternal } = useContactStore()
  const { settings } = useMainSettingsStore()
  const { roomEnableAutoRecording } = useRoomControl()

  const members = event.members ?? []

  addConference({
    pServed: event.pServed,
    name: event.name,
    subscribers: members.map((number) => {
      const contact = getByInternalNumberOrCreateExternal(number, false)
      const result: SubscriberDto = {
        pServed: contactNumberToPServed(contact.internalNumber),
        name: contact.name,
        phoneNumber: contact.internalNumber,
        email: contact.email ?? '',
        guid: contact.id,
        type: 'member',
        role: RoomMemberRole.User,
      }
      return result
    }),
    capacity: CAPACITY,
    domainPath: 'ROOT',
    selectorMode: ConferenceType.FREE_FOR_ALL,
    subscribersCount: members.length,
  })

  if (settings.isAutomaticallyConferenceRecordEnabled) {
    roomEnableAutoRecording(event.pServed).catch(console.error)
  }
})

onConferenceUpdated((event) => {
  const { selected, callManagerState } = useCallManagerState()

  updateConferenceContactStatuses(event)
  updateConferenceDto(event)
  updateFromContactStatus(event)

  const contactStates = event?.extendedParams?.contacts as ContactState[]
  if (contactStates) {
    useConferenceSubscriberStatusState().updateRoomMemberStatuses(event.pServed, contactStates)
  }

  // После обновления конференции необходимо обновить call manager state, иначе там сохраняется не актуальное значение
  if (selected.value?.pServed === event.pServed && (callManagerState.value === CallManagerState.CONFERENCE_VIEW || callManagerState.value === CallManagerState.CONFERENCE_CALL)) {
    selected.value = getConfByPServed(event.pServed)
  }
})

onConferenceEdited((event) => {
  const { currentUser } = useAppStore()
  const { removeByPServed } = usePinnedCallsStore()
  console.debug('on conference edited: ', event)

  const isConfDeleted = event.type === 'ConferenceRemoved'
  const isLeaveOrKick = event.type === 'ConferenceMemberRemoved' && 'targetNumber' in event && currentUser?.internalNumber === event.targetNumber
  if (isLeaveOrKick || isConfDeleted) {
    deleteConference(event.pServed)
    // Удаляем из pinned 
    removeByPServed(event.pServed)
    const { selected , setCallManagerState } = useCallManagerState()
    // если открыта карточка этой конфы, сбрасываем стейт
    if (selected.value?.pServed === event.pServed) {
      setCallManagerState(CallManagerState.INITIAL)
    }
  }

  // Если добавили юзера в конфу, то снова запрашиваем список конференций, загрузить её, т.к. в event приходит не полная модель конфы
  if(event.type === 'ConferenceMemberAddedEvent' && 'targetNumber' in event && currentUser?.internalNumber === event.targetNumber) {
    void fetchAll()
  }
})

export default () => {
  return {
    fetchAll,
    loading: readonly(loading),
    conferences: readonly(innerData),
    currentUserStatuses: readonly(currentUserStatuses),
    subscribersStatuses: readonly(subscribersStatuses),
    conferencesWithPServedKeys,
    conferenceContactStatuses,
    addConference,
    getMediaStatus,
    removeSubscriberFromConference,
    addSubscriberToConference,
    updateConferenceContactStatuses,
    getConferenceContactStatusByPServed,
    getConfByPServed,
    deleteConference,
  }
}
