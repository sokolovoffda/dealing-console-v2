<template>
  <turret-call-card
    v-bind="cardProps"
    @answer="onAnswer"
    @hangup="onHangup"
    @hold="onHold"
    @unhold="onUnhold"
    @open-dialpad="onOpenDialpad"
    @open-queue="onOpenQueue"
    @open-history="onOpenHistory"
    @close-panel="onClosePanel"
    @select-queue-prev="onSelectQueuePrev"
    @select-queue-next="onSelectQueueNext"
    @select-queue-item="onSelectQueueItem"
    @dial-change="onDialChange"
    @dial-call="onDialCall"
    @dtmf="onDtmf"
    @history-select="onHistorySelect"
    @mute-toggle="onMuteToggle"
    @volume-change="onVolumeChange"
    @transfer-blind="onTransferBlind"
    @transfer-consult="onTransferConsult"
    @transfer-merge="onTransferMerge"
    @transfer-cancel="onTransferCancel"
    @transfer-toggle="onTransferToggle"
    @pin="onPin"
    @handset-swap="onHandsetSwap"
  />
</template>

<script setup lang="ts">
import { TurretCallCard } from '@rtu-turret-system/turret-lib'

import { useTurretCallCardAdapter } from '../model/use-turret-call-card-adapter'

const {
  cardProps,
  onAnswer,
  onHangup,
  onHold,
  onUnhold,
  onOpenDialpad,
  onOpenQueue,
  onOpenHistory,
  onClosePanel,
  onSelectQueuePrev,
  onSelectQueueNext,
  onSelectQueueItem,
  onDialChange,
  onDialCall,
  onDtmf,
  onHistorySelect,
  onMuteToggle,
  onVolumeChange,
  onTransferBlind,
  onTransferConsult,
  onTransferMerge,
  onTransferCancel,
  onTransferToggle,
  onPin,
  onHandsetSwap,
} = useTurretCallCardAdapter()
</script>
