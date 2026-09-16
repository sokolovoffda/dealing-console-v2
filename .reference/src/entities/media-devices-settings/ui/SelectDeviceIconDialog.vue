<template>
  <section v-click-outside="() => close()" class="w-[500px] bg-black-800 rounded-8 p-12">
    <div class="flex flex-wrap gap-4 items-center justify-center">
      <icon-button
        v-for="icon in icons"
        :key="icon"
        :icon="icon"
        @click="close(icon)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { closeDialogKey, ClickOutside as vClickOutside } from '@wui/common-library'

import {
  type LogicalMediaDeviceIcon,
  LogicalMediaDeviceIconEnum,
} from '@/shared/composables'
import { IconButton } from '@/shared/ui'
import { safeInject } from '@/shared/utils/safeInject'

const closeDialog = safeInject(closeDialogKey)
const close = (value?: LogicalMediaDeviceIcon) => {
  closeDialog(value)
}

const icons = Object.values(LogicalMediaDeviceIconEnum)
</script>
