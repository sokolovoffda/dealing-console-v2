<template>
  <section
    class="app-modal flex w-140 max-w-[calc(100vw-32px)] flex-col gap-8 rounded-12 text-white bg-ftr-bg-def border border-ftr-brd-def p-8"
    data-test="app-modal"
  >
    <header class="flex items-start gap-2">
      <div class="flex min-w-0 flex-1 items-center py-1">
        <slot name="title">
          <h2 class="truncate text-xl font-medium leading-8">
            {{ title }}
          </h2>
        </slot>
      </div>

      <my-btn
        icon
        fixed-size
        variant="neutcon"
        tone="alpha"
        prepend-icon="closeRegularLgM"
        :size="40"
        data-test="app-modal-close"
        @click="handleCancel"
      />
    </header>

    <div class="flex flex-col gap-4 self-stretch">
      <slot />
    </div>

    <footer class="flex items-center justify-end gap-2 self-stretch">
      <slot name="footer">
        <wui-btn
          variant="neut"
          state="alpha"
          :size="48"
          data-test="app-modal-cancel"
          @click="handleCancel"
        >
          {{ cancelText }}
        </wui-btn>
        <wui-btn
          variant="brand"
          state="filled"
          :size="48"
          :disabled="isConfirmDisabled"
          data-test="app-modal-confirm"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </wui-btn>
      </slot>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { closeDialogKey, WuiBtn } from '@wui/common-library'
import { computed } from 'vue'

import { safeInject } from '@/shared/utils/safeInject'

import MyBtn from '../../my-btn/MyBtn.vue'

import type { AppModalEmits, AppModalProps } from './types'

const props = withDefaults(defineProps<AppModalProps>(), {
  cancelText: 'Отмена',
  confirmText: 'Подтвердить',
  confirmDisabled: false,
  loading: false,
  autoCloseOnConfirm: true,
})

const emit = defineEmits<AppModalEmits>()

const closeDialog = safeInject(closeDialogKey)

const isConfirmDisabled = computed(() => {
  return props.confirmDisabled || props.loading
})

const handleCancel = () => {
  emit('cancel')
  closeDialog(undefined)
}

const handleConfirm = () => {
  if (isConfirmDisabled.value) return

  emit('confirm')

  if (props.autoCloseOnConfirm) {
    closeDialog(true)
  }
}
</script>
