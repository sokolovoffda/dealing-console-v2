<template>
  <slot
    :leave="leave"
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
const { removeSubscriber } = useIM()

const loading = ref(false)

const leave = async () => {
  if (!currentUser.value) {
    console.warn('currentUser is ' + currentUser.value)
    return
  }
  try {
    loading.value = true
    await removeSubscriber({
      pServed: props.pServed,
      targetInternalNumber: currentUser.value.internalNumber,
    })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
