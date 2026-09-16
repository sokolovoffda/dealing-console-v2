import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useContactStore } from '@/entities/contact'
import { decodeGroupNameFromRtu } from '@/entities/group'

import type { ContactTab, ContactTabId } from './types'

const isUserGroup = (group: { type?: string }) => {
  return group.type === 'user'
}

const mapGroupToTab = (group: { guid: string, name: string }, index: number): ContactTab => ({
  id: group.guid,
  groupGuid: group.guid,
  // WUI-5640: имя на RTU может быть с `_` вместо пробелов
  name: decodeGroupNameFromRtu(group.name),
  order: index + 1,
  enabled: true,
})

export const useContactTabs = defineStore('tabs-store', () => {
  const tabs = ref<ContactTab[]>([])
  const activeTabId = ref<ContactTabId | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  const sortedTabs = computed(() => {
    return [...tabs.value].sort((a, b) => a.order - b.order)
  })

  const enabledTabs = computed(() => {
    return sortedTabs.value.filter(tab => tab.enabled)
  })


  const activeTab = computed(() => {
    return tabs.value.find(tab => tab.id === activeTabId.value) ?? null
  })

  const hasTabs = computed(() => {
    return enabledTabs.value.length > 0
  })

  const setActiveTab = (tabId: ContactTabId) => {
    const nextActiveTab = enabledTabs.value.find(tab => tab.id === tabId)
    if (!nextActiveTab) return

    activeTabId.value = nextActiveTab.id
  }

  const setAvailableActiveTab = (preferredGroupGuid?: string) => {
    const preferredActiveTab = preferredGroupGuid
      ? enabledTabs.value.find(tab => tab.groupGuid === preferredGroupGuid)
      : undefined

    activeTabId.value = preferredActiveTab?.id ?? enabledTabs.value[0]?.id ?? null
  }

  /** Локально после успешного POST — не ждём GET (у backend бывает лаг на один create). */
  const addTabAndActivate = (group: { guid: string, name: string }) => {
    const existingTab = tabs.value.find(tab => tab.groupGuid === group.guid)

    if (existingTab) {
      activeTabId.value = existingTab.id
      return
    }

    tabs.value = [
      ...tabs.value,
      mapGroupToTab(group, tabs.value.length),
    ]
    activeTabId.value = group.guid
    isInitialized.value = true
    error.value = null
  }

  /** Локально после успешного DELETE — убираем таб сразу, без повторного GET. */
  const removeTabAndActivate = (groupGuid: string, preferredActiveGroupGuid?: string) => {
    tabs.value = tabs.value
      .filter(tab => tab.groupGuid !== groupGuid)
      .map((tab, index) => ({
        ...tab,
        order: index + 1,
      }))

    setAvailableActiveTab(preferredActiveGroupGuid)
  }

  const initTabs = async (force = false, preferredActiveGroupGuid?: string) => {
    if (isInitialized.value && !force) return

    const contactStore = useContactStore()
    const previousActiveGroupGuid = preferredActiveGroupGuid ?? activeTab.value?.groupGuid

    try {
      loading.value = true
      error.value = null

      const groups = await contactStore.fetchAllGroups(false)
      tabs.value = groups.filter(isUserGroup).map(mapGroupToTab)
      setAvailableActiveTab(previousActiveGroupGuid)
      isInitialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить вкладки контактов'
      tabs.value = []
      activeTabId.value = null
      isInitialized.value = false
    } finally {
      loading.value = false
    }
  }

  const refreshTabs = async (preferredActiveGroupGuid?: string) => {
    await initTabs(true, preferredActiveGroupGuid)
  }

  const $reset = () => {
    tabs.value = []
    activeTabId.value = null
    loading.value = false
    error.value = null
    isInitialized.value = false
  }

  return {
    tabs,
    activeTabId,
    loading,
    error,
    isInitialized,
    sortedTabs,
    enabledTabs,
    activeTab,
    hasTabs,
    initTabs,
    refreshTabs,
    setActiveTab,
    addTabAndActivate,
    removeTabAndActivate,
    $reset,
  }
})
