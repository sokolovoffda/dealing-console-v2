<template>
  <div class="overflow-hidden flex flex-row h-[64px]">
    <wui-btn
      icon
      prepend-icon="addCircleOutlined"
      class="w-full !text-black-700 !bg-black-800 hover:!bg-black-900 !border-black-700"
      large
      data-test="add-btn"
      @click="onClick()"
    />
  </div>
</template>

<script setup lang="ts">
import { useDialog, WuiBtn } from '@wui/common-library'
import { ComponentOptions } from 'vue'

import { useCallManagerState } from '@/widgets/call-manager'

import { usePinnedCallsStore } from '@/entities/call-session'
import { ConferenceDto } from '@/entities/conference'
import { Contact, useContactCachedStore } from '@/entities/contact'

import { ChangeContactsModal } from '@/shared/ui'

const props = defineProps<{
  order: number
}>()

const { addByDto, addByPServed } = usePinnedCallsStore()
const { setContactIfDoesNotExists } = useContactCachedStore()
const { showDialog } = useDialog<Contact[] | undefined>()

const { selected: contact, selectedSession } = useCallManagerState()

const cacheContactIfNeeded = (item: Contact | ConferenceDto) => {
  if ('groupIds' in item) {
    setContactIfDoesNotExists(item)
  }
}

const onClick = async () => {
  if (!contact.value) {
    void addViaDialog()
    return
  }
  cacheContactIfNeeded(contact.value as Contact | ConferenceDto)
  if (selectedSession.value?.sessionId) {
    addByPServed(contact.value.pServed, props.order, selectedSession.value.sessionId)
    return
  }
  addByDto(contact.value as Contact | ConferenceDto, props.order)
}

const addViaDialog = async () => {
  const contacts = await showDialog(ChangeContactsModal as ComponentOptions, {
    title: 'Добавить контакт',
    contactsPServed: [],
    isOnce: true,
    hasOverlay: false,
  })
  if (!contacts) return
  const contact = contacts.at(0)
  if (!contact) return
  cacheContactIfNeeded(contact)
  addByDto(contact, props.order)
}
</script>
