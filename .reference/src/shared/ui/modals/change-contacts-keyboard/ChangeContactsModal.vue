<template>
  <section
    v-click-outside="() => close()"
    class="flex h-[75vh] max-h-[90vh] w-[calc(100vw-32px)] flex-col justify-between !overflow-hidden rounded-12 border border-ftr-brd-def text-white"
  >
    <header class="flex h-[72px] shrink-0 items-center justify-between bg-ftr-bg-def px-4 text-xl">
      <p>{{ title }}</p>
      <wui-btn
        icon
        text
        prepend-icon="clear"
        state="alpha"
        variant="neut"
        :size="48"
        @click="() => close()"
      />
    </header>
    <main class="flex min-h-0 flex-1 gap-4 bg-bg-base-bg3 py-2 pr-2">
      <!-- Фиксированная колонка под таблицу — без скачка при подгрузке контактов -->
      <div class="flex min-h-0 w-1/2 min-w-0 flex-col">
        <generic-table
          v-if="hasVisibleItems"
          v-model="model as Contact[]"
          :items="filteredContacts"
          :fields="[
            (c: Contact) => c.name,
            (c: Contact) => c.internalNumber,
            (c: Contact) => c.organization ?? t('NoData'),
            (c: Contact) => c.organizationalUnit ?? t('NoData'),
          ]"
          :headers="[t('FullName'), t('Number'), t('Department'), t('JobTitle')]"
          :unique-key="(c) => c.id"
          :selection-mode="selectionMode"
          column-widths="grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
        />
        <div
          v-else
          class="flex min-h-0 flex-1 flex-col items-center justify-center"
        >
          <div class="text-center">
            <wui-icon name="unknown" class="h-[120px]! w-[120px]! pb-2 text-black-600" />
            <p class="pb-4 text-xl">{{ $t('SubscribersNotFound') }}</p>
          </div>
          <wui-btn
            v-if="!disableExternal && validExternalNumber"
            :disabled="externalContactCreating"
            variant="brand"
            state="filled"
            :size="48"
            @click="addAsExternal"
          >
            {{ $t('AddExternalContact') }}
          </wui-btn>
        </div>
      </div>

      <div class="flex w-1/2 min-w-0 shrink-0 flex-col justify-between">
        <wui-input
          v-model="searchModel"
          :placeholder="$t('Search')"
          prepend-icon="search"
          :size="48"
          with-clear rounded
        />
        
        <keyboard-pad @on-key-tap="onKeyTap" />
        <footer class="flex justify-center gap-2">
          <wui-btn
            :disabled="!model.length"
            variant="brand"
            state="filled"
            :size="48"
            @click="close(model)"
          >
            {{ $t('Save') }}
          </wui-btn>
          
          <wui-btn
            variant="neut"
            state="alpha"
            :size="48"
            @click="() => close()"
          >
            {{ $t('Cancel') }}
          </wui-btn>
        </footer>
      </div>
    </main>
    <footer class="flex h-[72px] shrink-0 bg-ftr-bg-def">
      <wui-paginator
        v-model="paginationModel"
        :variants="PER_PAGE_VARIANTS"
        :page-selector-threshold="1"
        :size="48"
      />
    </footer>
  </section>
</template>

<script setup lang="ts">
import {
  WuiInput,
  closeDialogKey,
  ClickOutside as vClickOutside,
  WuiIcon, WuiBtn, WuiPaginator,
} from '@wui/common-library'
import { PServed } from '@wui/im'
import { storeToRefs } from 'pinia'
import { computed, ref, watch, onMounted } from 'vue'

import { KeyboardPad } from '@/features/keyboard-pad'

import { ConferenceDto, useConferenceState } from '@/entities/conference'
import {
  ClientApplicationContactDto,
  Contact,
  useContactApi,
  useContactFiltering,
  useContactCachedStore,
  useContactStore,
} from '@/entities/contact'


import { useLocalization } from '@/shared/i18n'
import { contactNumberToPServed } from '@/shared/services'
import { createExternalContact } from '@/shared/utils/contact'
import { IKeyboardKey } from '@/shared/utils/keyboard'
import { safeInject } from '@/shared/utils/safeInject'

import GenericTable from '../../table/GenericTable.vue'



type SelectModel = 'contacts' | 'conferences'

const props = defineProps<{
  title: string,
  contactsPServed: PServed[],
  isOnce?: boolean, // Требуется для добавления только одного контакта.
  disableExternal?: boolean
  description?: string,
  availableModels?: SelectModel[],
  groupGuid?: string
}>()

const { conferences } = useConferenceState()
const { fetchContactsBySomeIds } = useContactCachedStore()
const { createClientContact } = useContactApi()
const { t } = useLocalization()

