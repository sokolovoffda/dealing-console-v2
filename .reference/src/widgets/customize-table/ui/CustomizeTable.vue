<template>
  <table class="table">
    <table-head :items="items" />
    <tbody>
      <tr v-for="item in Array.from(customizedContacts.values())" :key="item.pServed" class="table__row">
        <td class="table__cell text-center px-6">
          {{ contactsNames.get(item.pServed) }}
        </td>
        <td class="table__cell min-w-[150px] flex items-center">
          <input
            type="color"
            :value="item.color ?? '#000000'"
            @change="changeColor(item.pServed, $event)"
          >
          <wui-btn
            icon prepend-icon="refresh"
            text rounded class="ml-3 hover:!bg-transparent"
            :class="item.color ? '!text-white' : '!text-black-465'"
            @click="resetColor(item.pServed)"
          />
        </td>
        <td class="table__cell">
          <div class="flex items-center">
            <wui-select
              v-model="item.ringtoneGuid"
              :items="ringtonesSelectItems"
              class="app-select inline-block w-[300px]"
              @change="selectRingtone(item.pServed, $event)"
            />
            <wui-audio-player
              v-if="item.ringtonePath"
              :audio-src="item.ringtonePath"
              class="w-[300px] bg-black-735 rounded-8 ml-3"
            />
          </div>
        </td>
        <td class="table__cell">
          <wui-btn
            prepend-icon="deleteOutlined" icon text rounded
            class="!text-warning-shades-900 hover:!bg-black mx-auto"
            @click="removeRow(item.pServed)"
          />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { WuiAudioPlayer, WuiBtn, WuiSelect } from '@wui/common-library'
import { PServed } from '@wui/im'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useContactCachedStore } from '@/entities/contact'
import { useCustomizeStore, useRingtonesStore } from '@/entities/main-settings'

import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'
import { TableHead } from '@/shared/ui'


const ringtonesStore = useRingtonesStore()
const { ringtonesList } = storeToRefs(ringtonesStore)

const customizeStore = useCustomizeStore()
const { customizedContacts } = storeToRefs(customizeStore)
const { t } = useLocalization()
const storeContactsCached = useContactCachedStore()

const contactsNames = ref<Map<PServed, string>>(new Map())

watch(customizedContacts, async () => {
  const contacts = await storeContactsCached.fetchContactsBySomeIds(Array.from(customizedContacts.value.keys()))
  contacts.forEach(contact => contactsNames.value.set(contact.pServed, contact.name ?? ''))
}, { immediate: true, deep: true })

const ringtonesSelectItems = computed(() => {
  const items = [{ value: '', label: `- ${t('ByDefault')} -` }]
  Array.from(ringtonesList.value.values()).forEach(item => {
    items.push({ value: item.guid, label: item.name })
  })
  return items
})

const items = computed(() => [t('Name'), t('CardColor'), t('Ringtone'), t('Action')])

const selectRingtone = (contactPServed: string, event: Event) => {
  customizeStore.setRingtone(contactPServed, (event.target as HTMLInputElement).value)
}

const changeColor = (contactPServed: string, event: Event) => {
  customizeStore.setColor(contactPServed, (event.target as HTMLInputElement).value)
}

const resetColor = (contactPServed: string) => {
  customizeStore.setColor(contactPServed, undefined)
}

const removeRow = (pServed: string) => {
  const { showNotification } = useNotification()
  customizeStore.removeItem(pServed)
  showNotification({ type: 'success', message: t('ContactCustomizationReset') })
}
</script>
