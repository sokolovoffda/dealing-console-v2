<template>
  <widget-header
    icon="layoutTilesM"
    icon-class="text-title-icon-def"
    title="Панель быстрого вызова"
  >
    <wui-btn
      icon
      text
      :size="48"
      rounded
      prepend-icon="editM"
      class="text-btn-neut-alpha-icon-def!"
      :class="isEditMode
        ? ' bg-btn-warn-base-bg-def!'
        : ' bg-transparent! hover:bg-btn-neut-soft-bg-hov!'"
      @click="emit('toggleEditMode')"
    />
  </widget-header>
</template>

<script lang="ts" setup>
import { WuiBtn } from '@wui/common-library'

import { WidgetHeader } from '@/shared/ui'

defineProps<{
  isEditMode: boolean
}>()

const emit = defineEmits<{
  toggleEditMode: []
}>()
</script>
