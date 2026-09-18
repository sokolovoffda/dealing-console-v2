<template>
  <nav v-if="!hideNav">
    <RouterLink v-for="route in navRoutes" :to="route.path" :key="route.path">
      {{ route.meta?.title }}
    </RouterLink>
  </nav>
  <main class="h-full w-full">
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { routes } from './router'
import { computed } from 'vue'
const route = useRoute()
const navRoutes = routes.filter((r) => r.meta?.nav)
const hideNav = computed(() => route.name === 'login')
</script>
