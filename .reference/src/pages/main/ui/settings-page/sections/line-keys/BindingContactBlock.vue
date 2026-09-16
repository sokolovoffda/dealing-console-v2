<template>
  <section class="grow overflow-auto">
    <header class="py-3 px-4 bg-black-700 border-b border-b-black-600 font-light text-1424">
      {{ $t('SettingUpProgrammableKeysOnYourTelephone') }}: {{ title }}
    </header>
    <div class="flex">
      <table class="table">
        <table-head :items="headerItems" />
        <tbody>
          <binding-contact-block-row
            v-for="({ button, pServed, type, groupIndex }, index) in rows"
            :key="button"
            :p-served="pServed"
            :button-key="button"
            :binding-type="type"
            :group-index="groupIndex"
            :index="index + 1"
          />
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { BindingContactBlockRow, useBindingControllerButtonsStore } from '@/entities/binding-contacts'

import { type LogicalMediaDevice, useDevicesStore } from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'
import { TableHead } from '@/shared/ui'

const route = useRoute()
const { getBindingContactsByModule } = useBindingControllerButtonsStore()
const { getDeviceById } = useDevicesStore()
const { t } = useLocalization()

const device = computed<LogicalMediaDevice | undefined>(() => {
  const id = route.params.id as string
  return getDeviceById(id)
})


const title = computed(() => device.value?.name ?? 'unknown')

const rows = computed(() => device.value ? getBindingContactsByModule(device.value.module ?? '') : [])

const headerItems = computed(() => ['№', t('Type'), t('Binding')])
</script>
