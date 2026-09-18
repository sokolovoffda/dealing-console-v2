import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppShellStore = defineStore('app-shell', () => {
  const visitCount = ref(0)

  const increment = () => {
    visitCount.value += 1
  }

  return {
    visitCount,
    increment,
  }
})
