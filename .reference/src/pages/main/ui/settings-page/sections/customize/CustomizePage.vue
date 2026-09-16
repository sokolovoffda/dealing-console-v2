<template>
  <section class="flex flex-col justify-between h-full bg-black-665">
    <header class="bg-black-735 px-4 py-3">
      <h3 class="text-1624">{{ $t('CallPrioritizationSettings') }}</h3>
    </header>
    <main class="grow overflow-y-auto bg-black-800">
      <customize-table v-if="customizedContacts.size" />
      <div v-else class="flex flex-col justify-center items-center h-full">
        <div class="max-w-[300px] text-center">{{ $t('ClickThePlusSignBelowToAddYourOwnRingtonesAndColorsToYourContacts') }}</div>
        <wui-icon name="select" large class="mt-2" />
      </div>
    </main>
    <footer class="flex items-center justify-center bg-black-700 py-3">
      <icon-button icon="addCircleOutlined" class="shadow-[0_0_2px_0_rgba(0,0,0,0.5)] border-none !bg-black-600" @click="onClickAdd" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { useDialog, WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { ComponentOptions } from 'vue'

import { CustomizeTable } from '@/widgets/customize-table'

import { Contact } from '@/entities/contact'
import { useCustomizeStore, useRingtonesStore } from '@/entities/main-settings'

import { useLocalization } from '@/shared/i18n'
import { ChangeContactsModal, IconButton } from '@/shared/ui'

const { t } = useLocalization()
const customizeStore = useCustomizeStore()
const { showDialog } = useDialog<Contact[] | undefined>()

const ringtonesStore = useRingtonesStore()
ringtonesStore.loadStore()

const { customizedContacts } = storeToRefs(useCustomizeStore())

const onClickAdd = async () => {
  const title = t('SelectContact')
  const description = t('SelectContactDescription')
  const result = await showDialog(ChangeContactsModal as ComponentOptions, {
    title,
    contactsPServed: [],
    disableExternal: true,
    description,
    hasOverlay: true,
  })
  
  if (!result?.length) return
  await customizeStore.addItems(result.map(contact => contact.pServed))
}
</script>
