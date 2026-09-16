<template>
  <div class="flex items-center justify-center h-full flex-col">
    <skeleton-bands />
    <div class="text-black-335 mt-2 text-1624">{{ $t('TheQueueIsEmpty') }}</div>
  </div>
</template>

<script setup lang="ts">
import { SkeletonBands } from '@/shared/ui'
</script>
