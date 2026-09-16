<template>
  <header class="bg-bg-base-bg1 text-2xl text-white py-2 mb-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <wui-icon
          :class="iconClass"
          :name="icon"
          xlarge
        />
        <div>{{ title }}</div>
      </div>

      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import type { IconName } from '@wui/common-library'

withDefaults(defineProps<{
  icon: IconName
  title: string
  iconClass?: string
}>(), {
  iconClass: 'text-title-icon-def',
})
</script>
