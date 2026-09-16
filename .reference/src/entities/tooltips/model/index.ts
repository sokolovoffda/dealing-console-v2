import { ChainTooltipScenario } from '@wui/common-library'
import { computed, ref, watch } from 'vue'

import { router } from '@/app'

import { IDB, OBJECT_STORE_NAME_TOOLTIPS } from '@/shared/services'

import { TooltipsScenarios } from './scenarios'

const scenarios = ref(<Array<ChainTooltipScenario>>[])

const activeScenario = ref<ChainTooltipScenario | null>(null)

watch(() => activeScenario.value, async (value, oldValue) => {
  const { startScenario } = useTooltip()
  if (oldValue?.name === TooltipsScenarios.WELCOME && oldValue.viewed) {
    startScenario(TooltipsScenarios.MAIN_PAGE)
    return
  }

  const settingScenario = scenarios.value.find((scenario) => scenario.name === TooltipsScenarios.SETTINGS_PAGE)
  const shouldRedirect = oldValue?.name === TooltipsScenarios.CONTACT_VIEW_CARD && oldValue.viewed

  if (shouldRedirect) {
    await router.push({ name: settingScenario?.viewed ? 'MediaDevice' : 'Settings' })
  }
})

export const useTooltip = () => {
  const startScenario = (scenarioName: TooltipsScenarios) => {
    const scenario = scenarios.value.find((s) => s.name === scenarioName) ?? null
    if (scenario && !scenario.viewed) {
      activeScenario.value = scenario
    }
  }

  const finishScenario = async (scenarioName: string) => {
    _updateScenario(scenarioName, true)
    await _saveToIndexedDB(scenarioName, true)
    stopScenario()
  }

  const skipScenarios = async () => {
    for (const scenario of scenarios.value) {
      await finishScenario(scenario.name)
    }
  }

  const refreshScenarios = () => {
    _deleteFromIndexedDB()
  }

  const stopScenario = () => {
    activeScenario.value = null
  }

  const generateScenarios = () => {
    return Object.keys(TooltipsScenarios).map(key => ({
      name: TooltipsScenarios[key as keyof typeof TooltipsScenarios],
      viewed: false,
    }))
  }

  const loadScenarios = async () => {
    const dbScenarios = await _getFromIndexedDB() as ChainTooltipScenario[]
    const generatedScenarios = generateScenarios()

    // Используем Set для быстрого поиска дубликатов
    const dbScenarioNames = new Set(dbScenarios.map(s => s.name))

    const mergedScenarios: ChainTooltipScenario[] = []

    generatedScenarios.forEach(scenario => {
      if (!dbScenarioNames.has(scenario.name)) {
        mergedScenarios.push(scenario)
      }
    })

    // Объединяем с существующими из IndexedDB
    mergedScenarios.push(...dbScenarios)

    scenarios.value = mergedScenarios
  }

  const _updateScenario = (scenarioName: string, viewed: boolean) => {
    const scenarioIndex = scenarios.value.findIndex((s) => s.name === scenarioName)
    if (scenarioIndex !== -1) {
      scenarios.value[scenarioIndex].viewed = viewed
    } else {
      console.warn('Не найден сценарий по имени: ', scenarioName)
    }
  }

  const _saveToIndexedDB = async (scenarioName: string, viewed: boolean) => {
    try {
      const res = await IDB.saveData({
        objectStoreName: OBJECT_STORE_NAME_TOOLTIPS,
        key: scenarioName,
        data: { name: scenarioName, viewed },
      })
      console.debug('Сохранение в базу данных Indexed DB: ', res)
    } catch (e) {
      console.error(e)
    }
  }

  const _getFromIndexedDB = async () => {
    try {
      return await IDB.getAll<ChainTooltipScenario>({
        objectStoreName: OBJECT_STORE_NAME_TOOLTIPS,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const _deleteFromIndexedDB = () => {
    const scenarioNames = Object.values(TooltipsScenarios)
    try {
      for (const scenarioName of scenarioNames) {
        IDB.deleteData({
          objectStoreName: OBJECT_STORE_NAME_TOOLTIPS,
          key: scenarioName,
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const scenarioIsActive = computed(() => !!activeScenario.value)

  return {
    scenario: activeScenario,
    scenarios,
    scenarioIsActive,
    loadScenarios,
    skipScenarios,
    refreshScenarios,
    startScenario,
    finishScenario,
    stopScenario,
  }
}


