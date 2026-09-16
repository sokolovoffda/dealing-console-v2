import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useFastDialApi } from '../api/use-fast-dial-api'

import { normalizeFastDialGroup, normalizeFastDialPanel } from './normalizers'
import type {
  CreateFastDialGroupPayload,
  FastDialGroup,
  FastDialPanel,
  ReorderFastDialGroupPayload,
  UpdateFastDialGroupPayload,
} from './types'

const requireFastDialGroup = (group: FastDialGroup | null): FastDialGroup => {
  if (!group) {
    throw new Error('Invalid fast dial group response')
  }

  return group
}

export const useFastDialStore = defineStore('fast-dial', () => {
  const panel = ref<FastDialPanel | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const groups = computed(() => {
    return panel.value?.groups ?? []
  })

  const groupsByGroupGuid = computed(() => {
    return new Map(groups.value.map(group => [group.groupGuid, group]))
  })

  const setPanel = (nextPanel: FastDialPanel) => {
    panel.value = nextPanel
  }

  const upsertGroup = (nextGroup: FastDialGroup) => {
    const currentPanel = panel.value ?? {
      schemaVersion: 1,
      groups: [],
    }
    const nextGroups = currentPanel.groups.filter(group => group.id !== nextGroup.id)

    panel.value = {
      ...currentPanel,
      groups: [...nextGroups, nextGroup].sort((a, b) => a.order - b.order),
    }
  }

  const removeGroup = (id: string) => {
    if (!panel.value) return

    panel.value = {
      ...panel.value,
      groups: panel.value.groups.filter(group => group.id !== id),
    }
  }

  const fetchPanel = async (force = false): Promise<FastDialPanel> => {
    if (panel.value && !force) return panel.value

    const { fetchFastDialPanel } = useFastDialApi()

    try {
      loading.value = true
      error.value = null

      const { data } = await fetchFastDialPanel()
      const nextPanel = normalizeFastDialPanel(data)
      setPanel(nextPanel)

      return nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить настройки fast-dial'
      throw e
    } finally {
      loading.value = false
    }
  }

  const createGroup = async (payload: CreateFastDialGroupPayload): Promise<FastDialGroup> => {
    const { createFastDialGroup } = useFastDialApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await createFastDialGroup(payload)
      const nextGroup = requireFastDialGroup(normalizeFastDialGroup(data))
      upsertGroup(nextGroup)

      return nextGroup
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось создать fast-dial группу'
      throw e
    } finally {
      saving.value = false
    }
  }

  const reorderGroup = async (payload: ReorderFastDialGroupPayload): Promise<FastDialPanel> => {
    const { reorderFastDialGroup } = useFastDialApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await reorderFastDialGroup(payload)
      const nextPanel = normalizeFastDialPanel(data)
      setPanel(nextPanel)

      return nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось изменить порядок fast-dial групп'
      throw e
    } finally {
      saving.value = false
    }
  }

  const updateGroup = async (id: string, payload: UpdateFastDialGroupPayload): Promise<FastDialGroup> => {
    const { updateFastDialGroup } = useFastDialApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await updateFastDialGroup(id, payload)
      const nextGroup = requireFastDialGroup(normalizeFastDialGroup(data))
      upsertGroup(nextGroup)

      return nextGroup
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось обновить fast-dial группу'
      throw e
    } finally {
      saving.value = false
    }
  }

  const deleteGroup = async (id: string): Promise<void> => {
    const { deleteFastDialGroup } = useFastDialApi()

    try {
      saving.value = true
      error.value = null

      await deleteFastDialGroup(id)
      removeGroup(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось удалить fast-dial группу'
      throw e
    } finally {
      saving.value = false
    }
  }

  const getGroupByGroupGuid = (groupGuid: string): FastDialGroup | undefined => {
    return groupsByGroupGuid.value.get(groupGuid)
  }

  const reset = () => {
    panel.value = null
    error.value = null
  }

  return {
    panel,
    groups,
    groupsByGroupGuid,
    loading,
    saving,
    error,
    fetchPanel,
    createGroup,
    reorderGroup,
    updateGroup,
    deleteGroup,
    getGroupByGroupGuid,
    reset,
  }
})
