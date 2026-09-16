<template>
  <div class="w-full rounded-8 bg-wrkspc-main-bg-def text-[18px] leading-6.5 text-wrkspc-menu-menuitem-txt-def shadow-lg">
    <div
      v-if="hostname"
      class="break-all px-4 pt-4"
    >
      hostname: {{ hostname }}
    </div>
    <ul class="flex max-h-80 flex-col gap-y-3 overflow-auto p-4">
      <template v-if="isNetworkInfoLoading">
        <li class="wrap-break-words">Loading network information...</li>
      </template>
      <template v-else-if="false">
        <li class="wrap-break-words">Запрашиваем сетевую информацию...</li>
      </template>
      <template v-else-if="interfaces.length">
        <li
          v-for="item in interfaces"
          :key="item.name"
          class="wrap-break-words rounded-8 border border-wrkspc-menu-brd-def p-3"
        >
          <p class="break-all">name: {{ item.name }}</p>
          <p class="break-all">mac_address: {{ item.mac_address }}</p>
          <p class="break-all">ip_address: {{ item.ip_address }}</p>
          <p class="break-all">broadcast: {{ item.broadcast }}</p>
          <p class="break-all">gateway: {{ item.gateway }}</p>
          <p class="break-all">speed: {{ item.speed }}</p>
          <p class="break-all">label: {{ item.label }}</p>
        </li>
      </template>
      <template v-else-if="!controllerIsConnected">
        <li class="wrap-break-words">No connection to the local controller.</li>
      </template>
      <template v-else>
        <li class="wrap-break-words">No network interface data.</li>
      </template>
      <template v-if="false">
        <li class="whitespace-nowrap">Нет данных</li>
      </template>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/shared/composables'
import { useController } from '@/shared/controller'

const appStore = useAppStore()
const { interfaces, hostname, isNetworkInfoLoading } = storeToRefs(appStore)
const { controllerIsConnected } = useController()
</script>
