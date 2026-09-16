<template>
  <section class="flex shrink-0 flex-col text-title-txt-def">
    <widget-header
      icon="userTwoM"
      icon-class="text-title-activity-monitor-icon-def"
      title="Очередь вызовов"
      class="shrink-0"
    />

    <empty-setup-prompt
      v-if="isQueueEmpty"
      :interactive="false"
      icon="userTwoM"
      label="Очередь пуста"
      class="min-h-55"
      data-test="activity-monitor-queue-empty-state"
    />

    <transition-group
      v-else
      name="am-queue-card"
      tag="ul"
      class="flex gap-2 overflow-x-auto pb-1"
      data-test="activity-monitor-queue-strip"
    >
      <li
        v-for="session in queueSessions"
        :key="session.sessionId"
        class="am-queue-card-item shrink-0"
      >
        <activity-monitor-queue-card
          :session="session"
          @select="handleQueueCardSelect(session)"
        />
      </li>
    </transition-group>
  </section>
</template>

<script setup lang="ts">
import { useCallCardStore } from '@/features/call-card'

import type { RTCSessionFacade } from '@/entities/call-session'
import { usePinnedCallsPanelStore } from '@/entities/pinned-calls'

import { EmptySetupPrompt, WidgetHeader } from '@/shared/ui'

import { useActivityMonitorQueueSessions } from '../model'

import ActivityMonitorQueueCard from './ActivityMonitorQueueCard.vue'

const callCardStore = useCallCardStore()
const pinnedCallsPanelStore = usePinnedCallsPanelStore()
const { queueSessions, isQueueEmpty } = useActivityMonitorQueueSessions()

const handleQueueCardSelect = (session: RTCSessionFacade) => {
  if (pinnedCallsPanelStore.isPinnedPanelSessionId(session.sessionId)) {
    callCardStore.openPinnedPanelSession(session.sessionId)
    return
  }

  callCardStore.openSessionInPreferredHandset(session.sessionId)
}
</script>

<style scoped>
.am-queue-card-enter-active,
.am-queue-card-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.am-queue-card-enter-from,
.am-queue-card-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.am-queue-card-move {
  transition: transform 0.2s ease;
}
</style>
