<template>
  <section
    class="activity-monitor-queue-card flex shrink-0 cursor-pointer flex-col items-center gap-3.5 overflow-hidden rounded-14 px-6 py-4 transition-colors"
    :class="tone.root"
    :data-session-id="session.sessionId"
    :data-session-state="session.sessionState.value"
    :data-device-side="deviceSide || undefined"
    :data-device-kind="deviceKind || undefined"
    :data-pinned-session="isPinnedSession || undefined"
    data-test="activity-monitor-queue-card"
    tabindex="0"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
  >
    <div class="flex h-18 w-18 shrink-0 items-center justify-center">
      <wui-icon
        :name="tone.iconName"
        :class="tone.iconClass"
        class="h-18! w-18! [&_svg]:h-full! [&_svg]:w-full!"
        data-test="activity-monitor-queue-card-icon"
      />
    </div>

    <div class="flex min-w-0 flex-col items-center gap-2 text-center">
      <p
        class="max-w-full truncate text-2xl font-medium leading-8 tracking-[0.02em]"
        :class="tone.name"
        data-test="activity-monitor-queue-card-name"
      >
        {{ displayName }}
      </p>
      <p
        class="max-w-full truncate text-xl font-medium leading-7 tracking-[0.02em]"
        :class="tone.number"
        data-test="activity-monitor-queue-card-number"
      >
        {{ displayNumber }}
      </p>
      <p
        class="max-w-full truncate text-lg font-normal leading-6.5"
        :class="tone.duration"
        data-test="activity-monitor-queue-card-duration"
      >
        {{ duration }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { toRef } from 'vue'

import type { RTCSessionFacade } from '@/entities/call-session'

import { useActivityMonitorQueueCard } from '../model/use-activity-monitor-queue-card'

const props = defineProps<{
  session: RTCSessionFacade
}>()

const emit = defineEmits<{
  select: []
}>()

const {
  displayName,
  displayNumber,
  duration,
  tone,
  deviceSide,
  deviceKind,
  isPinnedSession,
} = useActivityMonitorQueueCard(toRef(props, 'session'))
</script>

<style scoped>
.activity-monitor-queue-card {
  width: 308px;
  min-height: 220px;
}
</style>
