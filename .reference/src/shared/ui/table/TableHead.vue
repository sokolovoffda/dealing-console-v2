<template>
  <thead>
    <tr>
      <th
        v-for="(item, index) in items"
        :key="item"
        class="table__cell table__cell--head select-none align-middle"
        :class="[secondary ? '': '', sortedIndex.includes(index) ? 'cursor-pointer hover:underline hover:decoration-1' : '']"
        @click="sort(index)"
      >
        {{ item }}
      </th>
    </tr>
  </thead>
</template>

<script lang="ts" setup>
const props = defineProps({
  items: {
    type: Array<string>,
    required: true,
  },
  secondary: {
    type: Boolean,
    default: false,
  },
  sortedIndex: {
    type: Array<number>,
    required: false,
    default: () => [],
  },
})

const emit = defineEmits<{
  (event: 'sort', index: number): void
}>()

const sort = (index: number) => {
  if (props.sortedIndex?.includes(index)) {
    emit('sort', index)
  }
}
</script>
