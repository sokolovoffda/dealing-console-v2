<template>
  <wui-dropdown
    v-model="isVolumeDropdownOpen"
    direction="top"
    plain
    close-on-click-outside
  >
    <template #activator="{ toggle }">
      <my-btn
        icon
        mode="toggle"
        :size="72"
        fixed-size
        :variant="volumeButtonVariant"
        :tone="volumeButtonTone"
        :active="isVolumeDropdownOpen"
        :prepend-icon="volumeButtonIcon"
        @click.prevent="toggle"
      />
    </template>

    <div class="h-[432px]">
      <wui-input-range
        v-model="volumePercent"
        v-bind="volumeRangeProps"
        orientation="vertical"
        btn
      />
    </div>
  </wui-dropdown>
</template>

<script setup lang="ts">
import { WuiDropdown, WuiInputRange, type IconName } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { MyBtn, type MyBtnTone, type MyBtnVariant } from '@/shared/ui'

const store = usePinnedCallsPanelStore()
const { globalVolumeMultiplier } = storeToRefs(store)

const MIN_VOLUME = 0
const MAX_VOLUME = 100
const VOLUME_STEP = 1
const isVolumeDropdownOpen = ref(false)

const isVolumeMuted = computed(() => volumePercent.value === MIN_VOLUME)
const volumeButtonIcon = computed<IconName>(() => (isVolumeMuted.value ? 'volumeOffM' : 'volumeControlM'))
const volumeButtonVariant = computed<MyBtnVariant>(() => {
  if (isVolumeMuted.value) return 'negcon'

  return 'neutcon'
})
const volumeButtonTone = computed<MyBtnTone>(() => {
  if (isVolumeMuted.value) return 'base'

  return 'dark'
})

const volumeRangeProps = {
  min: MIN_VOLUME,
  max: MAX_VOLUME,
  step: VOLUME_STEP,
  size: 72,
  orientation: 'vertical',
  btn: true,
  btnIcon: 'volumeOnF',
  btnOffIcon: 'volumeOffF',
} as const

const volumePercent = computed({
  get: () => Math.round(globalVolumeMultiplier.value * MAX_VOLUME),
  set: (value: number) => {
    store.changeGlobalVolumeMultiplier(value / MAX_VOLUME)
  },
})
</script>
