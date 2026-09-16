<template>
  <section
    v-if="isStatusVisible"
    class="flex h-full w-full flex-1 flex-col items-center justify-center gap-4 text-title-txt-def"
    :class="{ 'cursor-pointer': isRetryable }"
    data-test="panel-status"
    :role="isRetryable ? 'button' : undefined"
    :tabindex="isRetryable ? 0 : undefined"
    v-bind="$attrs"
    @click="handleStatusClick"
    @keydown.enter.prevent="handleStatusClick"
    @keydown.space.prevent="handleStatusClick"
  >
    <wui-icon
      v-if="loading"
      name="animatedLoaderWheel"
      class="h-30! w-30! text-desk-def-icon-def"
      data-test="panel-status-loader"
    />
    <template v-else>
      <wui-icon
        v-if="icon"
        :name="icon"
        :class="iconClass"
        data-test="panel-status-icon"
      />
      <span
        class="text-xl font-normal text-title-txt-def"
        data-test="panel-status-message"
      >
        {{ message }}
      </span>
      <span
        v-if="isRetryable"
        class="text-[18px] leading-6 text-title-txt-def/70"
        data-test="panel-status-retry-hint"
      >
        Нажмите, чтобы повторить
      </span>
    </template>
  </section>

  <div
    v-else
    class="flex min-h-0 h-full w-full flex-1 flex-col"
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { WuiIcon } from '@wui/common-library'
import type { IconName } from '@wui/common-library'
import { computed } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  loading?: boolean
  message?: string | null
  icon?: IconName | null
  iconClass?: string
}>(), {
  loading: false,
  message: null,
  icon: null,
  iconClass: 'h-30! w-30! text-desk-def-icon-def',
})

const emit = defineEmits<{
  retry: []
}>()

const isStatusVisible = computed(() => Boolean(props.loading || props.message))

/** Ошибка (не loader) — клик повторяет запрос у родителя. */
const isRetryable = computed(() => Boolean(props.message) && !props.loading)

const handleStatusClick = () => {
  if (!isRetryable.value) return

  emit('retry')
}
</script>
