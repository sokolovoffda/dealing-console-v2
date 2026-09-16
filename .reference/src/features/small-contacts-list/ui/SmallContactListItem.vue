<template>
  <section class="text-left contact-list-item flex gap-2 w-[400px]" data-test="small-contact-list-item">
    <p class="contact-list-item__name whitespace-nowrap" data-test="name">{{ contact.name || 'Нет имени' }}</p>
    <p class="contact-list-item__name whitespace-nowrap">
      <span v-if="contact.mobilePhone" data-test="mobile-phone">{{ contact.mobilePhone }}</span>
      <span v-if="contact.internalNumber" data-test="internal-number" class="font-bold"> ({{ contact.internalNumber }})</span>
    </p>
  </section>
</template>

<script lang="ts" setup>
import { Contact } from '@/entities/contact'

defineProps<{
  contact: Contact
}>()
</script>
