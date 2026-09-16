<template>
  <slot />
</template>

<script lang="ts" setup>
import { provideWidgetViewport } from '../model/use-widget-viewport'
import type { WidgetViewport } from '../model/widget-viewport'

const props = defineProps<{
  viewport: WidgetViewport
}>()

provideWidgetViewport(() => props.viewport)
</script>
