<template>
  <app-modal
    :title="$t('ResetSettingsConfirmTitle')"
    :cancel-text="$t('Cancel')"
    :confirm-text="$t('ResetSettings')"
    data-test="reset-main-settings-confirm-modal"
  >
    <p class="text-lg leading-6 text-fg-base-fg85">
      {{ $t('ResetSettingsDescription') }}
    </p>
  </app-modal>
</template>

<script setup lang="ts">
import { AppModal } from '@/shared/ui'
</script>
