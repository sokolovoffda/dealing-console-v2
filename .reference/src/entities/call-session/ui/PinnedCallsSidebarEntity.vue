<template>
  <aside class="bg-black-800 p-4 border border-black-700 w-[240px] min-w-[240px] rounded-8">
    <div v-if="size" class="flex h-full flex-col justify-between items-center">
      <div class="text-white">
        <p class="mb-2 text-1616 font-bold">{{ $t('CurtainedLines') }}</p>
        <p class="mb-2 text-1324">{{ $t('BusyLines', { size: size }) }}</p>
      </div>

      <slot name="buttons" />
    </div>

    <div v-else class="flex h-full flex-col justify-center items-center text-center">
      <wui-icon name="addCircleOutlined" class="mb-2 text-primary !h-10 !w-10" />
      <p class="text-black-135 text-1424 max-w-[190px]">{{ $t('ToSecureLineSelectSubscriberCardAndClickSpeakerphoneChannelSlot') }}</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { usePinnedCallsStore } from '@/entities/call-session'


const store = usePinnedCallsStore()
const { pinnedCalls } = storeToRefs(store)

const size = computed(() => Array.from(pinnedCalls.value.values()).filter((item) => item !== null).length)
</script>

<style scoped></style>
