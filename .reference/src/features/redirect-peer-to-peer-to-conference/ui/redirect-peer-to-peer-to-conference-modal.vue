<template>
  <section v-click-outside="close" class="w-1/2 h-auto max-h-[90vh] flex flex-col bg-black-800 rounded-8 text-white overflow-hidden">
    <header class="bg-black-735 px-4 py-3 text-1624">{{ title }}</header>
    <main class="flex-1 p-6 space-y-6 overflow-y-auto">
      <p class="text-1416">Вы собираетесь добавить:</p>
      <!-- Участник -->
      <div class="bg-black-735 p-4 rounded-8">
        <h4 class="font-medium text-1416 mb-1">Участник:</h4>
        <p class="text-1316 text-white">{{ participantName }}</p>
      </div>
      <!-- Конференция -->
      <div class="bg-black-735 p-4 rounded-8">
        <h4 class="font-medium text-1416 mb-1">Конференция:</h4>
        <p class="text-1316 text-white">{{ conferenceName }}</p>
      </div>
      <!-- Опции -->
      <div class="space-y-4">
        <label class="flex items-center gap-x-2 cursor-pointer">
          <wui-checkbox v-model="form.muteMic" />
          <span class="text-1416">Выключить микрофон</span>
        </label>

        <label class="flex items-center gap-x-2 cursor-pointer">
          <wui-checkbox v-model="form.temporary" />
          <span class="text-1416">Добавить как временного участника</span>
        </label>
      </div>
    </main>
    <footer class="bg-black-800 rounded-b-8 px-6 py-4 flex justify-end gap-x-2">
      <wui-btn primary @click="submit">Сохранить</wui-btn>
      <wui-btn primary @click="close">Отмена</wui-btn>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { closeDialogKey, ClickOutside as vClickOutside, WuiBtn, WuiCheckbox } from '@wui/common-library'
import { ref } from 'vue'

import { safeInject } from '@/shared/utils/safeInject'

type Form = { muteMic: boolean, temporary: boolean }

withDefaults(defineProps<{
  title?: string
  participantName: string
  conferenceName: string
}>(), {
  title: 'Добавление звонка в конференцию',
  participantName: 'Дмитрий Бикеев',
  conferenceName: 'Все участники',
})

const form = ref<Form>({
  muteMic: false,
  temporary: true,
})

const closeModal = safeInject(closeDialogKey)

const close = () => {
  closeModal({
    confirm: false,
    muteMic: false,
    temporary: false,
  })
}

const submit = () => {
  closeModal({
    confirm: true,
    muteMic: form.value.muteMic,
    temporary: form.value.temporary,
  })
}
</script>