<template>
  <section class="w-3/5 text-white flex flex-col justify-between">
    <header class="bg-black-735 rounded-t-8 h-12 px-4 py-3">{{ $t('EditingABookmarkName') }}</header>
    <main class="bg-black-800 border-b border-black-700">
      <div class="p-4 border-b border-black-700">
        <wui-input
          v-model="text"
          :placeholder="$t('EnterTheName')"
          with-clear
          rounded
          class="app-input h-12"
        />
      </div>
      <div class="p-6">
        <keyboard-pad @on-key-tap="onKeyTap" />
      </div>
    </main>
    <footer class="bg-black-800 rounded-b-8 p-4 flex justify-center gap-x-2">
      <template v-if="props.tab">
        <wui-btn primary @click="edit">{{ $t('Edit') }}</wui-btn>
      </template>
      <template v-else>
        <wui-btn primary @click="next">{{ $t('Next') }}</wui-btn>
      </template>
      <wui-btn primary @click="exit">{{ $t('Cancel') }}</wui-btn>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { WuiBtn, WuiInput } from '@wui/common-library'
import { ref } from 'vue'

import { KeyboardPad } from '@/features/keyboard-pad'

import type { ContactTab } from '@/entities/settings'

import { useLocalization } from '@/shared/i18n'
import { IKeyboardKey } from '@/shared/utils/keyboard'

const props = defineProps<{
  tab?: ContactTab
}>()

const emits = defineEmits<{
  (event: 'next', name: string): void
  (event: 'exit'): void
  (event: 'edit', name: string): void
}>()

const { t } = useLocalization()

const text = ref(props.tab?.name ?? '')

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }) => {
  if (param.letter) {
    text.value += param.letter
  }
  if (param.key.event === 'backspace') {
    text.value = param.key.handler && param.key.handler(text.value) || ''
  }
  if (param.key.event === 'submitForm') {
    if (props.tab) {
      emits('edit', text.value || t('NoName'))
    } else {
      emits('next', text.value || t('NoName'))
    }
  }
}

const next = () => {
  emits('next', text.value || t('NoName'))
}
const exit = () => {
  emits('exit')
}
const edit = () => {
  emits('edit', text.value || t('NoName'))
}
</script>
