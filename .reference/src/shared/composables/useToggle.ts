import { Ref, ref } from 'vue'

interface UseToggleResult {
  value: Ref<boolean>;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

export function useToggle (initValue: boolean): UseToggleResult {
  const value = ref<boolean>(initValue)

  const toggle = () => {
    value.value = !value.value
  }

  const enable = () => {
    value.value = true
  }

  const disable = () => {
    value.value = false
  }

  return {
    value,
    toggle,
    enable,
    disable,
  }
}
