<template>
  <div class="cursor-pointer h-12 border-b border-black-700 bg-black-800 grid grid-cols-[20%_10%_10%_20%_20%_20%] items-center py-1 text-1315 text-black-135" @click="select">
    <div class="px-4 truncate" :title="item.name">{{ item.name }}</div>
    <div class="px-4 truncate" :title="item.internalNumber">{{ item.internalNumber }}</div>
    <div class="px-4 truncate" :title="item.organization">{{ item.organization }}</div>
    <div class="px-4 truncate">{{ item.position }}</div>
    <div class="px-4 truncate">{{ item.email }}</div>
    <div class="px-4 truncate">
      <ul class="flex gap-x-2">
        <li v-for="(name, index) in item.groups.map((i) => i.name)" :key="index">{{ name }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

import { selectContact } from '@/entities/call-session'
import { Contact } from '@/entities/contact'

const props = defineProps<{
  item: Contact
  isActive: boolean
}>()

const { push } = useRouter()
const select = () => {
  push({ name: 'Phonebook', params: { id: props.item.id } })
  selectContact(props.item)
}
</script>
