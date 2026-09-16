<template>
  <section class="w-11/12 h-11/12 text-white flex flex-col justify-between overflow-hidden">
    <header class="bg-black-735 rounded-t-8 h-12 px-4 py-3">{{ name }}</header>
    <main class="min-h-0 flex flex-1 bg-black-800 border-b border-black-700 text-1316">
      <!-- Contacts -->
      <div v-if="selectModel === 'contacts'" class="w-1/2 min-h-0 flex flex-col">
        <generic-table
          v-model="contactModel"
          class="min-h-0 flex-1"
          :items="filteredContacts"
          :fields="[
            (c: Contact) => c.name,
            (c: Contact) => c.internalNumber,
            (c: Contact) => c.organization ?? t('NoData'),
            (c: Contact) => c.organizationalUnit ?? t('NoData'),
          ]"
          :headers="[t('FullName'), t('Number'), t('Department'), t('JobTitle')]"
          :unique-key="(c) => c.id"
        />
        <footer class="h-[72px] shrink-0 flex items-center justify-center bg-black-735 text-black">
          <wui-paginator
            v-model="paginationModel"
            :variants="PER_PAGE_VARIANTS"
          />
        </footer>
      </div>
      <!-- Conferences -->
      <div v-else-if="selectModel === 'conferences'" class="w-1/2 min-h-0 flex flex-col">
        <generic-table
          v-model="conferenceModel"
          class="min-h-0 flex-1"
          :items="visibleConferences"
          :fields="[
            (c: ConferenceDto) => c.name,
            (c: ConferenceDto) => c.subscribers.length,
            (c: ConferenceDto) => c.capacity,
            (c: ConferenceDto) => c.selectorMode
          ]"
          :headers="[t('ConferenceName'), t('NumberOfParticipants'), t('Capacity'), t('SelectionMode')]"
          :unique-key="(c) => c.pServed"
        />
        <footer class="h-[72px] shrink-0 flex items-center justify-center bg-black-735">
          <pagination-local
            :items="filteredConferences"
            :per-page="FETCH_SIZE_DEFAULT"
            :per-page-variants="PER_PAGE_VARIANTS"
            always-visible
            @set-items-per-page="setVisibleConferences"
          />
        </footer>
      </div>
      <!-- Groups -->
      <div v-else-if="selectModel === 'groups'" class="w-1/2 min-h-0 flex flex-col">
        <generic-table
          v-model="groupsModel"
          class="min-h-0 flex-1"
          :items="visibleGroups"
          :fields="[
            (g: Group) => g.name,
            (g: Group) => g.type,
          ]"
          :headers="[t('Name'), t('Type')]"
          :unique-key="(g) => g.guid"
          :column-widths="'grid-cols-[1fr_1fr]'"
        />
        <footer class="h-[72px] shrink-0 flex items-center justify-center bg-black-735">
          <pagination-local
            :items="filteredGroups"
            :per-page="FETCH_SIZE_DEFAULT"
            :per-page-variants="PER_PAGE_VARIANTS"
            always-visible
            @set-items-per-page="setVisibleGroups"
          />
        </footer>
      </div>

      <!-- Блок справа -->
      <div class="flex-1 px-6 flex flex-col justify-center gap-y-4">
        <div class="flex flex-col gap-y-4">
          <p>{{ $t('MarkedSubscribers') }}</p>
          <p>{{ $t('FindTheRequiredSubscriber') }}</p>
          <wui-select
            v-model="selectModel"
            :items="selectItems"
            class="app-select"
          />
          <wui-input
            v-model="nameModel"
            :placeholder="$t('Search')"
            prepend-icon="search"
            with-clear
            rounded
            class="w-102 bg-black-865 text-white"
          />
        </div>
        <keyboard-pad @on-key-tap="onKeyTap" />
      </div>
    </main>
    <footer class="bg-black-800 rounded-b-8 p-4 flex justify-center gap-x-2">
      <template v-if="props.tab">
        <wui-btn primary @click="edit">{{ $t('Edit') }}</wui-btn>
        <wui-btn primary @click="exit">{{ $t('Cancel') }}</wui-btn>
      </template>
      <template v-else>
        <wui-btn 
          primary 
          :disabled="!contactModel.length && !conferenceModel.length && !groupsModel.length"
          @click="create"
        >
          {{ $t('Create') }}
        </wui-btn>
        <wui-btn primary @click="back">{{ $t('Back') }}</wui-btn>
      </template>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { WuiBtn, WuiInput, WuiSelect } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref, onMounted } from 'vue'

