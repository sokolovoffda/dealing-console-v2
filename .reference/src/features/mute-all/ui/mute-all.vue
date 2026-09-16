<template>
  <slot
    :mute="muteAll"
    :loading="loading"
  />
</template>

<script setup lang="ts">
import { useIM } from '@wui/im'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import { useAppStore } from '@/shared/composables'

const props = defineProps<{
  pServed: string
}>()

const { currentUser } = storeToRefs(useAppStore())
const { muteAllAudioExceptExecuter } = useIM()

const loading = ref(false)

const muteAll = async () => {
  if (!currentUser.value) {
    console.warn('currentUser is ' + currentUser.value)
    return
  }
  try {
    loading.value = true
    await muteAllAudioExceptExecuter({
      pServed: props.pServed,
    })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
