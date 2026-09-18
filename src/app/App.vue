<template>
  <nav>
    <RouterLink v-for="route in navRoutes" :to="route.path" :key="route.path">
      {{ route.meta?.title }}
    </RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { routes } from './router'

const navRoutes = routes.filter((r) => r.meta?.nav)
</script>
