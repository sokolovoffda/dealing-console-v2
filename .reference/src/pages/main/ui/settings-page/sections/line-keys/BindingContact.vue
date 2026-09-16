<template>
  <section class="flex h-full min-h-0 flex-col justify-between bg-black-700">
    <header class="bg-black-735 px-4 py-3 border-b border-black-600">
      <h3 class="text-1624">{{ $t('TelephoneLineKeys') }}</h3>
    </header>
    <div class="flex min-h-0 grow overflow-hidden">
      <aside class="flex w-60 flex-col overflow-y-auto border-r border-r-black-600 bg-black-700 px-2 py-10 text-1432">
        <ul>
          <template v-for="(item, index) in gooseDevices" :key="item.id">
            <router-link
              v-slot="{ navigate, isActive }"
              :to="{ name: 'BindingContactBlock', params: { id: item.id } }"
              custom
            >
              <li :class="{'bg-black-865': isActive}" class="text-white px-4 py-2 mb-1 rounded-4 cursor-pointer text-nowrap" @click="navigate">{{ $t('KeyBlock') }} №{{ index + 1 }}</li>
            </router-link>
          </template>
        </ul>
      </aside>
      <div class="min-h-0 min-w-0 grow overflow-auto">
        <router-view />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onBeforeUnmount } from 'vue'

import { useBindingControllerButtonsStore } from '@/entities/binding-contacts'

import { useDevicesStore } from '@/shared/composables'

const store = useBindingControllerButtonsStore()
const devicesStore = useDevicesStore()

const { gooseDevices } = storeToRefs(devicesStore)

onBeforeUnmount(() => {
  store.save()
})
</script>
