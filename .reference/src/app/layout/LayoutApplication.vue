<template>
  <div class="flex h-screen flex-col  overflow-hidden">
    <header v-if="!isHeaderHidden" class="h-22 bg-wrkspc-hdr-bg-def border-b border-wrkspc-hdr-brd-def py-2 px-6">
      <app-header />
    </header>

    <main class="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden p-2">
      <router-view v-slot="{ Component }">
        <component :is="Component" class="min-h-0 flex-1" />
      </router-view>
    </main>

    <footer class="flex h-26 shrink-0 items-center bg-ftr-bg-def border-t border-ftr-brd-def p-4">
      <app-footer :is-header-hidden="isHeaderHidden" @toggle-header="toggleHeader" />
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { UserInfo } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { onBeforeMount } from 'vue'

import { AppFooter } from '@/widgets/app-footer'
import { AppHeader } from '@/widgets/app-header'

import { useGlobalRingtoneSettingsSync } from '@/features/global-ringtone'

import { useCallHistoryStore } from '@/entities/call-history'
import { useConferenceState } from '@/entities/conference'
import { useContactStore } from '@/entities/contact'
import { usePickupStore } from '@/entities/pickup'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'
import { useContactTabs } from '@/entities/settings'
import { TooltipsScenarios, useTooltip } from '@/entities/tooltips'
import { useWorkspaceStore } from '@/entities/workspace'

import {
  checkMicrophonePermission,
  useAppStore,
  useConfigurationState,
  useDevicesStore,
  useStatusSubscribe,
} from '@/shared/composables'
import { getUAConf, useWebRTC } from '@/shared/jssip'
import { IDB } from '@/shared/services'
import { getAbsoluteWebSocketURL } from '@/shared/url-helper'

const { configuration, fetchConfiguration } = useConfigurationState()
const { initSIP } = useWebRTC()
const { fetchAll: fetchConferences } = useConferenceState()
const { startSubscribeHandler } = useStatusSubscribe()

const { fetchHistory: fetchCallHistory } = useCallHistoryStore()
const { fetchPickupGroups } = usePickupStore()
const contactTabsStore = useContactTabs()
const appStore = useAppStore()
const workspaceStore = useWorkspaceStore()
const { currentUser } = storeToRefs(appStore)
const { isHeaderHidden } = storeToRefs(workspaceStore)
const { startScenario, loadScenarios } = useTooltip()

useGlobalRingtoneSettingsSync()

const toggleHeader = () => {
  workspaceStore.toggleHeaderVisibility()
}

onBeforeMount(async () => {
  try {
    await IDB.openDB()
    await appStore.loadCapacity()
    await fetchConfiguration()
    await workspaceStore.initWorkspaces()
    await checkMicrophonePermission()

    await fetchConferences()
    await contactTabsStore.initTabs()

    await initSIP({
      sipWs: getAbsoluteWebSocketURL(configuration.value.sipWs),
      ua: getUAConf((currentUser.value as UserInfo), configuration.value.domainPath),
    })

    startSubscribeHandler()
    useDevicesStore().init()
    void usePinnedCallsPanelStore().fetchPanel().catch((e) => {
      console.error('Pinned calls panel load failed:', e)
    })

    await fetchCallHistory()
    await loadScenarios()
    startScenario(TooltipsScenarios.WELCOME)
    void useContactStore().fetchExternalContactsFromIndexedDb()
  } catch (e) {
    console.error(e)
  }

  await fetchPickupGroups()
})
</script>
