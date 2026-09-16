<template>
  <div class="overflow-hidden flex flex-row h-[80px] !bg-black-800 border-black-700 rounded-8">
    <wui-btn
      v-if="editMode && clickable"
      icon
      prepend-icon="addCircleOutlined"
      class="w-full !bg-black-800"
      :class="isActivePinned ? '!text-black-400 border border-black-400' : '!text-black-700 cursor-not-allowed'"
      large
      @click="isActivePinned && emit('add')"
    />
    <div v-else-if="editMode" class="rounded-8 w-full  bg-black-800/60" />
  </div>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'
import { computed } from 'vue'

import { usePinnedCallsStore } from '@/entities/call-session'

defineProps<{
  editMode: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{
  (e:'add'):void
}>()

const pinnedCallsStore = usePinnedCallsStore()
const isActivePinned = computed(() => !!pinnedCallsStore.activePinnedCall)
</script>
