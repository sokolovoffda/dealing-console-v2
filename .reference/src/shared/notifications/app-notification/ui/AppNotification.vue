<template>
  <div class="m-4 min-h-[72px] w-[340px] rounded-4 bg-black-600 text-white px-4 py-2 shadow-dropdown">
    <div class="flex items-center justify-between">
      <h1 class="text-1420">
        {{ title }}
      </h1>
      <wui-icon
        name="clear"
        class="cursor-pointer"
        @click="close()"
      />
    </div>
    <p class="text-1316">
      {{ notification.message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { computed } from 'vue'

import { useNotification } from '../model/useNotification'
import { AppNotification } from '../types'

const props = defineProps<{
  notification: AppNotification
}>()

const { deleteNotification } = useNotification()

const close = () => {
  deleteNotification(props.notification.id)
}

const title = computed(() => {
  switch (props.notification.type) {
  case 'success':
    return 'Выполнено!'
  case 'error':
    return 'Ошибка!'
  default:
    return 'Выполнено!'
  }
})
</script>
