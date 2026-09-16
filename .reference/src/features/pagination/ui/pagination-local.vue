<template>
  <div v-if="isVisible" class="mr-8 text-center text-black-135 text-1424 flex items-center justify-center gap-1">
    <wui-btn
      :disabled="currentPage === 1"
      icon
      text
      prepend-icon="arrowLeftEnd"
      class="!text-black-135 hover:!bg-black"
      small
      rounded
      @click="firstPage"
    />
    <wui-btn
      :disabled="currentPage === 1"
      icon
      text
      prepend-icon="arrowLeft"
      class="!text-black-135 hover:!bg-black"
      small
      rounded
      data-test="prev"
      @click="prevPage"
    />
    <p class="w-36 leading-6 select-none">{{ start }} — {{ end }} {{ t('common.paginatorFrom') }} {{ items.length }}</p>
    <wui-btn
      :disabled="isLastPage"
      icon
      text
      prepend-icon="arrowRight"
      class="!text-black-135 hover:!bg-black"
      small
      rounded
      data-test="next"
      @click="nextPage"
    />
    <wui-btn
      :disabled="isLastPage"
      icon
      text
      prepend-icon="arrowRightEnd"
      class="!text-black-135 hover:!bg-black"
      small
      rounded
      @click="lastPage"
    />
    <wui-select
      v-if="perPageSelectItems.length > 1"
      v-model="selectedPerPage"
      :items="perPageSelectItems"
      small
      rounded
      class="w-15 text-black"
    />
    <span v-if="perPageSelectItems.length > 1" class="leading-6 select-none">
      {{ t('common.paginatorPerPage') }}
    </span>
  </div>
</template>

<script setup lang="ts" generic="T">
import { WuiBtn, WuiSelect } from '@wui/common-library'
import { computed, ref, watch } from 'vue'

import { useLocalization } from '@/shared/i18n'

const props = defineProps<{
  perPage: number,
  items: Array<T>
  perPageVariants?: number[]
  alwaysVisible?: boolean
}>()

const emit = defineEmits<{
  (event: 'setItemsPerPage', items: T[]): void
}>()

const { t } = useLocalization()
const selectedPerPage = ref<number | string>(props.perPage)
const currentPage = ref(1)
const currentPerPage = computed(() => Number(selectedPerPage.value) || props.perPage)
const totalPages = computed(() => Math.max(1, Math.ceil(props.items.length / currentPerPage.value)))
const offset = computed(() => (currentPage.value - 1) * currentPerPage.value)
const start = computed(() => props.items.length ? offset.value + 1 : 0)
const end = computed(() => Math.min(offset.value + currentPerPage.value, props.items.length))
const isLastPage = computed(() => currentPage.value >= totalPages.value)
const isVisible = computed(() => props.alwaysVisible || props.items.length > currentPerPage.value)
const perPageSelectItems = computed(() => {
  const variants = props.perPageVariants?.length ? props.perPageVariants : [props.perPage]
  return variants.map((value) => ({
    value,
    label: value.toString(),
  }))
})
const itemsPerPage = computed<T[]>(() => props.items.slice(offset.value, end.value))

const firstPage = (): void => {
  currentPage.value = 1
}
const lastPage = (): void => {
  currentPage.value = totalPages.value
}
const nextPage = (): void => {
  if (!isLastPage.value) {
    currentPage.value += 1
  }
}
const prevPage = (): void => {
  if (currentPage.value > 1) {
    currentPage.value -= 1
  }
}

watch(() => props.perPage, (value) => {
  selectedPerPage.value = value
})
watch(currentPerPage, () => {
  currentPage.value = 1
})
watch(() => props.items, () => {
  currentPage.value = 1
})
watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value
  }
})
watch(() => itemsPerPage.value, (value) => {
  emit('setItemsPerPage', value)
}, { immediate: true })
</script>
