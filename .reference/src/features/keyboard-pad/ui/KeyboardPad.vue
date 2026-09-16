<template>
  <div
    v-if="data.showVirtualKeyboard"
    class="flex items-center justify-center"
  >
    <div
      class="grid grid-cols-12 grid-rows-5 gap-2"
      :class="small ? 'smallKeyboard' : 'keyboard'"
    >
      <my-btn
        v-for="key in keyboard[data.language === 'ru-RU' ? 'ru' : 'eng']"
        :key="key.id"
        :style="getKeyStyle(key)"
        class="keyboard-pad__key text-key h-full! w-full!"
        :icon="false"
        :size="72"
        variant="neutcon"
        tone="base"
        @click="pressKey(key[visibleKeys], key)"
      >
        {{ key[visibleKeys] }}
      </my-btn>
    </div>
  </div>
  <div
    v-else
    class="flex w-full justify-end"
  >
    <my-btn
      :style="data.showKeyboardKey.style"
      class="keyboard-pad__key mt-25px mb-[70px] mr-[70px] h-[72px]! w-[72px]!"
      :icon="false"
      :size="72"
      variant="neutcon"
      tone="base"
      @click="hideShowKeyboard()"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, watch, type StyleValue } from 'vue'

// eslint-disable-next-line boundaries/element-types,no-restricted-imports
import dialpadIcon from '@/app/assets/images/dialpad.svg'

import { Locales, useLocalization } from '@/shared/i18n'
import { MyBtn } from '@/shared/ui/my-btn'
import keyboard, { IKeyboardKey } from '@/shared/utils/keyboard'

defineProps<{
  small?: boolean
}>()

const emit = defineEmits<{
  'on-key-tap': [ {
    letter: string | undefined,
    key: IKeyboardKey
  }]
}>()

const { currentLocale } = useLocalization()

const data = reactive<{
  upperCase: boolean,
  language: Locales,
  showVirtualKeyboard: boolean,
  showKeyboardKey: {
    style: {
      background: string
    },
    event: string,
  },
}>({
  upperCase: true,
  language: currentLocale.value,
  showVirtualKeyboard: true,
  showKeyboardKey: {
    style: {
      background: `no-repeat 50% 50% url("${dialpadIcon}")`,
    },
    event: 'showHideKeyboard',
  },
})

onMounted(() => {
  if (localStorage.showVirtualKeyboard) {
    data.showVirtualKeyboard = localStorage.showVirtualKeyboard
  }
})

const visibleKeys = computed(() => {
  if (data.upperCase) {
    return 'upper'
  }
  return 'lower'
})

/** Оставляем grid/иконки из keyboard.ts, цвет фона — у MyBtn (как у MyDialpad). */
const getKeyStyle = (key: IKeyboardKey): StyleValue | undefined => {
  if (!key.style || typeof key.style !== 'object' || Array.isArray(key.style)) {
    return key.style
  }

  const style = { ...(key.style as Record<string, unknown>) }
  delete style.background

  return style as StyleValue
}

const pressKey = (letter: string | undefined, key: IKeyboardKey): void => {
  if (key.event === 'changeCase') {
    data.upperCase = !data.upperCase
  }
  if (key.event === 'changeLanguage') {
    if (data.language === Locales.RU_RU) {
      data.language = Locales.EN_GB
    } else {
      data.language = Locales.RU_RU
    }
  }
  if (key.event === 'showHideKeyboard') {
    data.showVirtualKeyboard = !data.showVirtualKeyboard
    localStorage.showVirtualKeyboard = data.showVirtualKeyboard
  }
  emit('on-key-tap', { letter, key })
}

const hideShowKeyboard = () => {
  data.showVirtualKeyboard = !data.showVirtualKeyboard
  localStorage.showVirtualKeyboard = data.showVirtualKeyboard
}

watch(currentLocale, (locale) => {
  data.language = locale
})
</script>

<style scoped>
.keyboard {
  width: 952px;
  height: 392px;
}

.smallKeyboard {
  width: 700px;
  height: 300px;
}

.text-key {
  font-size: 40px;
  line-height: 1;
}

.smallKeyboard .text-key {
  font-size: 24px;
  line-height: 1;
  background-size: 50% 40% !important;
}

.keyboard-pad__key {
  min-width: 0;
  padding: 0 !important;
  background-repeat: no-repeat;
  background-position: 50% 50%;
}

.keyboard-pad__key :deep(.wui-btn__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  line-height: 1;
}
</style>
