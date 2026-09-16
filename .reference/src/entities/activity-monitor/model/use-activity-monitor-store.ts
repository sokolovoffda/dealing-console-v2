import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useActivityMonitorApi } from '../api/use-activity-monitor-api'

import {
  buildActivityMonitorGridCells,
  isValidActivityMonitorCellIndex,
  normalizeActivityMonitorPanel,
  normalizeActivityMonitorSubscriptions,
  toActivityMonitorSubscriptionsPayload,
} from './normalizers'
import {
  ACTIVITY_MONITOR_SCHEMA_VERSION,
  type ActivityMonitorPanel,
  type ActivityMonitorSubscription,
  type ActivityMonitorSubscriptionPayload,
  type ReorderActivityMonitorSubscriptionsPayload,
} from './types'

const createEmptyActivityMonitorPanel = (): ActivityMonitorPanel => ({
  schemaVersion: ACTIVITY_MONITOR_SCHEMA_VERSION,
  subscriptions: [],
})

const requireActivityMonitorSubscription = (
  subscription: ActivityMonitorSubscription | undefined,
): ActivityMonitorSubscription => {
  if (!subscription) {
    throw new Error('Invalid activity monitor subscription response')
  }

  return subscription
}

export const useActivityMonitorStore = defineStore('activity-monitor', () => {
  const panel = ref<ActivityMonitorPanel | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const isEditMode = ref(false)

  const subscriptions = computed(() => panel.value?.subscriptions ?? [])

  const gridCells = computed(() => buildActivityMonitorGridCells(subscriptions.value))

  const subscriptionsByContactGuid = computed(() => {
    return new Map(subscriptions.value.map(subscription => [subscription.contactGuid, subscription]))
  })

  const setPanel = (nextPanel: ActivityMonitorPanel) => {
    panel.value = nextPanel
  }

  const setEditMode = (value: boolean) => {
    isEditMode.value = value
  }

  const toggleEditMode = () => {
    isEditMode.value = !isEditMode.value
  }

  const upsertSubscription = (nextSubscription: ActivityMonitorSubscription) => {
    const currentPanel = panel.value ?? createEmptyActivityMonitorPanel()
    const nextSubscriptions = currentPanel.subscriptions.filter(subscription => (
      subscription.contactGuid !== nextSubscription.contactGuid
      && subscription.cellIndex !== nextSubscription.cellIndex
    ))

    panel.value = {
      ...currentPanel,
      subscriptions: [...nextSubscriptions, nextSubscription]
        .sort((left, right) => left.cellIndex - right.cellIndex),
    }
  }

  const removeSubscription = (contactGuid: string) => {
    if (!panel.value) return

    panel.value = {
      ...panel.value,
      subscriptions: panel.value.subscriptions.filter(
        subscription => subscription.contactGuid !== contactGuid,
      ),
    }
  }

  const fetchPanel = async (force = false): Promise<ActivityMonitorPanel> => {
    if (panel.value && !force) return panel.value

    const { fetchActivityMonitorPanel } = useActivityMonitorApi()

    try {
      loading.value = true
      error.value = null

      const { data } = await fetchActivityMonitorPanel()
      const nextPanel = normalizeActivityMonitorPanel(data)
      setPanel(nextPanel)

      return nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить монитор активности'
      throw e
    } finally {
      loading.value = false
    }
  }

  const createSubscription = async (
    payload: ActivityMonitorSubscriptionPayload,
  ): Promise<ActivityMonitorSubscription> => {
    if (!isValidActivityMonitorCellIndex(payload.order)) {
      throw new Error('Invalid activity monitor cell index')
    }

    const { createActivityMonitorSubscription } = useActivityMonitorApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await createActivityMonitorSubscription(payload)
      const nextSubscription = requireActivityMonitorSubscription(
        normalizeActivityMonitorSubscriptions([data])[0],
      )
      upsertSubscription(nextSubscription)

      return nextSubscription
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось добавить подписку монитора активности'
      throw e
    } finally {
      saving.value = false
    }
  }

  const replaceSubscriptions = async (
    nextSubscriptions: ActivityMonitorSubscription[],
  ): Promise<ActivityMonitorPanel> => {
    const { replaceActivityMonitorSubscriptions } = useActivityMonitorApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await replaceActivityMonitorSubscriptions({
        subscriptions: toActivityMonitorSubscriptionsPayload(nextSubscriptions),
      })
      const nextPanel = normalizeActivityMonitorPanel(data)
      setPanel(nextPanel)

      return nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось сохранить подписки монитора активности'
      throw e
    } finally {
      saving.value = false
    }
  }

  const reorderSubscriptions = async (
    payload: ReorderActivityMonitorSubscriptionsPayload,
  ): Promise<ActivityMonitorPanel> => {
    if (
      !isValidActivityMonitorCellIndex(payload.fromOrder)
      || !isValidActivityMonitorCellIndex(payload.toOrder)
    ) {
      throw new Error('Invalid activity monitor reorder indexes')
    }

    const { reorderActivityMonitorSubscriptions } = useActivityMonitorApi()

    try {
      saving.value = true
      error.value = null

      const { data } = await reorderActivityMonitorSubscriptions(payload)
      const nextPanel = normalizeActivityMonitorPanel(data)
      setPanel(nextPanel)

      return nextPanel
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось изменить порядок подписок монитора активности'
      throw e
    } finally {
      saving.value = false
    }
  }

  const deleteSubscription = async (contactGuid: string): Promise<void> => {
    const { deleteActivityMonitorSubscription } = useActivityMonitorApi()

    try {
      saving.value = true
      error.value = null

      await deleteActivityMonitorSubscription(contactGuid)
      removeSubscription(contactGuid)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось удалить подписку монитора активности'
      throw e
    } finally {
      saving.value = false
    }
  }

  const getSubscriptionByContactGuid = (
    contactGuid: string,
  ): ActivityMonitorSubscription | undefined => {
    return subscriptionsByContactGuid.value.get(contactGuid)
  }

  const reset = () => {
    panel.value = null
    error.value = null
    isEditMode.value = false
  }

  return {
    panel,
    subscriptions,
    gridCells,
    subscriptionsByContactGuid,
    loading,
    saving,
    error,
    isEditMode,
    fetchPanel,
    setEditMode,
    toggleEditMode,
    createSubscription,
    replaceSubscriptions,
    reorderSubscriptions,
    deleteSubscription,
    getSubscriptionByContactGuid,
    reset,
  }
})
