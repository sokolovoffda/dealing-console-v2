<template>
  <app-modal
    :title="$t('DeleteWorkspaceConfirmTitle')"
    :cancel-text="$t('Cancel')"
    :confirm-text="$t('Delete')"
    data-test="delete-workspace-confirm-modal"
  >
    <p class="text-lg leading-6 text-fg-base-fg85">
      {{ $t('DeleteWorkspaceConfirmDescription') }}
    </p>
  </app-modal>
</template>

<script setup lang="ts">
import { AppModal } from '@/shared/ui'
</script>