import { KeyboardPad } from '@/features/keyboard-pad'
import { PaginationLocal } from '@/features/pagination'

import { ConferenceDto, useConferenceState } from '@/entities/conference'
import { Contact, useContactFiltering } from '@/entities/contact'
import { Group, useGroupStore } from '@/entities/group'
import type { ContactTab } from '@/entities/settings'

import { useLocalization } from '@/shared/i18n'
import { GenericTable } from '@/shared/ui'
import { IKeyboardKey } from '@/shared/utils/keyboard'

const props = defineProps<{
  tab?: ContactTab
  name: string
}>()

const emits = defineEmits<{
  (event: 'next', name: string): void
  (event: 'edit', payload: { contacts: Contact[], conferences: ConferenceDto[], groups: Group[] }): void
  (event: 'back'): void
  (event: 'exit'): void
}>()

const { conferences } = useConferenceState()

const nameModel = ref('')
const FETCH_SIZE_DEFAULT = 14
const PER_PAGE_VARIANTS = [FETCH_SIZE_DEFAULT, FETCH_SIZE_DEFAULT * 2, FETCH_SIZE_DEFAULT * 4, FETCH_SIZE_DEFAULT * 8]
const { list: arrayContacts, fetchContacts, paginationModel } = useContactFiltering(nameModel, FETCH_SIZE_DEFAULT)

const { t } = useLocalization()
const groupStore = useGroupStore()
const { groups } = storeToRefs(groupStore)

const selectModel = ref<'contacts' | 'conferences' | 'groups'>('contacts')
const selectItems = [{ label: t('Contacts'), value: 'contacts' }, { label: t('Conferences'), value: 'conferences' }, { label: t('ScenarioGroupsHeader'), value: 'groups' }]

const contactModel = ref<Contact[]>([])
const visibleConferences = ref<ConferenceDto[]>([])
const visibleGroups = ref<Group[]>([])

const setVisibleConferences = (items: ConferenceDto[]) => {
  visibleConferences.value = items
}

const setVisibleGroups = (items: Group[]) => {
  visibleGroups.value = items
}

onMounted(async () => {
  fetchContacts({ Page: 1, Size: FETCH_SIZE_DEFAULT, SearchText: nameModel.value })
})

const conferenceModel = ref<ConferenceDto[]>([])
const groupsModel = ref<Group[]>([])

const filteredContacts = computed(() => {
  return arrayContacts.value.filter(contact => contact.name.toLowerCase().includes(nameModel.value.toLowerCase()))
})
const filteredConferences = computed(() => {
  return conferences.value.filter(conf => conf.name.toLowerCase().includes(nameModel.value.toLowerCase())) as ConferenceDto[]
})
const filteredGroups = computed(() => {
  return Array.from(groups.value.values()).filter(group => group.name.toLowerCase().includes(nameModel.value.toLowerCase())) as Group[]
})

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }) => {
  if (param.letter) {
    nameModel.value += param.letter
  }
  if (param.key.event === 'backspace') {
    nameModel.value = param.key.handler && param.key.handler(nameModel.value) || ''
  }
  if (param.key.event === 'submitForm') {

  }
}

const create = () => {
  console.warn('Contact tabs are managed by backend groups')
  emits('exit')
}

const edit = () => {
  emits('edit', { contacts: contactModel.value, conferences: conferenceModel.value, groups: groupsModel.value })
}

const back = () => {
  emits('back')
}

const exit = () => {
  emits('exit')
}
</script>
