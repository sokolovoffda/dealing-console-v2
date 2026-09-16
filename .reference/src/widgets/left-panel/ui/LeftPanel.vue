<template>
  <div class="left-panel text-white flex flex-col justify-between text-center box-border px-2">
    <div v-chain-tooltip="tooltips.person" class="rounded-8">
      <p class="text-1424 mt-3">{{ currentDate }}</p>
      <p class="text-2432/none mb-8">{{ currentTime }}</p>
      <wui-icon
        name="person" class="!w-14 !h-14 -mt-2"
        :style="{color: onRegisteredSIP ? '#72B432' : '#FF8000'}"
      />
      <p class="text-1420 pb-1 truncate" v-html="username2RowsHTML" />
      <p class="text-1424 truncate">{{ currentUser?.internalNumber }}</p>
    </div>

    <div class="flex gap-2 flex-col items-center">
      <router-link v-slot="{ isActive, navigate }" custom :to="{ name: 'Contacts' }">
        <button
          v-chain-tooltip="tooltips.contacts"
          class="p-4 rounded-8 relative text-white hover:bg-black-865"
          :class="{'bg-black-865': isActive}"
          @click="navigate"
        >
          <wui-icon name="tab" large />
        </button>
      </router-link>
      <router-link v-slot="{ isActive, navigate }" custom :to="{ name: 'Phonebook' }">
        <button
          v-chain-tooltip="tooltips.phonebook"
          class="p-4 rounded-8 relative text-white hover:bg-black-865"
          :class="{'bg-black-865': isActive}"
          @click="navigate"
        >
          <wui-icon name="permContactCalendar" large />
        </button>
      </router-link>
      <router-link v-slot="{ navigate, isActive }" custom :to="{ name: 'Groups' }">
        <button
          v-chain-tooltip="tooltips.groups"
          class="p-4 rounded-8 relative text-white hover:bg-black-865"
          :class="{'bg-black-865': isActive}"
          @click="navigate"
        >
          <wui-icon name="hub" large />
        </button>
      </router-link>
      <router-link v-slot="{ navigate, isActive }" custom :to="{ name: 'History' }">
        <button
          v-chain-tooltip="tooltips.history"
          class="p-4 rounded-8 relative text-white hover:bg-black-865"
          :class="{'bg-black-865': isActive}"
          @click="navigate"
        >
          <wui-icon name="history" large />
        </button>
      </router-link>
      <router-link
        v-slot="{ isActive, navigate }"
        custom
        :to="{ name: 'Settings' }"
      >
        <button
          v-chain-tooltip="tooltips.settings"
          class="p-4 rounded-8 relative text-white hover:bg-black-865 mt-[160px]"
          :class="{'bg-black-865': isActive}"
          @click="navigate"
        >
          <wui-icon
            large
            name="settings"
          />
        </button>
      </router-link>
      <button
        v-chain-tooltip="tooltips.reload"
        class="p-4 rounded-8 relative text-white hover:bg-black-865"
        @click="onReloadClick"
      >
        <wui-icon name="refresh" large />
      </button>
      <button
        v-chain-tooltip="tooltips.exit"
        class="p-4 rounded-8 relative text-white hover:bg-black-865"
        @click="onLogoutClick"
      >
        <wui-icon
          name="exitToApp"
          large
        />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useDialog, WuiIcon, vChainTooltip } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { ComponentOptions, computed, onUnmounted } from 'vue'

import { tooltips } from '@/entities/tooltips'

import { useAuth } from '@/shared/auth'
import { useAppStore } from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'
import { clearIntervals, currentDate, currentTime } from '@/shared/utils/current-date-time'
import { isElectron } from '@/shared/utils/electron-helpers'

import ReloadConfirmDialog from './ReloadConfirmDialog.vue'

const { onRegisteredSIP } = useWebRTC()
const { showDialog } = useDialog<boolean | undefined>()

onUnmounted(() => {
  clearIntervals()
})

const { currentUser } = storeToRefs(useAppStore())

const onReloadClick = async () => {
  const isConfirmed = await showDialog(ReloadConfirmDialog as ComponentOptions)

  if (!isConfirmed) {
    return
  }

  if (isElectron()) {
    await window.electronAPI.relaunch()
  } else {
    window.location.reload()
  }
}

const username2RowsHTML = computed(() => currentUser.value ? currentUser.value?.name.split(' ').join('<br>') : '')

const onLogoutClick = () => {
  void useAuth.logout()
}
</script>

<style scoped>
.left-panel {
  max-width: 96px;
  min-width: 96px;
}
</style>
