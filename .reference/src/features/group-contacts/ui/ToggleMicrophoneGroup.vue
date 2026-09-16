<template>
  <icon-button
    :icon="group?.micState ? 'micOutlined' : 'micOffOutlined'"
    :active="group?.micState"
    :disabled="isEditMode"
    title="Вкл/выкл микрофон"
    @click="groupContactsStore.toggleMicForGroup(groupIdx)"
  />
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useGroupContactsStore } from '@/entities/group-contacts'

import { IconButton } from '@/shared/ui'

const props = defineProps<{
  groupIdx: number
}>()

const groupContactsStore = useGroupContactsStore()
const { isEditMode } = storeToRefs(groupContactsStore)
const group = computed(() => groupContactsStore.getGroupByIdx(props.groupIdx))
</script>
