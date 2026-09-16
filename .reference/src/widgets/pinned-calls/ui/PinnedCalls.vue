<template>
  <div v-chain-tooltip="tooltips.pinnedCalls" class="flex gap-2 p-2 bg-black-735 border border-black-700 mb-2 rounded-8">
    <pinned-calls-sidebar-entity>
      <template #buttons>
        <div class="grid grid-cols-3 grid-rows-1 gap-2">
          <icon-button icon="mic" title="Не передавать звук" :disabled="true" />
          <remove-from-pinned-calls />
        </div>
      </template>
    </pinned-calls-sidebar-entity>
    <pinned-calls-cards />
  </div>
</template>

<script setup lang="ts">
import { vChainTooltip } from '@wui/common-library'

import { PinnedCallsCards } from '@/widgets/pinned-calls'

import { RemoveFromPinnedCalls } from '@/features/pinned-calls'

import { PinnedCallsSidebarEntity } from '@/entities/call-session'
import { tooltips } from '@/entities/tooltips'

import { IconButton } from '@/shared/ui'


</script>
