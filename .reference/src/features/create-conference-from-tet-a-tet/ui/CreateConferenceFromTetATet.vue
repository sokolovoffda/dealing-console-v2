<template>
  <slot
    :loading="loading"
    :creating="creating"
    :disabled="!contacts.size"
    :create="create"
  />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useReferCallState } from '@/features/refer-call'

import { type SessionMediaDevice } from '@/entities/call-session'
import { useConferenceDraft } from '@/entities/conference'
import { Contact } from '@/entities/contact'

import { useCreateConferenceFromTetATet } from '../model'

const props = defineProps<{
  callId: string
  device: SessionMediaDevice | null
  initialContact?: Contact
}>()

const { creating, startCreating, contacts, create: createGroupCallFromTetATet, loading, setContact } = useCreateConferenceFromTetATet()
const { finishProcess: stopRefer } = useReferCallState()
const { cancelConferenceDraft } = useConferenceDraft()
const router = useRouter()


const create = () => {
  // Очищаем состояния, если вдруг они были
  cancelConferenceDraft()
  stopRefer()

  // Если в данный момент не открыта страница контактов переходим на эту страницу
  if (router.currentRoute.value.name !== 'Contacts') {
    router.push({ name: 'Contacts' })
  }
  // Открываем tab с контактами


  if (!creating.value) {
    startCreating()
  } else {
    if (props.initialContact) {
      setContact(props.initialContact)
    }
    createGroupCallFromTetATet(props.callId, props.device)
  }
}
</script>
