import { defineStore, storeToRefs } from 'pinia'
import { Ref, ShallowRef, shallowRef, triggerRef } from 'vue'

import { CallStatusState, SubscriberStatus } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'

type InternalNumber = string

export const useContactStatusState = defineStore('blf-store', () => {
  const contactStatuses: Ref<Record<string, SubscriberStatus>> = shallowRef({})
  const contactStatuses2: ShallowRef<Map<InternalNumber, Array<SubscriberStatus>>> = shallowRef(new Map())

  const updateRemote = (status: SubscriberStatus) => {
    contactStatuses.value[status.internalNumber] = status
    triggerRef(contactStatuses)
  }
  
  const _addStatus = (status: SubscriberStatus) => {
    const { currentUser } = storeToRefs(useAppStore())
    // если линии с нами - игнорируем, т.к. взаимодействовать с ней не можем, ни перехват, ни что-то другое
    if([status.fromNumber, status.targetNumber].includes(currentUser.value?.internalNumber)) {
      return
    }
  
    if (!contactStatuses2.value.has(status.internalNumber)) {
      // Если статуса ещё нет, создаем новый массив с текущим статусом
      contactStatuses2.value.set(status.internalNumber, [status])
    } else {
      const statusArray = contactStatuses2.value.get(status.internalNumber) as SubscriberStatus[]
      // Проверяем, есть ли уже статус с последним callId
      const existingStatusIndex = statusArray.findIndex(oldStatus => oldStatus.callId === status.callId)
      if (existingStatusIndex >= 0) {
        // Если статус с таким callId существует, обновляем его
        statusArray[existingStatusIndex] = status
      } else {
        // Если статус с таким callId не существует, добавляем новый статус в массив
        statusArray.push(status)
      }
      contactStatuses2.value.set(status.internalNumber, [...statusArray])
    }
    triggerRef(contactStatuses2)
  }
  const _removeStatus = (status: SubscriberStatus) => {
    if (contactStatuses2.value.has(status.internalNumber)) {
      const statusArray = contactStatuses2.value.get(status.internalNumber) as SubscriberStatus[]
      const updatedArray = statusArray.filter((oldStatus) => oldStatus.callId !== status.callId)
      if (updatedArray.length) {
        contactStatuses2.value.set(status.internalNumber, updatedArray)
      } else {
        contactStatuses2.value.delete(status.internalNumber)
      }
    } else {
      // contactStatuses2.value.set(status.internalNumber, [])
      // console.warn(`Не найден статус: ${status} в массиве contactStatuses`)
    }
    triggerRef(contactStatuses2)
  }
  const updateRemote2 = (status: SubscriberStatus) => {
    if (status.remote === CallStatusState.EARLY) {
      _addStatus(status)
    } else if (status.remote === CallStatusState.CONFIRMED) {
      _addStatus(status)
    } else if (status.remote === CallStatusState.TERMINATED) {
      _removeStatus(status)
    }
  }
  
  const updateLocal = ({ internalNumber, local }: SubscriberStatus) => {
    if (contactStatuses.value[internalNumber]) {
      contactStatuses.value[internalNumber] = {
        ...contactStatuses.value[internalNumber],
        local,
      }
    } else {
      contactStatuses.value[internalNumber] = {
        registered: local !== CallStatusState.TERMINATED,
        internalNumber,
        local,
      }
    }
    triggerRef(contactStatuses)
  }
  
  const findLinesByInternalNumber = (internalNumber: InternalNumber): Array<SubscriberStatus> => {
    return contactStatuses2.value.get(internalNumber) ?? []
  }

  const $reset = () => {
    contactStatuses.value = {}
    contactStatuses2.value = new Map()
    triggerRef(contactStatuses)
    triggerRef(contactStatuses2)
  }

  return {
    updateRemote,
    updateLocal,
    updateLine: updateRemote2,
    contactStatuses,
    lines: contactStatuses2,
    findLinesByInternalNumber,
    $reset,
  }
})
