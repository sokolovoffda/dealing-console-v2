<template>
  <icon-button
    :icon="isRedirecting ? 'clear' : 'moderConf'"
    :loading="loading"
    :disabled="loading"
    large-icon
    class="!w-[80px] !h-[80px] relative"
    title="Добавить входящий звонок в конференцию"
    @click="toggle"
  />
</template>

<script setup lang="ts">
import {
  useRedirectPeerToPeerToConference,
} from '@/features/redirect-peer-to-peer-to-conference'

import { IconButton } from '@/shared/ui'

const props = defineProps<{
  callId: string
  internalNumber: string
}>()

const { isRedirecting, startRedirect, reset, loading } = useRedirectPeerToPeerToConference()

const toggle = async () => {
  if (isRedirecting.value) {
    reset()
  } else {
    startRedirect(props.callId, props.internalNumber)
  }
}
</script>