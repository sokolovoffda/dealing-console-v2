<template>
  <section v-click-outside="close" class="w-9/12 h-10/12 text-white flex flex-col justify-between">
    <header class="bg-black-735 rounded-t-8 h-12 px-4 py-3 text-1624">{{ t('SearchForSubscriber') }}</header>
    <main class="bg-black-800 border-b border-black-700">
      <div class="overflow-y-auto h-80 mr-1 mb-1">
        <template v-if="filteredContacts.length">
          <div class="grid grid-cols-5 bg-black-665 py-2 items-center px-8 text-1324">
            <p v-for="title in headers" :key="title">{{ title }}</p>
          </div>
          <div class="h-[644px] overflow-y-auto">
            <template
              v-for="c in filteredContacts"
              :key="c.id"
            >
              <div
                data-test="binding-contact-row"
                class="grid grid-cols-5 px-8 py-2 items-center grid-rows-auto text-1324 hover:bg-primary-tints-600 hover:text-black cursor-pointer border-b border-b-black-600"
                :class="{'bg-primary-tints-600': c.id === contactModel?.id}"
                @click="selectContact(c)"
              >
                <p class="flex items-center gap-x-4">{{ c.name }}</p>
                <p>{{ c.internalNumber }}</p>
                <p>{{ c.organization }}</p>
                <p>{{ c.organizationalUnit }}</p>
                <p>{{ getGroups(c.groups) }}</p>
              </div>
            </template>
          </div>
        </template>
        <div v-else class=" flex flex-col justify-center items-center gap-y-6 align-middle h-full">
          <div class="text-center ">
            <wui-icon name="unknown" class="!w-[64px] !h-[64px] pb-2 text-black-600" />
            <p class="text-1416">{{ $t('SubscribersNotFound') }}</p>
          </div>
          <wui-btn
            v-if="validExternalNumber"
            class="!bg-black-735 hover:!bg-black-700 !text-black-135"
            @click="addAsExternal"
          >
            {{ $t('AddExternalContact') }}
          </wui-btn>
        </div>
        <div 
          class="flex justify-center py-4"
        >
          <wui-paginator 
            v-model="paginationModel"
            :variants="PER_PAGE_VARIANTS"
          />
        </div>
      </div>
    </main>
    <footer class="bg-black-800 rounded-b-8 flex flex-col justify-center gap-y-2 pb-4">
      <div class="p-4 border-b border-black-735">
        <wui-input
          v-model="text"
          :placeholder="t('Search')"
          prepend-icon="search"
          with-clear rounded
          class="app-input"
        />
      </div>
      <keyboard-pad @on-key-tap="onKeyTap" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { closeDialogKey, ClickOutside as vClickOutside, WuiBtn, WuiIcon, WuiInput, WuiPaginator } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref, onMounted } from 'vue'

import { KeyboardPad } from '@/features/keyboard-pad'

import { useContactFiltering, Contact, GroupDto, useContactStore } from '@/entities/contact'

import { useLocalization } from '@/shared/i18n'
import { createExternalContact } from '@/shared/utils/contact'
import { IKeyboardKey } from '@/shared/utils/keyboard'
import { safeInject } from '@/shared/utils/safeInject'


const props = defineProps<{
  contact: Contact | null
}>()
const { t } = useLocalization()

const closeModal = safeInject(closeDialogKey)

const text = ref('')
const FETCH_SIZE_DEFAULT = 14
const PER_PAGE_VARIANTS = [FETCH_SIZE_DEFAULT, FETCH_SIZE_DEFAULT * 2, FETCH_SIZE_DEFAULT * 4, FETCH_SIZE_DEFAULT * 8]
const { list: arrayContacts, fetchContacts, paginationModel } = useContactFiltering(text, FETCH_SIZE_DEFAULT)

const contactStore = useContactStore()
const { externalContactsFromIndexedDb } = storeToRefs(contactStore)
void contactStore.fetchExternalContactsFromIndexedDb()

const filteredContacts = computed(() => {
  if (text.value.length < 2) {
    return arrayContacts.value
  }
  return [
    ...arrayContacts.value,
    ...externalContactsFromIndexedDb.value.values(),
  ].filter((contact: Contact) =>
    contact.name.toLowerCase().includes(text.value.toLowerCase())
      || contact.internalNumber.toLowerCase().includes(text.value.toLowerCase()),
  )
})

const numberRegEx = /^\d{4,16}$/
const validExternalNumber = computed(() => {
  return numberRegEx.test(text.value.replace(/\D/g, ''))
})

const contactModel = ref<Contact | null>(props.contact)

const getGroups = computed(() => (groups: GroupDto[]) => groups.reduce((acc, group: GroupDto, index) => {
  if (index === groups.length - 1) {
    acc += group.name
  } else {
    acc += group.name + ', '
  }
  return acc
}, ''))

const headers = computed(() => [t('FullName'), t('Number'), t('Department'), t('JobTitle'), t('Group')])

const selectContact = (c: Contact) => {
  if (contactModel.value?.id === c.id) {
    contactModel.value = null
  } else {
    contactModel.value = c
  }
}

const addAsExternal = () => {
  const number = text.value.replace(/\D/g, '')
  const extContact = createExternalContact(number)
  contactModel.value = extContact
  text.value = number
}

const close = () => {
  closeModal(contactModel.value)
}

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }) => {
  if (param.letter) {
    text.value += param.letter
  }
  if (param.key.event === 'backspace') {
    text.value = param.key.handler && param.key.handler(text.value) || ''
  }
  if (param.key.event === 'submitForm') {
    close()
  }
}

onMounted(() => {
  fetchContacts({ Page: 1, Size: FETCH_SIZE_DEFAULT, SearchText: text.value })
})
</script>
