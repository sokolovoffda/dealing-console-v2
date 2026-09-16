<template>
  <article
    class="broadcast-group-card flex h-full min-h-0 w-full flex-col gap-px"
    :class="{
      'pointer-events-none opacity-40': disabled,
      'cursor-pointer': isEditMode && !disabled,
    }"
    :data-group-index="cell.index"
    :data-disabled="disabled ? 'true' : 'false'"
    :data-footer-state="footerVisualState"
    data-test="broadcast-group-card"
    @click="isEditMode && !disabled && emit('cellClick', $event)"
  >
    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-12 border border-broadcast-brd-def bg-broadcast-bg-def"
      data-test="broadcast-group-card-body"
    >
      <header class="shrink-0 border-b border-broadcast-brd-def bg-broadcast-neutcon-bg-def px-6 py-4 text-[24px] leading-7.5 text-broadcast-txt-def">
        Группа №{{ displayNumber }}
      </header>

      <broadcast-group-members
        :members="members"
        :is-edit-mode="isEditMode"
        :disabled="disabled"
        @remove-member="emit('removeMember', $event)"
      />
    </div>

    <broadcast-group-card-footer
      :visual-state="footerVisualState"
      :is-mic-on="isMicOn"
      :volume-percent="volumePercent"
      :voice-activity-percent="voiceActivityPercent"
      :show-vad-track="hasActiveSession"
      :disabled="isFooterDisabled"
      @mic-click="emit('micClick')"
      @speaker-click="emit('speakerClick')"
      @volume-change="emit('volumeChange', $event)"
    />
  </article>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import {
  usePinnedCallsPanelStore,
  type PinnedCallGroupCell,
  type PinnedCallGroupMember,
} from '@/entities/pinned-calls'

import {
  isBroadcastMemberSessionActive,
  resolveBroadcastGroupFooterVisualState,
  resolveBroadcastGroupMicState,
  resolveBroadcastGroupVoiceActivityPercent,
  resolveBroadcastGroupVolumePercent,
} from '../model/broadcast-group-card-view'

import BroadcastGroupCardFooter from './BroadcastGroupCardFooter.vue'
import BroadcastGroupMembers from './BroadcastGroupMembers.vue'

const props = defineProps<{
  cell: PinnedCallGroupCell
  displayNumber: number
  isEditMode: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  cellClick: [event: MouseEvent]
  removeMember: [member: PinnedCallGroupMember]
  micClick: []
  speakerClick: []
  volumeChange: [volumePercent: number]
}>()

const store = usePinnedCallsPanelStore()
const { slotSessionIds, groupPlaybackVolumeByIndex } = storeToRefs(store)

const members = computed(() => props.cell.group?.members ?? [])

const memberSlots = computed(() => {
  void slotSessionIds.value

  return store.getGroupSlots(props.cell.index)
})

const voiceMembers = computed(() => {
  void slotSessionIds.value

  return memberSlots.value.map((slot) => {
    const session = store.getSessionForSlot(slot)
    void session?.remoteVoiceDetected.value
    void session?.remoteVoiceLevel.value

    return {
      hasVoice: Boolean(session?.remoteVoiceDetected.value),
      voiceLevel: session?.remoteVoiceLevel.value ?? 0,
    }
  })
})

const hasActiveSession = computed(() => {
  void slotSessionIds.value

  return memberSlots.value.some((slot) => {
    const session = store.getSessionForSlot(slot)
    void session?.sessionState.value

    return isBroadcastMemberSessionActive(session)
  })
})

const isMicOn = computed(() => resolveBroadcastGroupMicState(props.cell.group))

const volumePercent = computed(() => {
  void groupPlaybackVolumeByIndex.value

  return resolveBroadcastGroupVolumePercent(
    props.cell.group,
    store.getGroupPlaybackVolume(props.cell.index),
  )
})

const voiceActivityPercent = computed(() => {
  return resolveBroadcastGroupVoiceActivityPercent(voiceMembers.value)
})

/** Edit / нет активности / cell disabled → футер как п.1, без кликов. */
const isFooterDisabled = computed(() => {
  return props.isEditMode || props.disabled || !hasActiveSession.value
})

const footerVisualState = computed(() => {
  return resolveBroadcastGroupFooterVisualState({
    forceDisabled: props.isEditMode || props.disabled,
    hasActiveSession: hasActiveSession.value,
    isMicOn: isMicOn.value,
    volumePercent: volumePercent.value,
  })
})
</script>
