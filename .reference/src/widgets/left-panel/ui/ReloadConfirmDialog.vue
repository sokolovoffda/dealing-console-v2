<template>
  <section v-click-outside="() => close(false)" class="w-[360px] overflow-hidden rounded-8 text-white">
    <header class="bg-black-735 px-4 py-3 text-1624">
      Перезагрузить приложение
    </header>
    <main class="bg-black-800 px-4 py-5 text-1420">
      Перезагрузить приложение сейчас?
    </main>
    <footer class="flex justify-end gap-x-2 border-t border-black-700 bg-black-800 px-4 py-4">
      <wui-btn @click="close(false)">
        Отмена
      </wui-btn>
      <wui-btn primary @click="close(true)">
        Перезагрузить
      </wui-btn>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { closeDialogKey, ClickOutside as vClickOutside, WuiBtn } from '@wui/common-library'

import { safeInject } from '@/shared/utils/safeInject'

const closeDialog = safeInject(closeDialogKey)

const close = (value = false) => {
  closeDialog(value)
}
</script>
