<template>
  <app-modal
    class="create-group-modal self-start mt-[-18vh]"
    title="Создать группу"
    confirm-text="Создать"
    :confirm-disabled="!isNameValid"
    :auto-close-on-confirm="false"
    @confirm="handleConfirm"
  >
    <wui-input
      v-model="name"
      placeholder="Введите название группы"
      with-clear
      :with-label="false"
      :size="48"
      data-test="create-group-modal-name"
      @focus="openKeyboard"
      @click="openKeyboard"
    />

    <keyboard-modal
      v-if="keyboardVisible"
      @on-key-tap="onKeyTap"
      @close="keyboardVisible = false"
    />
  </app-modal>
</template>

<script setup lang="ts">
import { closeDialogKey, WuiInput } from '@wui/common-library'
import { computed, ref } from 'vue'

import { AppModal, KeyboardModal, useFloatingKeyboard } from '@/shared/ui'
import { safeInject } from '@/shared/utils/safeInject'

export type CreateGroupModalResult = {
  name: string
}

const MIN_NAME_LENGTH = 3

const closeDialog = safeInject<(value?: CreateGroupModalResult) => void>(closeDialogKey)

const name = ref('')
const { keyboardVisible, openKeyboard, onKeyTap } = useFloatingKeyboard(name, {
  initiallyOpen: true,
})

const trimmedName = computed(() => name.value.trim())

const isNameValid = computed(() => {
  return trimmedName.value.length >= MIN_NAME_LENGTH
})

const handleConfirm = () => {
  if (!isNameValid.value) return

  closeDialog({ name: trimmedName.value })
}
</script>
