<template>
  <ul
    v-if="memberRows.length"
    class="min-h-0 flex-1 overflow-y-auto p-2"
    data-test="broadcast-group-members"
  >
    <li
      v-for="row in memberRows"
      :key="row.key"
      class="mb-1 flex h-11 min-w-0 items-center rounded-[11px] pr-2 pl-4"
      data-test="broadcast-group-member-row"
      :class="row.hasVoiceActivity
        ? 'border border-broadcast-brd-act bg-broadcast-bg-act'
        : 'border border-transparent'"
      :data-active="row.isSessionActive ? 'true' : 'false'"
      :data-voice="row.hasVoiceActivity ? 'true' : 'false'"
    >
      <span
        class="min-w-0 flex-1 truncate text-[18px] leading-6.5"
        :class="row.isSessionActive
          ? 'text-broadcast-user-txt-def'
          : 'text-broadcast-user-txt-act'"
      >
        {{ row.title }}
      </span>

      <div class="flex size-8 shrink-0 items-center justify-center">
        <wui-icon
          v-if="row.hasVoiceActivity"
          :size="32"
          name="userWaveM"
          class="text-broadcast-icon-def"
          data-test="broadcast-group-member-voice"
        />

        <my-btn
          v-else-if="isEditMode && !disabled"
          icon
          text
          tone="alpha"
          prepend-icon="trashM"
          :size="32"
          class="shrink-0 text-pinnedline-btn-negcon-icon-def!"
          data-test="broadcast-group-member-remove"
          @click.stop="emit('removeMember', row.member)"
        />
      </div>
    </li>
  </ul>
  <div
    v-else
    class="min-h-0 flex-1"
  />
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import {
  getPinnedCallGroupMemberKey,
  getPinnedCallPServedKey,
  usePinnedCallsPanelStore,
  type PinnedCallGroupMember,
} from '@/entities/pinned-calls'

import { MyBtn } from '@/shared/ui'

import { isBroadcastMemberSessionActive } from '../model/broadcast-group-card-view'

const props = defineProps<{
  members: PinnedCallGroupMember[]
  isEditMode: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  removeMember: [member: PinnedCallGroupMember]
}>()

const store = usePinnedCallsPanelStore()
const { slots, slotSessionIds } = storeToRefs(store)

const resolveTitle = (member: PinnedCallGroupMember, title?: string) => {
  if (!title) return getPinnedCallPServedKey(member.pServed)
  if (/sip:/i.test(title)) return getPinnedCallPServedKey(title)

  return title
}

const memberRows = computed(() => {
  void slots.value
  void slotSessionIds.value

  return props.members.map((member) => {
    const key = getPinnedCallGroupMemberKey(member)
    const slot = store.getSlotByGroupMember(member)
    const session = slot ? store.getSessionForSlot(slot) : undefined
    void session?.sessionState.value
    void session?.remoteVoiceDetected.value

    return {
      key,
      title: resolveTitle(member, slot?.title),
      member,
      isSessionActive: isBroadcastMemberSessionActive(session),
      hasVoiceActivity: Boolean(session?.remoteVoiceDetected.value),
    }
  })
})
</script>
