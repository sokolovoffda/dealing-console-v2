<template>
  <main>
    <h1>Dealing Console v2</h1>
    <p>Учебный scaffold. FSD и интеграции — в следующих LEARN.</p>
    <div>{{ visitCount }}</div>
    <button @click="increment">+</button>
  </main>
</template>

<script setup lang="ts">
import { useAppShellStore } from '@/shared'
import { storeToRefs } from 'pinia'

const appShellStore = useAppShellStore()

const { visitCount } = storeToRefs(appShellStore)
const { increment } = appShellStore
</script>

<style scoped></style>