const closeModal = safeInject(closeDialogKey)

const close = (value?: Contact[] | ConferenceDto[]) => {
  closeModal(value)
}

const contactStore = useContactStore()
const { externalContactsFromIndexedDb } = storeToRefs(contactStore)
void contactStore.fetchExternalContactsFromIndexedDb()

const FETCH_SIZE_DEFAULT = 14
const PER_PAGE_VARIANTS = [FETCH_SIZE_DEFAULT, FETCH_SIZE_DEFAULT * 2, FETCH_SIZE_DEFAULT * 4, FETCH_SIZE_DEFAULT * 8]
const searchModel = ref('')
const { list: arrayContacts, fetchContacts, paginationModel } = useContactFiltering(searchModel, FETCH_SIZE_DEFAULT)

const availableModels = computed<SelectModel[]>(() => props.availableModels?.length ? props.availableModels : ['contacts', 'conferences'])
const selectModel = ref<SelectModel>(availableModels.value[0])

const model = ref<Contact[] | ConferenceDto[]>([])
const selectionMode = computed(() => props.isOnce ? 'single' : 'multiple')


const createdExternalContacts = ref<Contact[]>([])
const externalContactCreating = ref(false)


onMounted(async () => {
  const loadedContacts = await fetchContactsBySomeIds(props.contactsPServed) ?? []
  model.value = loadedContacts
  fetchContacts({ Page: 1, Size: FETCH_SIZE_DEFAULT, SearchText: searchModel.value })
})

const filteredContacts = computed(() => {
  if (searchModel.value.length < 2) {
    return arrayContacts.value
  }
  return [
    ...arrayContacts.value,
    ...createdExternalContacts.value,
    ...externalContactsFromIndexedDb.value.values(),
  ].filter((contact: Contact) => {
    return contact.name.toLowerCase().includes(searchModel.value.toLowerCase())
        || (contact.internalNumber || '').toLowerCase().includes(searchModel.value.toLowerCase())
  })
})

const filteredConferences = computed(() => {
  if (searchModel.value.length < 2) {
    return conferences.value as ConferenceDto[]
  }
  return conferences.value.filter(conf => conf.name.toLowerCase().includes(searchModel.value.toLowerCase())) as ConferenceDto[]
})

const hasVisibleItems = computed(() => selectModel.value === 'contacts'
  ? filteredContacts.value.length > 0
  : filteredConferences.value.length > 0)

const numberRegEx = /^\d{4,16}$/ // mobile - /^(89|\+79|9)\d{9}$/
const validExternalNumber = computed(() => {
  return numberRegEx.test(searchModel.value.replace(/\D/g, ''))
})

const mapClientContactToContact = (contact: ClientApplicationContactDto, groupGuid?: string): Contact => {
  const internalNumber = contact.number || ''
  const guid = contact.guid || internalNumber
  const pServed = contact.imLogin || contactNumberToPServed(internalNumber)

  return {
    id: guid,
    guid,
    name: contact.name || internalNumber,
    pServed,
    internalNumber,
    groupIds: groupGuid ? [groupGuid] : [],
    organization: '',
    organizationalUnit: '',
    imLogin: contact.imLogin || '',
    email: contact.email || '',
    terminalLogin: '',
    terminalPassword: '',
    isExternal: true,
    groups: [],
  }
}

const addAsExternal = async () => {
  const number = searchModel.value.replace(/\D/g, '')

  try {
    externalContactCreating.value = true
    const extContact = props.groupGuid
      ? mapClientContactToContact((await createClientContact({
        groupGuid: props.groupGuid,
        name: number,
        number,
        email: '',
      })).data, props.groupGuid)
      : createExternalContact(number)

    selectModel.value = 'contacts'
    createdExternalContacts.value.push(extContact)
    ;(model.value as Contact[]).push(extContact)
    searchModel.value = number // обновляем, чтобы в таблице появился номер по фильтру
  } catch (e) {
    console.error('Create external contact failed:', e)
  } finally {
    externalContactCreating.value = false
  }
}

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }) => {
  if (param.letter) {
    searchModel.value += param.letter
  }
  if (param.key.event === 'backspace') {
    searchModel.value = param.key.handler && param.key.handler(searchModel.value) || ''
  }
  if (param.key.event === 'submitForm') {
    close(model.value)
  }
}

if (props.isOnce) { // Если требуется для добавления только одного контакта.
  watch(() => model.value.length, (length) => {
    if (length > 1) {
      model.value = model.value.slice(-1)
    }
  })
  watch(() => selectModel.value, () => {
    model.value = []
  })
}
</script>
