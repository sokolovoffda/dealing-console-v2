<template>
  <tr class="table__row default-rule">
    <td class="table__cell text-center w-10">{{ index }}</td>
    <td class="table__cell w-30">
      <wui-select v-model="bindingTypeModel" class="app-select" :items="bindingTypeItems" />
    </td>
    <td v-if="isStandardBinding" class="table__cell w-60">
      <div class="bg-black-865 p-2 rounded-4 cursor-pointer h-[38px] flex items-center justify-between" @click="openModal">
        <p>{{ contact?.name ?? $t('NoBinding') }}</p>
        <wui-btn
          v-if="contact"
          icon
          rounded
          small
          text
          prepend-icon="clear"
          @click.stop="clearContact"
        />
      </div>
    </td>
    <td v-else class="table__cell w-60">
      <wui-select v-model="groupModel" class="app-select" :items="groupItems" />
    </td>
  </tr>
</template>

<script setup lang="ts">
import { useDialog, WuiBtn, WuiSelect } from '@wui/common-library'
import { PServed } from '@wui/im'
import { storeToRefs } from 'pinia'
import { ComponentOptions, computed, ref, watch } from 'vue'

import {
  bindingControllerButtonTypes,
  BindingControllerButtonType,
  useBindingControllerButtonsStore,
} from '@/entities/binding-contacts'
import { Contact, resolveBindingContactByPServed } from '@/entities/contact'
import { useGroupContactsStore } from '@/entities/group-contacts'

import { useAppStore } from '@/shared/composables'
import { useLocalization } from '@/shared/i18n'
import { ChangeContactsModal } from '@/shared/ui'

const props = defineProps<{
  index: number
  pServed: PServed | null
  buttonKey: string
  bindingType: BindingControllerButtonType
  groupIndex: number | null
}>()

const { showDialog } = useDialog<Contact[] | undefined>()
const {
  hasPinnedGroupBinding,
  save,
  setBindingType,
  setContact,
  setPinnedGroup,
} = useBindingControllerButtonsStore()
const { groupContacts } = storeToRefs(useGroupContactsStore())
const { t } = useLocalization()
const appStore = useAppStore()

const contact = ref<Contact | null>(null)
const resolveCurrentContact = async (pServed: PServed | null) => {
  if (!pServed) {
    contact.value = null
    return
  }

  contact.value = await resolveBindingContactByPServed(pServed)
}

watch(() => props.pServed, async (newPServed) => {
  await resolveCurrentContact(newPServed)
}, { immediate: true })

watch(() => appStore.onIMReady, async (isReady, wasReady) => {
  if (!props.pServed || wasReady || !isReady) {
    return
  }

  await resolveCurrentContact(props.pServed)
})

const isStandardBinding = computed(() => props.bindingType === bindingControllerButtonTypes.STANDARD)

const bindingTypeItems = computed(() => [
  {
    value: bindingControllerButtonTypes.STANDARD,
    label: t('PushToTalkScopeStandard'),
  },
  {
    value: bindingControllerButtonTypes.PINNED_GROUP,
    label: t('PinnedGroup'),
  },
])

const bindingTypeModel = computed<BindingControllerButtonType>({
  get: () => props.bindingType,
  set: (value) => {
    if (setBindingType(props.buttonKey, value)) {
      void save()
    }
  },
})

const groupItems = computed(() => {
  const items: Array<{ value: string, label: string, disabled?: boolean }> = [{
    value: '',
    label: `- ${t('NoBinding')} -`,
  }]

  Array.from(groupContacts.value.keys())
    .sort((a, b) => a - b)
    .forEach((groupIndex) => {
      items.push({
        value: String(groupIndex),
        label: `${t('Group')} ${groupIndex + 1}`,
        disabled: hasPinnedGroupBinding(groupIndex, props.buttonKey),
      })
    })

  return items
})

const groupModel = computed<string>({
  get: () => props.groupIndex?.toString() ?? '',
  set: (value) => {
    if (value !== '') {
      if (setPinnedGroup(props.buttonKey, Number(value))) {
        void save()
      }
      return
    }

    if (setPinnedGroup(props.buttonKey, null)) {
      void save()
    }
  },
})


const clearContact = () => {
  if (setContact(props.buttonKey, null)) {
    void save()
  }
}

const openModal = async () => {
  if (!isStandardBinding.value) {
    return
  }

  const newContacts = await showDialog(ChangeContactsModal as ComponentOptions, {
    hasOverlay: true,
    title: t('SearchForSubscriber'),
    contactsPServed: contact.value?.pServed ? [contact.value.pServed] : [],
    isOnce: true,
    availableModels: ['contacts'],
  })
  const newContact = newContacts?.at(0)

  if (newContact?.pServed) {
    const isSaved = setContact(
      props.buttonKey,
      newContact.pServed,
    )
    if (isSaved) {
      void save()
    }
  }
}
</script>

<style scoped>
.w-10 {
  width: 10%;
}
.w-30 {
  width: 30%;
}
.w-60 {
  width: 60%;
}
</style>
