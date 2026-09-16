<template>
  <app-modal
    :title="title"
    :confirm-text="confirmText"
    :confirm-disabled="isConfirmDisabled"
    :auto-close-on-confirm="false"
    @confirm="handleConfirm"
  >
    <wui-combobox
      v-model="selectedOrders"
      :is-multiple="true"
      :items="selectItems"
      title="Выберите линию"
      placeholder="Введите или выберите из списка"
      :size="48"
      data-test="add-broadcast-group-members-combobox"
    />
  </app-modal>
</template>

<script setup lang="ts">
import { closeDialogKey, WuiCombobox } from '@wui/common-library'
import type { SelectItem } from '@wui/common-library'
import { computed, ref } from 'vue'

import type { PinnedCallGroupMember } from '@/entities/pinned-calls'

import { AppModal } from '@/shared/ui'
import { safeInject } from '@/shared/utils/safeInject'

import type {
  AddBroadcastGroupMembersModalResult,
  AddBroadcastGroupMembersOption,
} from '../model/add-broadcast-group-members-modal'

const props = withDefaults(defineProps<{
  options: AddBroadcastGroupMembersOption[]
  initialSelectedOrders?: number[]
  title?: string
  confirmText?: string
  /** Разрешить сохранить пустой состав (режим «Изменить состав»). */
  allowEmptySelection?: boolean
}>(), {
  initialSelectedOrders: () => [],
  title: 'Добавить бродкаст группу',
  confirmText: 'Добавить',
  allowEmptySelection: false,
})

const closeDialog = safeInject<(value?: AddBroadcastGroupMembersModalResult) => void>(closeDialogKey)

const selectedOrders = ref<number[]>([...props.initialSelectedOrders])

const selectItems = computed<SelectItem<number>[]>(() => {
  return props.options.map(option => ({
    value: option.order,
    label: option.title,
  }))
})

const optionsByOrder = computed(() => {
  return new Map(props.options.map(option => [option.order, option]))
})

const isConfirmDisabled = computed(() => {
  if (props.allowEmptySelection) {
    return false
  }

  return selectedOrders.value.length === 0
})

const handleConfirm = () => {
  if (isConfirmDisabled.value) return

  const members: PinnedCallGroupMember[] = []

  for (const order of selectedOrders.value) {
    const option = optionsByOrder.value.get(order)
    if (!option) continue

    members.push({
      pServed: option.pServed,
      slotIndex: option.slotIndex,
    })
  }

  closeDialog({ members })
}
</script>
