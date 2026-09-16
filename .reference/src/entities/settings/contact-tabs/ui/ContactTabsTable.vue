<template>
  <table class="table contact-tabs-table">
    <table-head :items="headers" />
    <tbody>
      <contact-tabs-row />
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'


import { useLocalization } from '@/shared/i18n'
import { TableHead } from '@/shared/ui'

import ContactTabsRow from './ContactTabsRow.vue'

const { t } = useLocalization()

const headers = computed(() => [t('On'), t('Order'), t('Title'), t('Subscribers'), t('Delete')])
</script>

<style scoped>
.contact-tabs-table {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.contact-tabs-table :deep(thead) {
  display: table;
  width: 100%;
  flex-shrink: 0;
  table-layout: fixed;
}

.contact-tabs-table :deep(tbody) {
  display: block;
  min-height: 0;
  flex: 1 1 0%;
  overflow-y: auto;
}

.contact-tabs-table :deep(thead tr),
.contact-tabs-table :deep(tbody tr) {
  display: table;
  width: 100%;
  table-layout: fixed;
}

</style>
