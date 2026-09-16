<template>
  <section class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
    <widget-header
      icon="gearM"
      icon-class="text-title-setting-icon-def"
      :title="settingsHeaderTitle"
      class="mb-0! shrink-0"
    />

    <div class="flex h-0 min-h-0 flex-1 overflow-hidden">
      <aside class="flex w-90 shrink-0 flex-col justify-between overflow-y-auto border-r border-wrkspc-menu-brd-def bg-wrkspc-menu-bg-def">
        <ul class="flex flex-col">
          <router-link
            v-for="item in visibleNavItems"
            :key="item.routeName"
            v-slot="{ navigate, isActive }"
            :to="{ name: item.routeName }"
            custom
          >
            <li
              v-chain-tooltip="tooltips[item.tooltipKey]"
              :class="isActive
                ? 'bg-wrkspc-menu-menuitem-bg-pres'
                : 'bg-wrkspc-menu-menuitem-bg-def hover:bg-wrkspc-menu-menuitem-bg-hov'"
              class="flex h-14 cursor-pointer items-center px-6 text-[18px] leading-6.5 text-nowrap text-wrkspc-menu-menuitem-txt-def"
              @click="navigate"
            >
              {{ $t(item.labelKey) }}
            </li>
          </router-link>
        </ul>

        <settings-sidebar-footer />
      </aside>

      <main
        ref="contentScrollEl"
        class="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-wrkspc-main-bg-def text-white [overflow-anchor:none]"
        @focusin="preserveScrollOnSwitchFocus"
      >
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </main>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { vChainTooltip } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'

import { useMainSettingsStore } from '@/entities/main-settings'
import {
  useGooseSettingsStore,
  useMediaDeviceOverridesStore,
} from '@/entities/media-devices-settings'
import { tooltips, TooltipsScenarios, useTooltip } from '@/entities/tooltips'

import { useDevicesStore } from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'
import { WidgetHeader } from '@/shared/ui'

import { runSettingsLeaveFlush } from '../lib/run-settings-leave-flush'
import { SETTINGS_NAV_ITEMS, SETTINGS_SECTION_I18N_BY_ROUTE } from '../model'

import SettingsSidebarFooter from './SettingsSidebarFooter.vue'

const { startScenario } = useTooltip()
const { t } = useLocalization()
const route = useRoute()
const { gooseDevices } = storeToRefs(useDevicesStore())

const contentScrollEl = ref<HTMLElement | null>(null)

/** wui-input-switch: focus на hidden checkbox дёргает scroll и ломает shell */
const preserveScrollOnSwitchFocus = (event: FocusEvent) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return

  const scrollEl = contentScrollEl.value
  if (!scrollEl) return

  const scrollTop = scrollEl.scrollTop
  requestAnimationFrame(() => {
    scrollEl.scrollTop = scrollTop
  })
}

const visibleNavItems = computed(() =>
  SETTINGS_NAV_ITEMS.filter((item) => !item.requiresGoose || gooseDevices.value.length > 0),
)

const settingsHeaderTitle = computed(() => {
  const sectionKey = SETTINGS_SECTION_I18N_BY_ROUTE[String(route.name ?? '')]
  const sectionTitle = sectionKey ? t(sectionKey) : ''

  if (!sectionTitle) return t('Settings')

  return `${t('Settings')} / ${sectionTitle}`
})

onMounted(() => {
  startScenario(TooltipsScenarios.SETTINGS_PAGE)
})

onBeforeRouteLeave(async () => {
  await runSettingsLeaveFlush([
    () => useMainSettingsStore().saveIfDirty(),
    () => useGooseSettingsStore().saveIfDirty(),
    async () => {
      const overridesStore = useMediaDeviceOverridesStore()
      await overridesStore.flushPendingMainVolumePersist()
      await overridesStore.saveIfDirty()
    },
  ])
})
</script>
