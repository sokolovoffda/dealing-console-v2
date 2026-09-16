<template>
  <div class="generic-table flex h-full min-h-0 flex-col overflow-hidden text-[18px]">
    <!-- Заголовки -->
    <div
      class="grid shrink-0 items-center bg-black-665 px-8 py-2"
      :class="gridClass"
    >
      <span v-if="showSelection" aria-hidden="true" />
      <p
        v-for="title in headers"
        :key="title"
        class="min-w-0 truncate"
      >
        {{ title }}
      </p>
    </div>

    <!-- Список записей -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-for="item in items"
        :key="getKey(item)"
        class="grid items-center border-b border-black-465 px-8 py-3"
        :class="gridClass"
      >
        <wui-checkbox
          v-if="showSelection"
          data-test="generic-table-checkbox"
          class="generic-table__checkbox shrink-0 pr-4"
          :model-value="isChecked(item).value"
          @update:model-value="(value: boolean) => isChecked(item).value = value"
        />
        <p
          v-for="(fieldFn, index) in fieldFns"
          :key="index"
          class="min-w-0 truncate"
        >
          {{ fieldFn(item) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { WuiCheckbox } from '@wui/common-library'
import { computed } from 'vue'

type KeyFn<T> = (item: T) => string | number
type FieldFn<T> = (item: T) => string | number
type SelectionMode = 'single' | 'multiple'

const props = withDefaults(defineProps<{
  items: T[]
  fields: FieldFn<T>[]
  headers: string[]
  uniqueKey?: string | KeyFn<T>
  selectionMode?: SelectionMode
  /** Tailwind grid class, e.g. grid-cols-[auto_2fr_1fr_1fr_1fr] */
  columnWidths?: string
  showSelection?: boolean
}>(), {
  selectionMode: 'multiple',
  showSelection: true,
})

const modelValue = defineModel<T[]>({ required: true })

const selectedKeys = computed({
  get: () => new Set(modelValue.value.map(getKey)),
  set: (keys) => {
    const visibleKeys = new Set(props.items.map(getKey))
    const selectedOutsideVisibleItems = modelValue.value.filter((item) => {
      const key = getKey(item)

      return !visibleKeys.has(key) && keys.has(key)
    })
    const selectedVisibleItems = props.items.filter(item => keys.has(getKey(item)))
    modelValue.value = [...selectedOutsideVisibleItems, ...selectedVisibleItems]
  },
})

const fieldFns = computed(() => props.fields)

const gridClass = computed(() => {
  if (props.columnWidths) return props.columnWidths

  const dataColumns = props.headers.length

  if (!props.showSelection) {
    switch (dataColumns) {
    case 2:
      return 'grid-cols-2'
    case 3:
      return 'grid-cols-3'
    case 4:
      return 'grid-cols-4'
    default:
      return 'grid-cols-4'
    }
  }

  // Статические классы — Tailwind не видит динамические grid-cols-${n}.
  switch (dataColumns) {
  case 1:
    return 'grid-cols-[auto_minmax(0,1fr)]'
  case 2:
    return 'grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)]'
  case 3:
    return 'grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]'
  case 4:
    return 'grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
  default:
    return 'grid-cols-[auto_repeat(4,minmax(0,1fr))]'
  }
})

const keyFn = computed((): KeyFn<T> => {
  if (typeof props.uniqueKey === 'function') {
    return props.uniqueKey
  }
  if (props.uniqueKey) {
    return (item: T): string | number => {
      if (typeof item === 'object' && item !== null) {
        const key = item[props.uniqueKey as keyof T]
        return typeof key === 'string' || typeof key === 'number' ? key : String(key)
      }

      return String(item)
    }
  }

  return (item: T): string => String(item)
})

const getKey = (item: T): string | number => keyFn.value(item)

const isChecked = (item: T) => {
  const key = getKey(item)
  return computed({
    get: () => selectedKeys.value.has(key),
    set: (value: boolean) => {
      if (props.selectionMode === 'single') {
        modelValue.value = value
          ? [item]
          : modelValue.value.filter(selectedItem => getKey(selectedItem) !== key)
        return
      }

      const newKeys = new Set(selectedKeys.value)
      if (value) {
        newKeys.add(key)
      } else {
        newKeys.delete(key)
      }
      selectedKeys.value = newKeys
    },
  })
}
</script>

<style scoped>
/* Нативный input у wui-checkbox должен быть скрыт (sr-only из либы иногда не применяется в приложении). */
.generic-table__checkbox :deep(input[type='checkbox']) {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border-width: 0;
}
</style>
