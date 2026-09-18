<template>
  <div class="h-full w-full flex items-center justify-center">
    <form class="" action="">
      <div class="py-10 px-8 bg-bg-base-bg1">test</div>
      <div class="py-10 px-8 bg-bg-base-bg2">
        <div class="text-xl mb-10">Добро пожаловать!</div>
        <div class="flex flex-col gap-4 mb-10">
          <wui-input :model-value="login" :size="48" append-icon="userM" />
          <wui-input :model-value="password" :size="48" append-icon="eyeM" type="password" />
        </div>

        <wui-btn :size="48" variant="brand" state="filled">Войти</wui-btn>
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
