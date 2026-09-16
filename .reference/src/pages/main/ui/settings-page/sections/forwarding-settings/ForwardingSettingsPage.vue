<template>
  <section class="bg-black-800 h-full flex flex-col justify-between">
    <header class="bg-black-735 px-4 py-3">
      <h3 class="text-1624">{{ $t('IncomingCallProcessing') }}</h3>
    </header>
    <forwarding-settings-rules-table
      v-if="items.length"
      class="overflow-y-auto grow"
      :items="items"
      :creating-forwardings="creatingForwardings"
      :current-condition="currentCondition"
      @remove-creating="onRemoveCreating"
      @remove-item="onRemoveItem"
    />
    <div v-else-if="isForwardingLoading" class="flex justify-center py-2">
      <wui-icon name="animatedLoaderWheel" />
    </div>
    <footer class="flex items-center justify-center bg-black-700 py-3">
      <icon-button icon="addCircleOutlined" class="shadow-[0_0_2px_0_rgba(0,0,0,0.5)] border-none !bg-black-600" @click="onClickAdd" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

import { ForwardingSettingsRulesTable } from '@/widgets/forwarding-settings'

import {
  useForwardingSettingsStore,
  helper,
  Forwarding, ForwardingConditions,
} from '@/entities/forwarding-settings'

import { IconButton } from '@/shared/ui'

const { getForwardingTemplate } = helper

const forwardingSettingsStore = useForwardingSettingsStore()
const {
  removeForwardingFromStore,
  loadSubscriberServices,
  loadScenarios,
  removeForwardingItem,
  loadAllForwardings,
  loadTimetableTemplates,
} = forwardingSettingsStore


const { isForwardingLoading, timetableTemplates } = storeToRefs(forwardingSettingsStore)

onMounted(async () => {
  await loadSubscriberServices()
  await loadAllForwardings()
  await loadScenarios()
  await loadTimetableTemplates()
})

const creatingForwardings = ref<Forwarding[]>([])

const currentCondition = ref(ForwardingConditions.ALL)

const featuresItems = ref<Forwarding[]>([])

const items = computed(() => {
  const items = forwardingSettingsStore.getForwardingByCondition(currentCondition.value) ?? []

  if (currentCondition.value !== ForwardingConditions.ALL
   && currentCondition.value !== ForwardingConditions.BUSY) {
    return items
  }

  return [...featuresItems.value, ...items]
})

const onClickAdd = () => {
  let allItems = [...creatingForwardings.value]
  if (items.value) allItems = [...allItems, ...items.value]

  let maxPriority = Math.max(...allItems.map((item) => item.priority))
  if (maxPriority === Infinity) maxPriority = 0
  maxPriority = maxPriority + 1
  creatingForwardings.value.push(getForwardingTemplate(ForwardingConditions.UNCONDITIONAL, timetableTemplates.value, maxPriority))
}

const onRemoveItem = async (item: Forwarding): Promise<void> => {
  try {
    await removeForwardingItem(item.guid)
    removeForwardingFromStore(item)
  } catch (e: unknown) {
    console.error(e)
  }
}

const onRemoveCreating = (forwarding: Forwarding) => {
  creatingForwardings.value = creatingForwardings.value.filter(item => item !== forwarding)
}
</script>
