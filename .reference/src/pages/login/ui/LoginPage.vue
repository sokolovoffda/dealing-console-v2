<template>
  <div class="flex justify-center h-screen relative">
    <div class="flex flex-col gap-y-10   justify-center items-center w-full  mr-1 max-w-150 shadow-form">
      <wui-icon name="satelLogoM" class="mb-2  h-100! w-100! text-login-logo-logotype-def" />
    </div>
    <div class="flex flex-col justify-evenly items-center gap-y-10 grow">
      <p class="text-3248 text-white">Добро пожаловать!</p>

      <div class="flex flex-col items-center">
        <electron-stand-setup-block
          v-if="isElectronApp"
          @connection-change="onStandConnectionChange"
        />

        <login-form
          ref="loginFormRef"
          :login="data.login"
          :password="data.password"
          :submitting="data.submitting"
          :errors="errors"
          :credentials-disabled="isCredentialsDisabled"
          @on-submit="onSubmit"
          @on-input="onInputForm"
          @on-caret-change="onCaretChange"
        />
      </div>
      <keyboard-pad @on-key-tap="onKeyTap" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { WuiIcon } from '@wui/common-library'
import { nextTick, reactive, ref, watch } from 'vue'

import { LoginForm } from '@/widgets/login-form'

import { ElectronStandSetupBlock } from '@/features/electron-stand-setup'
import { KeyboardPad } from '@/features/keyboard-pad'

import { useAuth } from '@/shared/auth'
import { useLocalization } from '@/shared/i18n'
import { isElectron } from '@/shared/utils/electron-helpers'
import { IKeyboardKey } from '@/shared/utils/keyboard'

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

const isElectronApp = isElectron()

const data = reactive({
  login: '',
  password: '',
  loginFocus: true,
  passwordFocus: false,
  upperCase: true,
  latinKeys: false,
  domain: 'ROOT',
  submitting: false,
})

const errors = reactive<Map<LoginField, string>>(new Map())
const cursorPosition = reactive<Record<LoginField, number>>({
  login: 0,
  password: 0,
})
const loginFormRef = ref<InstanceType<typeof LoginForm> | null>(null)

const { t, currentLocale } = useLocalization()

const isCredentialsDisabled = ref(isElectronApp)

const onStandConnectionChange = (connected: boolean): void => {
  isCredentialsDisabled.value = isElectronApp && !connected
}

const setFocusedField = (field: LoginField, position: number | null = null): void => {
  data.loginFocus = field === 'login'
  data.passwordFocus = field === 'password'
  cursorPosition[field] = position ?? data[field].length
}

const getFocusedField = (): LoginField => {
  return data.passwordFocus ? 'password' : 'login'
}

const getFieldLabel = (field: LoginField): string => {
  return t(field === 'login' ? 'Login' : 'Password')
}

const getRequiredMessage = (field: LoginField): string => {
  return t('RequiredFieldWithName', {
    field: getFieldLabel(field),
  })
}

const validateField = (field: LoginField): boolean => {
  if (data[field].trim()) {
    errors.delete(field)
    return true
  }

  errors.set(field, getRequiredMessage(field))
  return false
}

const syncFieldError = (field: LoginField): void => {
  if (!errors.has(field)) {
    return
  }

  if (data[field].trim()) {
    errors.delete(field)
  } else {
    errors.set(field, getRequiredMessage(field))
  }
}

const restoreSelection = async (field: LoginField): Promise<void> => {
  await nextTick()

  const input = field === 'login'
    ? loginFormRef.value?.loginInputRef
    : loginFormRef.value?.passwordInputRef

  if (!input) {
    return
  }

  const position = cursorPosition[field]
  input.focus()
  input.setSelectionRange(position, position)
}


const onSubmit = async () => {
  if (isCredentialsDisabled.value) {
    return
  }

  const isLoginValid = validateField('login')
  const isPasswordValid = validateField('password')
  const isFormValid = isLoginValid && isPasswordValid
  if (!isFormValid) {
    return
  }

  try {
    data.submitting = true
    await useAuth.login(data.login, data.password, data.domain)
  } catch (e) {
    console.error(e)
    // Handled in App.vue in useAuth.on('error', ...)
  } finally {
    data.submitting = false
  }
}

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }): void => {
  if (isCredentialsDisabled.value) {
    return
  }

  if (param.key.event === 'changeCase') {
    data.upperCase = !data.upperCase
  }

  if (param.key.event === 'changeLanguage') {
    data.latinKeys = !data.latinKeys
  }

  if (param.key.event === 'submitForm') {
    void onSubmit()
    return
  }

  const field = getFocusedField()
  const value = data[field]
  const position = cursorPosition[field] ?? value.length

  if (param.key.event === 'backspace') {
    if (position > 0) {
      data[field] = value.slice(0, position - 1) + value.slice(position)
      cursorPosition[field] = position - 1
      syncFieldError(field)
      void restoreSelection(field)
    }
    return
  }

  if (param.letter !== undefined) {
    data[field] = value.slice(0, position) + param.letter + value.slice(position)
    cursorPosition[field] = position + param.letter.length
    syncFieldError(field)
    void restoreSelection(field)
  }
}

const onInputForm = ({ field, value, position }: InputPayload): void => {
  data[field] = value
  cursorPosition[field] = position ?? value.length
  setFocusedField(field, position)
  syncFieldError(field)
}

const onCaretChange = ({ field, position }: CaretPayload): void => {
  setFocusedField(field, position)
}

watch(currentLocale, () => {
  for (const field of Array.from(errors.keys())) {
    if (!data[field].trim()) {
      errors.set(field, getRequiredMessage(field))
    }
  }
})

</script>

<style scoped>

</style>
