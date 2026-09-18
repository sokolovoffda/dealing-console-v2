<template>
  <div class="h-full w-full flex items-center justify-center">
    <form class="flex py-10 px-8 border border-gray-500" action="">
      <div>test</div>
      <div>
        <wui-input :model-value="login" :size="48" />
        <wui-input :model-value="password" :size="48" type="password" />
        <wui-btn :size="48" variant="brand" state="tonal">Войти</wui-btn>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { WuiBtn, WuiInput } from '@wui/common-library'
import { ref } from 'vue'

const login = ref('')
const password = ref('')
</script>

<style scoped></style>
