<template>
  <div>
    <table class="table">
      <table-head :items="headers" />
      <tbody>
        <template
          v-for="(item, index) in sortedItems"
          :key="item.guid + index"
        >
          <forwarding-default-rule-row
            v-if="item.isDefault"
            :current-condition="currentCondition"
            :model-value="item"
            :index="index"
            :list="sortedItems"
            @save="onSaveItem"
          />
          <forwarding-rule-row
            v-else
            :is-new-create-rule="false"
            :current-condition="currentCondition"
            :model-value="item"
            :index="index"
            :list="sortedItems"
            @save="onSaveItem"
            @remove="onRemoveItem(item)"
          />
        </template>
        <template
          v-for="(forwarding, index) in creatingForwardings"
          :key="index"
        >
          <forwarding-rule-row
            :is-new-create-rule="true"
            :index="index"
            :not-show-priority="true"
            :current-condition="currentCondition"
            :model-value="forwarding"
            @save="onSaveItem"
            @remove="onRemoveCreating(forwarding)"
          />
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import {
  useForwardingSettingsStore,
  ForwardingRuleRow, ForwardingDefaultRuleRow,
  Forwarding, ForwardingConditions,
} from '@/entities/forwarding-settings'

import { useLocalization } from '@/shared/i18n'
import { TableHead } from '@/shared/ui'

const props = defineProps<{
  items: Forwarding[],
  creatingForwardings: Forwarding[],
  currentCondition: ForwardingConditions,
}>()

const emit = defineEmits<{
  (event: 'removeItem', value: Forwarding): void;
  (event: 'removeCreating', value: Forwarding): void;
}>()

const forwardingSettingsStore = useForwardingSettingsStore()
const { t } = useLocalization()

const headers = computed(() => [t('On'), t('Priority'), t('Service'), t('Condition'), t('A-number'), t('ForwardingNumber'), t('Action')])

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => b.priority - a.priority)
})

const onSaveItem = async (model: Forwarding, onCompleted: () => void): Promise<void> => {
  if(model.guid) {
    const item = forwardingSettingsStore.getForwardingByGuid(props.currentCondition, model.guid)
    if (!item) { console.debug(`Правило с guid ${model.guid} не найдено`); return }
    await forwardingSettingsStore.saveForwarding(model)
  } else { // create
    await forwardingSettingsStore.addForwarding(model)
  }
  onCompleted()
  await forwardingSettingsStore.loadAllForwardings()
}

const onRemoveItem = (item: Forwarding): void => {
  emit('removeItem', item)
}

const onRemoveCreating = (item: Forwarding): void => {
  emit('removeCreating', item)
}
</script>
