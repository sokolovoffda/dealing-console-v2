<template>
  <wui-input
    v-model="searchModel"
    :placeholder="$t('Search')"
    prepend-icon="search"
    small
    with-clear
    rounded
    class="app-input placeholder-black-600 number-input number-input--without-arrows"
    data-test="searchInput"
    @focus="keyboardVisible = true"
  />
  <keyboard-modal
    v-if="keyboardVisible"
    @on-key-tap="onKeyTap"
    @close="keyboardVisible = false"
  />
</template>

<script setup lang="ts">
import { WuiInput } from '@wui/common-library'
import { ref } from 'vue'

import { KeyboardModal } from '@/shared/ui'
import { IKeyboardKey } from '@/shared/utils/keyboard'

const searchModel = defineModel({ type: String, required: true })
const keyboardVisible = ref<boolean>(false)

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }) => {
  if (param.letter) {
    searchModel.value += param.letter
  }
  if (param.key.event === 'backspace') {
    searchModel.value = param.key.handler && param.key.handler(searchModel.value) || ''
  }
}
</script>
