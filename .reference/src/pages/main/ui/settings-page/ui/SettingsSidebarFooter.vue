<template>
  <div class="flex flex-col gap-2 p-4">
    <!-- Временно: выход из сессии (старый LeftPanel exitToApp). -->
    <wui-btn
      block
      tone="neut"
      state="alpha"
      :size="48"
      prepend-icon="exitToApp"
      class="justify-start! rounded-12! text-[18px]! leading-6.5! text-wrkspc-menu-menuitem-txt-def!"
      data-test="settings-logout-button"
      @click="onLogoutClick"
    >
      Выйти
    </wui-btn>
    <div
      v-click-outside="closeNetworkInterfaces"
      class="relative"
    >
      <button
        type="button"
        class="w-full cursor-pointer touch-manipulation rounded-8 bg-wrkspc-main-bg-def px-2 py-4 text-center text-[18px] leading-6.5 text-wrkspc-menu-menuitem-txt-def"
        @pointerup.stop.prevent="handleVersionActivator"
      >
        v{{ version }}
      </button>
      <div
        v-if="isNetworkInterfacesOpen"
        class="absolute bottom-full left-0 right-0 z-50 mb-2 w-full"
      >
        <network-interfaces />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ClickOutside as vClickOutside, WuiBtn } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import { version } from '@/../package.json'

import { NetworkInterfaces } from '@/entities/network-interfaces'

import { useAuth } from '@/shared/auth'
import { useAppStore } from '@/shared/composables'
import { useController } from '@/shared/controller'

const { interfaces, isNetworkInfoLoading } = storeToRefs(useAppStore())
const { controllerIsConnected, getNetworkInformation } = useController()
const isNetworkInterfacesOpen = ref(false)

const onLogoutClick = () => {
  void useAuth.logout()
}

const closeNetworkInterfaces = () => {
  isNetworkInterfacesOpen.value = false
}

const handleVersionActivator = () => {
  isNetworkInterfacesOpen.value = !isNetworkInterfacesOpen.value

  if (isNetworkInterfacesOpen.value && !interfaces.value.length && !isNetworkInfoLoading.value && controllerIsConnected.value) {
    getNetworkInformation()
  }
}
</script>
