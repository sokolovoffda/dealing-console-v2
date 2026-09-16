<template>
  <component
    :is="component"
    v-click-outside="close"
    :tab="tab"
    :name="name"
    @next="next"
    @edit="close"
    @exit="close"
    @back="back"
  />
</template>

<script setup lang="ts">
import { closeDialogKey, ClickOutside as vClickOutside, safeInject } from '@wui/common-library'
import { computed, ref, watch } from 'vue'

import type { ContactTab } from '@/entities/settings'

import TabContactsForm from './childrens/tab-contacts-form.vue'
import TabNameForm from './childrens/tab-name-form.vue'

const props = defineProps<{
  tab?: ContactTab
  field?: 'name' | 'contacts'
}>()

const closeModal = safeInject(closeDialogKey)
const close = (value?: unknown) => {
  closeModal(value)
}

const name = ref<string>('')
const currentStep = ref<'name' | 'contacts'>('name')

const componentsMap = {
  name: TabNameForm,
  contacts: TabContactsForm,
} as const

const component = computed(() => {
  return componentsMap[currentStep.value]
})

const next = (newName: string) => {
  name.value = newName
  currentStep.value = 'contacts'
}

const back = () => {
  currentStep.value = 'name'
}

watch(() => props.field, (newField) => {
  if (newField === 'name' || newField === 'contacts') {
    currentStep.value = newField
  }
}, { immediate: true })
</script>
