<template>
  <div class="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
    <app-footer-user-block class="min-w-0 justify-self-start" />
    <call-card-dropdown-host class="justify-self-center">
      <template #activator>
        <footer-handset-controls />
      </template>
    </call-card-dropdown-host>
    <footer-global-controls
      class="justify-self-end"
      :is-header-hidden="isHeaderHidden"
      @toggle-header="emit('toggle-header')"
    />
  </div>
</template>

<script lang="ts" setup>
import { CallCardDropdownHost } from '@/features/call-card'

import AppFooterUserBlock from './AppFooterUserBlock.vue'
import FooterGlobalControls from './FooterGlobalControls.vue'
import FooterHandsetControls from './FooterHandsetControls.vue'

defineProps<{
  isHeaderHidden: boolean
}>()

const emit = defineEmits<{
  'toggle-header': []
}>()
</script>
