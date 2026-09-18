<template>
  <div class="h-full w-full flex items-center justify-center">
    <div class="flex overflow-hidden rounded-16 border border-wrkspc-menu-brd-def">
      <div class="flex flex-col items-center justify-between py-10 px-8 bg-bg-base-bg1">
        <div class="flex flex-col items-center gap-3">
          <wui-icon name="logoSatel" class="mb-2 text-brand-base-def h-30! w-30!" />
          <div class="text-[24px] font-medium">Дилинговый-пульт</div>
          <div class="text-[14px]">Версия 0.0.1</div>
        </div>
        <div class="text-[14px]">© 2026</div>
      </div>
      <div class="py-10 px-8 bg-bg-base-bg2">
        <div class="text-xl mb-10">Добро пожаловать!</div>
        <div class="flex flex-col gap-4 mb-10">
          <wui-input :model-value="login" :size="48" append-icon="userM" />
          <wui-input :model-value="password" :size="48" append-icon="eyeM" type="password" />
        </div>

        <wui-btn :size="48" variant="brand" state="filled">Войти</wui-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WuiBtn, WuiInput, WuiIcon } from '@wui/common-library'
import { ref } from 'vue'

const login = ref('')
const password = ref('')
</script>

<style scoped></style>
