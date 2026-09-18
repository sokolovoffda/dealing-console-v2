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
      <form class="w-90 min-w-0 py-10 px-8 bg-bg-base-bg2" @submit.prevent="onSubmit">
        <div class="text-xl mb-10">Добро пожаловать!</div>
        <div class="flex flex-col gap-4 mb-8">
          <wui-input
            v-model="login"
            :size="48"
            append-icon="userM"
            placeholder="Логин"
            :error="!!loginError"
            :supporting-text="loginError || '\u00A0'"
          />
          <wui-input
            v-model="password"
            :size="48"
            placeholder="Пароль"
            :type="passwordVisible ? 'text' : 'password'"
            :append-icon="passwordVisible ? 'eyeOffM' : 'eyeM'"
            :error="!!passwordError"
            :supporting-text="passwordError || '\u00A0'"
            @append="passwordVisible = !passwordVisible"
          />
        </div>

        <p class="mb-4 min-h-6 w-full min-w-0 text-sm text-neg-base-def text-center truncate">
          {{ formError }}
        </p>

        <wui-btn :size="48" variant="brand" state="filled" type="submit" :disabled="loading">{{
          loading ? 'Вход...' : 'Войти'
        }}</wui-btn>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WuiBtn, WuiInput, WuiIcon } from '@wui/common-library'
import { ref } from 'vue'

const loading = ref(false)

const login = ref('')
const password = ref('')
const passwordVisible = ref(false)

const loginError = ref('')
const passwordError = ref('')
const formError = ref('')

const onSubmit = () => {}
</script>

<style scoped></style>
