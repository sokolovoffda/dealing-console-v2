<template>
  <ul class="absolute top-0 right-0">
    <li v-for="[ key, notification ] in notifications" :key="key">
      <app-notification :notification="notification" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useNotification } from '../model/useNotification'
import AppNotification from '../ui/AppNotification.vue'

const { notifications } = useNotification()
</script>
