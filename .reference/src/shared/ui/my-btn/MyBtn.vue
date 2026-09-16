<template>
  <wui-btn
    v-bind="buttonAttrs"
    :size="size"
    :icon="icon"
    :prepend-icon="prependIcon"
    :append-icon="appendIcon"
    :disabled="disabled"
    :content-align="contentAlign"
    variant="neut"
    state="alpha"
    :class="btnClasses"
    @click="handleClick"
  >
    <slot />
  </wui-btn>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'
import { computed, useAttrs } from 'vue'

import type { MyBtnProps } from './types'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<MyBtnProps>(), {
  variant: 'neutcon',
  tone: 'base',
  activeTone: 'default',
  iconTone: 'def',
  mode: 'button',
  size: 72,
  icon: true,
  fixedSize: false,
  disabled: false,
  contentAlign: 'center',
})

const attrs = useAttrs()

const buttonAttrs = computed(() => {
  const rest = { ...attrs }

  delete rest.onClick

  return rest
})

const handleClick = (event: MouseEvent) => {
  const onClick = attrs.onClick

  if (typeof onClick === 'function') {
    onClick(event)
  }
}

const isActive = computed(() => Boolean(props.active) || Boolean(props.selected))

const btnClasses = computed(() => [
  'my-btn',
  `my-btn--${props.mode}`,
  `my-btn--${props.variant}`,
  `my-btn--size-${props.size}`,
  `my-btn--tone-${props.tone}`,
  `my-btn--active-tone-${props.activeTone}`,
  `my-btn--icon-tone-${props.iconTone}`,
  props.icon && 'my-btn--icon',
  props.fixedSize && 'my-btn--fixed-size',
  props.height && `my-btn--height-${props.height}`,
  isActive.value ? 'my-btn--active' : 'my-btn--inactive',
  props.selected && 'my-btn--selected',
])
</script>

<style src="./my-btn.css"></style>
