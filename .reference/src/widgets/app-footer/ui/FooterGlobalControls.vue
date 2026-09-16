<template>
  <div v-chain-tooltip="tooltips.rightPanel" class="flex items-center gap-55">
    <div class="flex gap-4">
      <global-app-volume-control />
      <global-app-microphone-control />
    </div>
    <my-btn
      icon
      mode="toggle"
      :size="72"
      fixed-size
      variant="neutcon"
      tone="dark"
      :active="isHeaderHidden"
      :prepend-icon="isHeaderHidden ? 'layoutShowM' : 'layoutHideM'"
      @click="emit('toggle-header')"
    />
  </div>
</template>

<script lang="ts" setup>
import { vChainTooltip } from '@wui/common-library'

import { GlobalAppMicrophoneControl, GlobalAppVolumeControl } from '@/features/app-audio-controls'

import { tooltips } from '@/entities/tooltips'

import { MyBtn } from '@/shared/ui'

defineProps<{
  isHeaderHidden: boolean
}>()

const emit = defineEmits<{
  'toggle-header': []
}>()
</script>
