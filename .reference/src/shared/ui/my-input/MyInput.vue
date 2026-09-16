<template>
  <wui-input
    ref="inputRef"
    v-bind="$attrs"
    :model-value="modelValue"
    :append-icon="appendIcon"
    :prepend-icon="prependIcon"
    :placeholder="placeholder"
    :title="title"
    :supporting-text="supportingText"
    :with-clear="withClear"
    :with-label="withLabel"
    :disabled="disabled"
    :size="48"
    :class="inputClasses"
    @update:model-value="emit('update:modelValue', $event)"
    @append="emitInputAction('append')"
    @prepend="emitInputAction('prepend')"
  />
</template>

<script setup lang="ts">
import { WuiInput } from '@wui/common-library'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import type { MyInputActionPayload, MyInputProps } from './types'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<MyInputProps>(), {
  withClear: false,
  withLabel: true,
  disabled: false,
  error: false,
  appendAction: 'emit',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
  append: [payload: MyInputActionPayload]
  prepend: [payload: MyInputActionPayload]
  'selection-change': [payload: MyInputActionPayload]
}>()

const inputRef = ref<InstanceType<typeof WuiInput> | null>(null)

const inputClasses = computed(() => [
  'my-input',
  props.error ? 'my-input--error' : 'my-input--num',
])

const getInputElement = () =>
  inputRef.value?.$el.querySelector('.wui-input__field') as HTMLInputElement | null

const getInputActionPayload = (): MyInputActionPayload => {
  const input = getInputElement()

  return {
    value: input?.value ?? '',
    selectionStart: input?.selectionStart ?? null,
    selectionEnd: input?.selectionEnd ?? null,
  }
}

const setSelectionRange = (start: number, end = start) => {
  const input = getInputElement()

  input?.focus()
  input?.setSelectionRange(start, end)
  emit('selection-change', getInputActionPayload())
}

const backspaceBySelection = async (payload: MyInputActionPayload) => {
  const cursorPosition = payload.selectionStart ?? payload.value.length
  const selectionEnd = payload.selectionEnd ?? cursorPosition

  if (cursorPosition !== selectionEnd) {
    emit(
      'update:modelValue',
      `${payload.value.slice(0, cursorPosition)}${payload.value.slice(selectionEnd)}`,
    )
    await nextTick()
    setSelectionRange(cursorPosition)
    return
  }

  if (cursorPosition === 0) return

  emit(
    'update:modelValue',
    `${payload.value.slice(0, cursorPosition - 1)}${payload.value.slice(cursorPosition)}`,
  )
  await nextTick()
  setSelectionRange(cursorPosition - 1)
}

const emitInputAction = async (eventName: 'append' | 'prepend') => {
  const payload = getInputActionPayload()

  if (eventName === 'append') {
    if (props.appendAction === 'backspace') {
      await backspaceBySelection(payload)
      return
    }

    emit('append', payload)
    return
  }

  emit('prepend', payload)
}

const emitSelectionChange = () => {
  emit('selection-change', getInputActionPayload())
}

const inputSelectionEvents = [
  'click',
  'focus',
  'input',
  'keyup',
  'select',
] as const

const addSelectionListeners = () => {
  const input = getInputElement()

  inputSelectionEvents.forEach(eventName => {
    input?.addEventListener(eventName, emitSelectionChange)
  })
}

const removeSelectionListeners = () => {
  const input = getInputElement()

  inputSelectionEvents.forEach(eventName => {
    input?.removeEventListener(eventName, emitSelectionChange)
  })
}

onMounted(async () => {
  await nextTick()
  addSelectionListeners()
})

onBeforeUnmount(removeSelectionListeners)

defineExpose({
  getSelectionRange: getInputActionPayload,
  setSelectionRange,
})
</script>

<style src="./my-input.css"></style>
