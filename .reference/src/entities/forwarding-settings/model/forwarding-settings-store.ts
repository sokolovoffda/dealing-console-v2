import { SelectItem, TimetableTemplate } from '@wui/common-library'
import { defineStore } from 'pinia'
import { computed, readonly, Ref, ref } from 'vue'

import { PriorityDirections, useForwardingApi } from '@/entities/forwarding-settings'

import { useLocalization } from '@/shared/i18n'

import { Forwarding, ForwardingConditions, ScenarioValue, SubscriberServices } from '../types'

export const useForwardingSettingsStore = defineStore('forwarding-settings', () => {
  const { t } = useLocalization()
  const forwarding: Ref<Map<ForwardingConditions, Forwarding[]>> = ref(new Map([[ForwardingConditions.ALL, []]]))
  const isForwardingLoading = ref(false)
  const isForwardingSaving = ref(false)
  const subscriberServices: Ref<Map<string, SubscriberServices>> = ref(new Map())
  const scenarios: Ref<Map<string, ScenarioValue>> = ref(new Map())
  const timetableTemplates: Ref<TimetableTemplate[]> = ref([])

  const getForwardingByCondition = computed(() => {
    return (condition: ForwardingConditions) => forwarding.value.get(condition)
  })

  const getForwardingByGuid = computed(() =>  {
    return (condition: ForwardingConditions, guid: string) => forwarding.value.get(condition)?.find(item => item.guid === guid)
  })

  const getSubscriberServicesFromArray = computed(() =>  {
    return Array.from(subscriberServices.value, ([, value]) => value)
  })

  const servicesList = computed(() => {
    const labels = {
      Forward: t('Forward'),
      DoNotDisturb: t('DoNotDisturb'),
      BlackWhiteList: t('BlackWhiteList'),
      VoiceMailForwarding: t('VoiceMailForwarding'),
      FollowMe: t('FollowMe'),
      IVR: t('IVR'),
    }
    const services: SelectItem[] = []
    subscriberServices.value.forEach((value: SubscriberServices, key: string) => {
      if(!['Forward', 'DoNotDisturb'].includes(value)) return // пока реализуем только Переадресация и Не-беспокоить
      const label = labels[value as unknown as keyof typeof SubscriberServices]
      services.push({
        label,
        value: key,
      })
    })
    return services
  })

  const getScenariosList = computed(() => {
    return (serviceKey: string) => {
      const scenario = scenarios.value.get(serviceKey)
      if (!scenario) return

      return Object.keys(scenario).map((key: string) => ({
        label: scenario[key],
        value: key,
      }))
    }
  })

  // используется в jssip
  const maxPriorityCallForwardingOnBusy = computed(() => {
    const rules = forwarding.value.get(ForwardingConditions.BUSY)
    if (!rules) return null
    const result = rules.reduce((acc, rule) => {
      if (rule.enabled && rule.priority > acc.priority) {
        return rule
      } else {
        return acc
      }
    }, { priority: -Infinity } as Forwarding)
    if (result.priority === -Infinity) return null
    return result
  })

  const setForwarding = (condition: ForwardingConditions, forwardingPayload: Forwarding) => {
    const forwardings = forwarding.value.get(condition)
    if (!forwardings) return

    const index = forwardings.findIndex(item => item.guid === forwardingPayload.guid)
    if (index > -1) {
      forwardings[index] = forwardingPayload
    }
  }

  const removeForwardingFromStore = (forwardingPayload: Forwarding) => {
    const forwardings = forwarding.value.get(forwardingPayload.condition as ForwardingConditions)
    if (!forwardings) return

    forwarding.value.set(
      forwardingPayload.condition as ForwardingConditions,
      forwardings.filter((item: Forwarding) => item.guid !== forwardingPayload.guid),
    )

    const allForwardings = forwarding.value.get(ForwardingConditions.ALL)
    if (!allForwardings) return

    forwarding.value.set(
      ForwardingConditions.ALL,
      allForwardings.filter((item: Forwarding) => item.guid !== forwardingPayload.guid),
    )
  }

  const loadAllForwardings = async () => {
    const conditions = Object.values(ForwardingConditions).filter((condition: ForwardingConditions) => condition !== ForwardingConditions.ALL)

    const promises: Promise<void>[] = conditions.map((condition: ForwardingConditions) => loadForwarding(condition))

    try {
      await Promise.all(promises)

      forwarding.value.set(ForwardingConditions.ALL, [])

      forwarding.value.forEach((value: Forwarding[], key: ForwardingConditions) => {
        if (key !== ForwardingConditions.ALL) {
          const all = forwarding.value.get(ForwardingConditions.ALL) ?? []
          forwarding.value.set(ForwardingConditions.ALL, [...all, ...value])
        }
      })
    } catch (e) {
      console.error(e)
    }
  }

  const loadForwarding = async (condition: ForwardingConditions = ForwardingConditions.UNCONDITIONAL) => {
    isForwardingLoading.value = true
    const api = useForwardingApi()
    try {
      const { data } = await api.getForwarding(condition)

      forwarding.value.set(condition, data)
    } catch (e) {
      console.error(e)
    } finally {
      isForwardingLoading.value = false
    }
  }

  const loadSubscriberServices = async () => {
    const api = useForwardingApi()
    const { data } = await api.getSubscriberServices()

    for (const key in data) {
      subscriberServices.value.set(key, data[key])
    }
  }

  const loadScenarios = async () => {
    const api = useForwardingApi()
    const { data } = await api.getScenarios()
    for (const key in data) {
      scenarios.value.set(key, data[key])
    }
  }

  const removeForwardingItem = async (guid: string) => {
    const api = useForwardingApi()
    try {
      await api.removeForwardingItem(guid)
    } catch (e) {
      console.error(e)
      throw new Error('Не удалось удалить правило обработки входящего вызова')
    }
  }

  const addForwarding = async (forwarding: Forwarding) => {
    isForwardingSaving.value = true

    const api = useForwardingApi()
    try {
      await api.addForwarding(forwarding)
    } catch (e) {
      console.error(e)
      throw new Error('Не удалось создать новое правило обработки входящего вызова')
    } finally {
      isForwardingSaving.value = false
    }
  }

  const saveForwarding = async (forwarding: Forwarding) => {
    isForwardingSaving.value = true

    const api = useForwardingApi()
    try {
      await api.saveForwarding(forwarding)
    } catch (e) {
      console.error(e)
    } finally {
      isForwardingSaving.value = false
    }
  }

  const loadTimetableTemplates = async () => {
    const api = useForwardingApi()
    const { data } = await api.getTimetableTemplates()

    timetableTemplates.value = data
  }

  const changePriority = (direction: PriorityDirections, item: Forwarding, nearestItem: Forwarding) => {
    const oldPriority = item.priority
    let newPriority = nearestItem.priority

    if (oldPriority === newPriority) {
      newPriority = (direction === 'down') ? newPriority - 1 : newPriority + 1
    }

    item.priority = newPriority < 0 ? 0 : newPriority
    nearestItem.priority = oldPriority

    void saveForwarding(item)
    void saveForwarding(nearestItem)
  }

  return {
    forwarding: readonly(forwarding),
    isForwardingLoading: readonly(isForwardingLoading),
    isForwardingSaving: readonly(isForwardingSaving),
    subscriberServices: readonly(subscriberServices),
    scenarios: readonly(scenarios),
    timetableTemplates,
    getForwardingByCondition: readonly(getForwardingByCondition),
    getForwardingByGuid: readonly(getForwardingByGuid),
    getSubscriberServicesFromArray: readonly(getSubscriberServicesFromArray),
    servicesList,
    getScenariosList: readonly(getScenariosList),
    maxPriorityCallForwardingOnBusy: readonly(maxPriorityCallForwardingOnBusy),
    setForwarding,
    removeForwardingFromStore,
    loadAllForwardings,
    loadSubscriberServices,
    loadScenarios,
    removeForwardingItem,
    addForwarding,
    saveForwarding,
    loadTimetableTemplates,
    changePriority,
  }
})
