<template>
  <div class="flex justify-center items-center text-white text-2440">
    <form @submit.prevent="onSubmit">
      <div class="mb-4 rounded-8">
        <div
          class="relative top-0 left-0 rounded-8"
          :class="{ 'border border-red-tints-900': errors.has('login') }"
        >
          <input
            ref="loginInputRef"
            :value="formLogin"
            type="text"
            :placeholder="$t('Login')"
            autocomplete="username"
            :disabled="credentialsDisabled"
            class="login-input w-120 bg-black-865 rounded-8 text-2440 py-4 pl-4 focus:outline-none disabled:opacity-50"
            name="username"
            @focus="emitCaretChange('login', $event)"
            @click="emitCaretChange('login', $event)"
            @keyup="emitCaretChange('login', $event)"
            @select="emitCaretChange('login', $event)"
            @input="emitInput('login', $event)"
          >
          <img
            class="absolute top-6 right-5"
            src="@/app/assets/images/login.svg"
            alt="login"
          >
        </div>
        <p v-if="errors.has('login')" class="text-1316 text-red-tints-800 px-4 pt-1">
          {{ errors.get('login') }}
        </p>
      </div>

      <div class="mb-6 rounded-8">
        <div
          class="relative top-0 left-0 rounded-8"
          :class="{ 'border border-red-tints-900': errors.has('password') }"
        >
          <input
            ref="passwordInputRef"
            :value="formPassword"
            :type="inputPasswordType"
            :placeholder="$t('Password')"
            autocomplete="current-password"
            name="password"
            :disabled="credentialsDisabled"
            class="login-input w-120 bg-black-865 rounded-8 text-2440 py-4 pl-4 focus:outline-none disabled:opacity-50"
            @focus="emitCaretChange('password', $event)"
            @click="emitCaretChange('password', $event)"
            @keyup="emitCaretChange('password', $event)"
            @select="emitCaretChange('password', $event)"
            @input="emitInput('password', $event)"
          >
          <span @click="changeInputPasswordType">
            <img
              class="cursor-pointer absolute top-6 right-3"
              :class="{ 'opacity-50 pointer-events-none': credentialsDisabled }"
              src="@/app/assets/images/password.svg"
              alt="password"
            >
          </span>
        </div>
        <p v-if="errors.has('password')" class="text-1316 text-red-tints-800 px-4 pt-1">
          {{ errors.get('password') }}
        </p>
      </div>

      <div>
        <wui-btn
          type="submit"
          tabindex="1"
          :size="72"
          state="tonal"
          variant="neut"
          class="w-full"
          :disabled="submitting || credentialsDisabled"
        >
          <wui-icon
            v-if="submitting"
            name="animatedLoaderWheel"
            class="mr-2 text-white"
          />
          <span>{{ $t('Enter') }}</span>
        </wui-btn>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { WuiBtn, WuiIcon } from '@wui/common-library'
import { computed, ref, toRefs } from 'vue'

type LoginField = 'login' | 'password'

type InputPayload = {
  field: LoginField
  value: string
  position: number | null
}

type CaretPayload = {
  field: LoginField
  position: number | null
}

type LoginFormProps = {
  login: string
  password: string
  submitting: boolean
  errors: Map<LoginField, string>
  credentialsDisabled?: boolean
}

const props = withDefaults(defineProps<LoginFormProps>(), {
  credentialsDisabled: false,
})

const emit = defineEmits<{
  'on-caret-change': [payload: CaretPayload],
  'on-input': [payload: InputPayload],
  'on-submit': [void],
}>()

const loginInputRef = ref<HTMLInputElement | null>(null)
const passwordInputRef = ref<HTMLInputElement | null>(null)
const inputPasswordType = ref('password')

const formLogin = computed(() => props.login)
const formPassword = computed(() => props.password)
const { errors, submitting, credentialsDisabled } = toRefs(props)

const changeInputPasswordType = (): void => {
  if (credentialsDisabled.value) {
    return
  }

  inputPasswordType.value = inputPasswordType.value === 'password' ? 'text' : 'password'
}

const emitInput = (field: LoginField, event: Event): void => {
  const target = event.target as HTMLInputElement

  emit('on-input', {
    field,
    value: target.value,
    position: target.selectionStart,
  })
}

const emitCaretChange = (field: LoginField, event: Event): void => {
  const target = event.target as HTMLInputElement

  emit('on-caret-change', {
    field,
    position: target.selectionStart,
  })
}

const onSubmit = (): void => {
  emit('on-submit')
}

defineExpose({
  loginInputRef,
  passwordInputRef,
})
</script>

