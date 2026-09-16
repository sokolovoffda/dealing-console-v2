<template>
  <widget-viewport-provider
    v-if="panel"
    :viewport="MONOPOLY_WIDGET_VIEWPORT"
  >
    <component :is="panel" />
  </widget-viewport-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import {
  MONOPOLY_WIDGET_VIEWPORT,
  WidgetViewportProvider,
} from '@/entities/workspace'

import { getWorkspaceWidgetComponent } from '../../model'

const route = useRoute()

const panel = computed(() => {
  const widgetType = route.meta.workspaceWidgetType
  if (!widgetType) return null

  return getWorkspaceWidgetComponent(widgetType)
})
</script>
