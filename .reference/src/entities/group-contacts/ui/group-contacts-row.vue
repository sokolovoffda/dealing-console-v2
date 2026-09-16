<template>
  <div
    class="flex border-b border-black-600 px-4 py-2 min-h-[96px]"
  >
    <div class="flex items-center gap-2 mr-4">
      <slot name="buttons" />
    </div>
    <slot name="contacts" />
  </div>
</template>

<script setup lang="ts">
defineSlots<{
  buttons(props: unknown): void
  contacts(props: unknown): void
}>()
</script>
