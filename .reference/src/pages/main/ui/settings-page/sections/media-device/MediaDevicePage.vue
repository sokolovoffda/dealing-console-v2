<template>
  <section class="flex min-w-0 flex-col">
    <section v-if="error" class="flex flex-col">
      <settings-cblock-title>
        {{ $t('MediaDevices') }}
      </settings-cblock-title>
      <div class="flex flex-col border-b border-wrkspc-main-cblock-brd-def p-8">
        <p class="text-wrkspc-main-cblock-txt-def">{{ error }}</p>
      </div>
    </section>

    <template v-else>
      <section class="flex flex-col">
        <settings-cblock-title>
          {{ $t('MediaDevices') }}
        </settings-cblock-title>
        <div class="flex flex-col items-start gap-6 border-b border-wrkspc-main-cblock-brd-def p-8">
          <goose-media-settings-panel />
        </div>
      </section>

      <section
        v-for="device in sortedDevices"
        :key="device.id"
        class="flex flex-col"
      >
        <settings-cblock-title>
          {{ device.name }}
        </settings-cblock-title>
        <div class="flex flex-col items-start gap-6 border-b border-wrkspc-main-cblock-brd-def p-8">
          <media-device-item :device="device" />
        </div>
      </section>

      <section v-if="!sortedDevices.length" class="flex flex-col">
        <settings-cblock-title>
          {{ $t('MediaDevices') }}
        </settings-cblock-title>
        <div class="flex flex-col border-b border-wrkspc-main-cblock-brd-def p-8">
          <p class="text-wrkspc-main-cblock-txt-def">
            {{ $t('ThereAreNoConfiguredConfigurations') }}
          </p>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

import {
  GooseMediaSettingsPanel,
  MediaDeviceItem,
  useMediaDeviceOverridesStore,
} from '@/entities/media-devices-settings'

import { type LogicalMediaDevice, useDevicesStore } from '@/shared/composables'

import SettingsCblockTitle from '../../ui/SettingsCblockTitle.vue'

const store = useDevicesStore()
const overridesStore = useMediaDeviceOverridesStore()
const { devices, error } = storeToRefs(store)

const sortedDevices = computed<LogicalMediaDevice[]>(() =>
  [...devices.value].sort((a, b) => a.order - b.order),
)

onMounted(() => {
  void overridesStore.ensureLoaded()
})
</script>
