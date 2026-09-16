<template>
  <div class="overflow-hidden flex flex-row h-[64px] cursor-pointer rounded-8 bg-black-300 shadow-[0_0_2px_0_rgba(0,0,0,0.5)]">
    <slot name="leftSide" />

    <div class="flex-grow flex flex-col justify-around border-x border-black-735 p-2 text-left min-w-0">
      <slot name="center" />
    </div>

    <slot name="rightSide" />
  </div>
</template>

<script setup lang="ts">
defineSlots<{
  leftSide(props: unknown): void
  center(props: unknown): void
  rightSide(props: unknown): void
}>()
</script>
