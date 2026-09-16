<template>
  <div class="background h-screen w-screen flex justify-center items-center">
    <div class="main modal-container bg-black-800 rounded-8">
      <div class="name-container border-b border-solid border-black-865 p-8">
        <input
          v-model="data.name"
          class="name modal-name pl-4 flex items-center rounded-8 bg-black-865 text-2440 text-black-500 py-4"
          :placeholder="placeholder"
        >
      </div>
      <div class="border-t border-t-solid border-t-black-735 pt-8 px-8">
        <keyboard-pad class="keyboard" @on-key-tap="onKeyTap" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { closeDialogKey } from '@wui/common-library'
import { onMounted, reactive } from 'vue'

import { KeyboardPad } from '@/features/keyboard-pad'

import { IKeyboardKey } from '@/shared/utils/keyboard'
import { safeInject } from '@/shared/utils/safeInject'

const closeModal = safeInject(closeDialogKey)

const props = defineProps<{
  value: string,
  placeholder: string,
}>()

const data = reactive({
  name: '',
  upperCase: true,
  latinKeys: false,
  domain: 'ROOT',
})

onMounted(() => data.name = props.value)

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }): void => {
  if (param.letter) {
    data.name += param.letter
  }

  if (param.key.event === 'backspace') {
    data.name = param.key.handler && param.key.handler(data.name) || ''
  } else if (param.key.event === 'changeCase') {
    data.upperCase = !data.upperCase
  } else if (param.key.event === 'changeLanguage') {
    data.latinKeys = !data.latinKeys
  } else if (param.key.event === 'submitForm') {
    closeModal(data.name.trim() || '')
  } else if (param.key.event === 'showHideKeyboard') {
    closeModal(undefined)
  }
}
</script>

<style scoped>
.main {
  width: 1016px;
  height: 591px;
}

.modal-container {
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.name {
  width: 952px;
}

.modal-name {
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.25), inset -1px -1px 2px rgba(0, 0, 0, 0.25);
}

.background {
  background: rgba(0, 0, 0, 0.6);
}
</style>
