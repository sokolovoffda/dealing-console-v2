import { PServed } from '@wui/im'
import { defineStore, storeToRefs } from 'pinia'
import { shallowRef, triggerRef } from 'vue'

import { CustomizedContact, useRingtonesStore } from '@/entities/main-settings'
import { usePreferencesStore } from '@/entities/preference'

export const useCustomizeStore = defineStore('customize', () => {
  const customizedContacts = shallowRef<Map<PServed, CustomizedContact>>(new Map())

  const getCustomizeByPServed = (pServed: PServed) => {
    return customizedContacts.value.get(pServed)
  }

  const setColor = (pServed: PServed, color: string | undefined) => {
    const newValue = { ...customizedContacts.value.get(pServed), pServed, color }
    customizedContacts.value.set(pServed, newValue)
    triggerRef(customizedContacts)
    void updatePreferences()
  }

  const setRingtone = (pServed: PServed, ringtoneGuid: string) => {
    const ringtonesStore = useRingtonesStore()
    const { ringtonesList } = storeToRefs(ringtonesStore)

    const ringtonePath = ringtonesList.value.get(ringtoneGuid)?.path ?? ''
    customizedContacts.value.set(pServed, { ...customizedContacts.value.get(pServed), pServed, ringtoneGuid, ringtonePath })
    triggerRef(customizedContacts)
    void updatePreferences()
  }

  const addItems = async (pServeds: PServed[]) => {
    pServeds.forEach((pServed) => {
      customizedContacts.value.set(pServed, { pServed })
    })
    triggerRef(customizedContacts)
    await updatePreferences()
    return true
  }

  const addItem = (pServed: PServed) => {
    return addItems([pServed])
  }

  const removeItem = (pServed: PServed) => {
    customizedContacts.value.delete(pServed)
    triggerRef(customizedContacts)
    void updatePreferences()
  }

  const updatePreferences = async () => {
    try {
      await usePreferencesStore().setPreferences('customize', Object.fromEntries(customizedContacts.value))
    } catch (e) {
      console.error(e)
    }
  }

  const loadByPreferences = (items?: Record<PServed, CustomizedContact>) => {
    if (!items) return
    console.debug('loadByPreferences: Customize', items)
    Object.keys(items).forEach((key: PServed) => {
      customizedContacts.value.set(key, items[key] as CustomizedContact)
    })
    triggerRef(customizedContacts)
  }

  return {
    customizedContacts,
    getCustomizeByPServed,
    setColor,
    setRingtone,
    addItem,
    addItems,
    removeItem,
    loadByPreferences,
    $reset: () => {
      customizedContacts.value = new Map()
      triggerRef(customizedContacts)
    },
  }
})
