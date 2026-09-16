import { ref, type Ref } from 'vue'

import type { IKeyboardKey } from '@/shared/utils/keyboard'

type UseFloatingKeyboardOptions = {
  initiallyOpen?: boolean
}

export const useFloatingKeyboard = (
  text: Ref<string>,
  options: UseFloatingKeyboardOptions = {},
) => {
  const keyboardVisible = ref(options.initiallyOpen ?? false)

  const openKeyboard = () => {
    keyboardVisible.value = true
  }

  const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }) => {
    if (param.letter) {
      text.value += param.letter
    }
    if (param.key.event === 'backspace') {
      text.value = param.key.handler?.(text.value) || ''
    }
  }

  return {
    keyboardVisible,
    openKeyboard,
    onKeyTap,
  }
}
