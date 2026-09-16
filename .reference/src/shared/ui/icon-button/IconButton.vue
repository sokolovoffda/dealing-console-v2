<template>
  <button v-bind="$attrs" :class="buttonClass">
    <wui-icon :name="loading ? 'animatedLoaderWheel' : icon" :class="iconSizeClass" />
    <span v-if="badge" class="absolute top-1 right-2 text-white">{{ badge }}</span>
  </button>
</template>

<script lang="ts" setup>
import { WuiIcon, IconName } from '@wui/common-library'
import { computed, useAttrs } from 'vue'

const props = defineProps<{
  icon: IconName,
  largeIcon?: boolean,
  smallIcon?: boolean
  active?: boolean
  loading?: boolean
  badge?: string
}>()
const attrs = useAttrs()

const hasClassToken = (value: unknown, token: string): boolean => {
  if (typeof value === 'string') {
    return value.split(/\s+/).includes(token)
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasClassToken(item, token))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .some(([key, enabled]) => Boolean(enabled) && key === token)
  }

  return false
}

const isActive = computed(() => {
  return Boolean(props.active) || hasClassToken(attrs.class, 'active')
})

const iconSizeClass = computed(() => {
  if (props.largeIcon) {
    return '!w-12 !h-12' // 48px
  }

  if (props.smallIcon) {
    return '!w-[18px] !h-[18px]' // 18px
  }

  return '!w-8 !h-8' // 32px
})

const buttonClass = computed(() => {
  return [
    'relative bg-black-735 text-black-135 border border-black-600 cursor-pointer w-16 h-16 rounded-8 disabled:text-black-600 disabled:cursor-not-allowed enabled:hover:bg-black-700',
    { active: isActive.value },
    isActive.value && 'bg-black-865 border-black-800 shadow-[inset_0_0_5px_1px_#111111] enabled:border-black-865 enabled:text-white',
  ]
})
</script>
