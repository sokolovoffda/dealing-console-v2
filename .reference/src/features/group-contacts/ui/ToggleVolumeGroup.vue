<template>
  <icon-button
    :icon="group?.volumeState ? 'audioControl' : 'mute'"
    :active="group?.volumeState"
    :disabled="isEditMode"
    title="Заглушить группу"
    @click="groupContactsStore.toggleVolumeForGroup(groupIdx)"
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
