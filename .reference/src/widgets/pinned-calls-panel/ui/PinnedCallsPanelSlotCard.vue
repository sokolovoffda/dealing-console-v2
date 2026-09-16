<template>
  <my-btn
    v-if="!cell.slot && isEditMode"
    icon
    tone="alpha"
    prepend-icon="plusAddM"
    :size="72"
    class="h-full min-h-26.5 w-full border border-card-add-brd-base-def! rounded-12!"
    :class="isMoveMode ? 'opacity-80' : undefined"
    @click="emit('select', $event)"
  />

  <div
    v-else-if="cell.slot"
    class="pinned-slot-card flex h-full min-h-26.5 w-full gap-px rounded-12 border"
    :class="[
      visualModifier,
      `pinned-slot-card--index-${slotIndexTone}`,
      {
        'pinned-slot-card--selected': isActiveSlot,
        'border-tab-neutcon-icon-active-def': isActiveSlot,
        'border-transparent': !isActiveSlot,
        'opacity-50': isMovingSource,
        'cursor-pointer': isEditMode || isMoveMode,
      },
    ]"
    @click="handleCardClick"
  >
    <div
      class="pinned-slot-card__side pinned-slot-card__side--start pinned-slot-card__mic flex shrink-0 items-center justify-center"
      :class="{ 'pointer-events-none': isMicInteractionBlocked }"
    >
      <my-btn
        icon
        mode="toggle"
        tone="alpha"
        :size="72"
        :active="isMicOn"
        :disabled="isMicDisabled"
        :prepend-icon="micIcon"
        class="h-full! min-h-0! w-26.5 rounded-none! bg-transparent!"
        data-test="pinned-slot-mic"
        @click.stop="emit('micClick', cell.order)"
      />
    </div>

    <div
      class="pinned-slot-card__mid flex min-w-0 flex-1 items-center gap-3 px-3"
      :class="midSectionClass"
      data-test="pinned-slot-center"
      @click.stop="handleCenterClick"
    >
      <div class="min-w-0 flex-1">
        <div class="flex items-start gap-2">
          <p class="pinned-slot-card__num min-w-0 flex-1 truncate text-[28px] leading-9">
            {{ displayNumber }}
          </p>
          <span
            v-if="showSlotIndex"
            class="pinned-slot-card__slot-index shrink-0"
            data-test="pinned-slot-index"
          >
            {{ slotIndex }}
          </span>
        </div>
        <p class="pinned-slot-card__name truncate text-xl leading-7">
          {{ displayTitle }}
        </p>
      </div>

      <div
        class="pinned-slot-card__volume flex h-21 w-30 shrink-0 items-center"
        data-test="pinned-slot-volume"
        @click.stop
      >
        <!--
          TODO: WuiInputRange кидает class/style на <input>, не на корень.
          Токены/размеры — на wrapper → :deep(.wui-input-range), как в BroadcastGroupCardFooter.
        -->
        <div
          class="pinned-slot-card__volume-range"
          :class="{ 'pinned-slot-card__volume-range--vad-track': showVadTrack }"
          :style="vadStyle"
          :data-voice="hasVoiceActivity ? 'true' : 'false'"
        >
          <wui-input-range
            v-model="volumePercent"
            orientation="horizontal"
            :min="0"
            :max="100"
            :step="1"
            :size="72"
          />
        </div>
      </div>
    </div>

    <div
      class="pinned-slot-card__side pinned-slot-card__side--end pinned-slot-card__status flex shrink-0 items-center justify-center"
    >
      <my-btn
        icon
        tone="alpha"
        :mode="isStatusMuteToggle ? 'toggle' : 'button'"
        :size="72"
        :active="isStatusMuteToggle && !isLineAudible"
        :prepend-icon="statusIcon"
        class="h-full! min-h-0! w-26.5 rounded-none! bg-transparent!"
        data-test="pinned-slot-status"
        @click.stop="emit('statusClick', cell.order)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { WuiInputRange } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import {
  getPinnedCallPServedKey,
  usePinnedCallsPanelStore,
  type PinnedCallGridCell,
  type PinnedCallSlotOrder,
} from '@/entities/pinned-calls'

import { MyBtn } from '@/shared/ui'

import {
  getPinnedCallStatusIcon,
  isPinnedCallMicInteractionDisabled,
  isPinnedCallMidDisabled,
  isPinnedSlotVadTrackVisible,
  PINNED_CALL_SLOT_VIEW_STATE,
  resolvePinnedSlotCardVisualModifier,
  resolvePinnedSlotCardVisualState,
  resolvePinnedSlotIndexTone,
  resolvePinnedSlotMicIcon,
  resolvePinnedSlotViewState,
  resolvePinnedSlotVoiceActivityPercent,
  shouldShowPinnedSlotIndex,
} from '../model'

const props = withDefaults(defineProps<{
  cell: PinnedCallGridCell
  isEditMode: boolean
  isMoveMode?: boolean
  isMovingSource?: boolean
}>(), {
  isMoveMode: false,
  isMovingSource: false,
})

const emit = defineEmits<{
  select: [event: MouseEvent]
  centerClick: [order: PinnedCallSlotOrder, event: MouseEvent]
  micClick: [order: PinnedCallSlotOrder]
  statusClick: [order: PinnedCallSlotOrder]
  volumeChange: [order: PinnedCallSlotOrder, volume: number]
}>()

const pinnedCallsPanelStore = usePinnedCallsPanelStore()
const { activeSlotOrder, slotSessionIds, slots } = storeToRefs(pinnedCallsPanelStore)

const viewSession = computed(() => {
  void slotSessionIds.value
  const slot = props.cell.slot
  if (!slot) return null

  const session = pinnedCallsPanelStore.getSessionForSlot(slot)
  void session?.sessionState.value
  void session?.remoteVoiceDetected.value
  void session?.remoteVoiceLevel.value

  return session ?? null
})

const viewState = computed(() => resolvePinnedSlotViewState(viewSession.value))

const showVadTrack = computed(() => isPinnedSlotVadTrackVisible(viewState.value))

const voiceActivityPercent = computed(() => {
  const session = viewSession.value

  return resolvePinnedSlotVoiceActivityPercent({
    hasVoice: Boolean(session?.remoteVoiceDetected.value),
    voiceLevel: session?.remoteVoiceLevel.value ?? 0,
  })
})

const hasVoiceActivity = computed(() => voiceActivityPercent.value > 0)

const vadStyle = computed(() => ({
  '--slot-vad-percent': String(voiceActivityPercent.value),
}))

/** Выделение только при живой сессии (active/hold) на этом слоте — без сессии isActive нет. */
const isActiveSlot = computed(() => {
  if (!props.cell.slot) return false
  if (activeSlotOrder.value !== props.cell.order) return false

  return viewState.value === PINNED_CALL_SLOT_VIEW_STATE.active
    || viewState.value === PINNED_CALL_SLOT_VIEW_STATE.hold
})

const isMicOn = computed(() => Boolean(props.cell.slot?.micState))

const micIcon = computed(() => resolvePinnedSlotMicIcon(isMicOn.value))

const visualState = computed(() => resolvePinnedSlotCardVisualState({
  viewState: viewState.value,
  isMicOn: isMicOn.value,
  volumePercent: Math.round((props.cell.slot?.volume ?? 0) * 100),
}))

const visualModifier = computed(() => resolvePinnedSlotCardVisualModifier(visualState.value))

const slotIndexTone = computed(() => resolvePinnedSlotIndexTone(visualState.value))

const slotIndex = computed(() => props.cell.slot?.slotIndex ?? 1)

const showSlotIndex = computed(() => {
  void slots.value
  const slot = props.cell.slot
  if (!slot) return false

  return shouldShowPinnedSlotIndex(
    pinnedCallsPanelStore.getSlotsByPServed(slot.pServed).length,
  )
})

/** PTT activePinned: mic только через speak (WUI-3825). Без сессии — pointer-events, не :disabled (иначе либа перетирает цвет). */
const isMicDisabled = computed(() => pinnedCallsPanelStore.isActivePinnedPushToTalkMode())

const isMicInteractionBlocked = computed(() =>
  isPinnedCallMicInteractionDisabled(viewState.value),
)

const displayNumber = computed(() => {
  if (!props.cell.slot) return ''
  return getPinnedCallPServedKey(props.cell.slot.pServed)
})

const displayTitle = computed(() => {
  const title = props.cell.slot?.title
  if (!title) return ''
  if (/sip:/i.test(title)) return getPinnedCallPServedKey(title)
  return title
})

const isMidDisabled = computed(() => isPinnedCallMidDisabled(viewState.value))

/**
 * Edit не меняет стили карточки (только сетка/`+`).
 * `:disabled` у WuiInputRange даёт opacity .56 — блокируем volume без disabled.
 */
const midSectionClass = computed(() => {
  if (props.isEditMode || props.isMoveMode) return 'cursor-pointer'

  if (isMidDisabled.value) return 'pointer-events-none'

  return 'cursor-pointer'
})

const isLineAudible = computed(() => (props.cell.slot?.volume ?? 0) > 0)

/** В active правая кнопка — toggle mute (pressed = volume 0). */
const isStatusMuteToggle = computed(() =>
  viewState.value === PINNED_CALL_SLOT_VIEW_STATE.active,
)

const statusIcon = computed(() => getPinnedCallStatusIcon(viewState.value, {
  isLineAudible: isLineAudible.value,
  session: viewSession.value,
}))

const volumePercent = computed({
  get: () => Math.round((props.cell.slot?.volume ?? 0) * 100),
  set: (value: number) => {
    if (!props.cell.slot) return
    if (isMidDisabled.value) return
    emit('volumeChange', props.cell.slot.order, value / 100)
  },
})

const handleCardClick = (event: MouseEvent) => {
  if (!props.isEditMode && !props.isMoveMode) return
  emit('select', event)
}

const handleCenterClick = (event: MouseEvent) => {
  if (props.isEditMode || props.isMoveMode) {
    emit('select', event)
    return
  }

  emit('centerClick', props.cell.order, event)
}
</script>

<style scoped>
/*
 * Матрица visualState → токены pinnedline-* (как BroadcastGroupCardFooter).
 * Зоны: --slot-*-* ; range: --color-rng-* через :deep.
 */
.pinned-slot-card--idle {
  --slot-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --slot-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --slot-mic-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mic-brd: var(--color-pinnedline-btn-negcon-brd-dis);
  --slot-mic-icon: var(--color-pinnedline-icon-inactive-dis);
  --slot-mid-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mid-brd: var(--color-pinnedline-brd-inactive-dis);
  --slot-num: var(--color-pinnedline-num-dis);
  --slot-name: var(--color-pinnedline-name-dis);
  --slot-status-bg: var(--color-pinnedline-bg-inactive-def);
  --slot-status-brd: var(--color-pinnedline-brd-inactive-def);
  --slot-status-icon: var(--color-pinnedline-icon-inactive-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-dis);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

/*
 * Макет pinnedline: idle / out / inc / hold — mic+mid одинаково dim (dis).
 * Цвет только у правой кнопки (phone / waitcon / warncon / pause).
 */
.pinned-slot-card--idle .pinned-slot-card__mic,
.pinned-slot-card--outgoing .pinned-slot-card__mic,
.pinned-slot-card--incoming .pinned-slot-card__mic,
.pinned-slot-card--hold .pinned-slot-card__mic {
  background-color: var(--color-pinnedline-bg-inactive-dis) !important;
  border-color: var(--color-pinnedline-btn-negcon-brd-dis) !important;
  color: var(--color-pinnedline-icon-inactive-dis) !important;
}

.pinned-slot-card--idle .pinned-slot-card__mid,
.pinned-slot-card--outgoing .pinned-slot-card__mid,
.pinned-slot-card--incoming .pinned-slot-card__mid,
.pinned-slot-card--hold .pinned-slot-card__mid {
  background-color: var(--color-pinnedline-bg-inactive-dis) !important;
  border-color: var(--color-pinnedline-brd-inactive-dis) !important;
}

.pinned-slot-card--idle .pinned-slot-card__num,
.pinned-slot-card--outgoing .pinned-slot-card__num,
.pinned-slot-card--incoming .pinned-slot-card__num,
.pinned-slot-card--hold .pinned-slot-card__num {
  color: var(--color-pinnedline-num-dis) !important;
}

.pinned-slot-card--idle .pinned-slot-card__name,
.pinned-slot-card--outgoing .pinned-slot-card__name,
.pinned-slot-card--incoming .pinned-slot-card__name,
.pinned-slot-card--hold .pinned-slot-card__name {
  color: var(--color-pinnedline-name-dis) !important;
}

.pinned-slot-card--outgoing {
  --slot-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --slot-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --slot-mic-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mic-brd: var(--color-pinnedline-btn-negcon-brd-dis);
  --slot-mic-icon: var(--color-pinnedline-icon-inactive-dis);
  --slot-mid-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mid-brd: var(--color-pinnedline-brd-inactive-dis);
  --slot-num: var(--color-pinnedline-num-dis);
  --slot-name: var(--color-pinnedline-name-dis);
  --slot-status-bg: var(--color-pinnedline-btn-waitcon-bg-def);
  --slot-status-brd: var(--color-pinnedline-btn-waitcon-brd-def);
  --slot-status-icon: var(--color-pinnedline-btn-waitcon-icon-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.pinned-slot-card--incoming {
  --slot-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --slot-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --slot-mic-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mic-brd: var(--color-pinnedline-btn-negcon-brd-dis);
  --slot-mic-icon: var(--color-pinnedline-icon-inactive-dis);
  --slot-mid-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mid-brd: var(--color-pinnedline-brd-inactive-dis);
  --slot-num: var(--color-pinnedline-num-dis);
  --slot-name: var(--color-pinnedline-name-dis);
  --slot-status-bg: var(--color-pinnedline-btn-waitcon-bg-def);
  --slot-status-brd: var(--color-pinnedline-btn-waitcon-brd-def);
  --slot-status-icon: var(--color-pinnedline-btn-warncon-icon-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.pinned-slot-card--hold {
  --slot-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --slot-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --slot-mic-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mic-brd: var(--color-pinnedline-btn-negcon-brd-dis);
  --slot-mic-icon: var(--color-pinnedline-icon-inactive-dis);
  --slot-mid-bg: var(--color-pinnedline-bg-inactive-dis);
  --slot-mid-brd: var(--color-pinnedline-brd-inactive-dis);
  --slot-num: var(--color-pinnedline-num-dis);
  --slot-name: var(--color-pinnedline-name-dis);
  --slot-status-bg: var(--color-pinnedline-btn-waitcon-bg-def);
  --slot-status-brd: var(--color-pinnedline-btn-waitcon-brd-def);
  --slot-status-icon: var(--color-pinnedline-btn-waitcon-icon-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.pinned-slot-card--inactive {
  --slot-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --slot-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --slot-mic-bg: var(--slot-zone-bg);
  --slot-mic-icon: var(--color-pinnedline-icon-inactive-def);
  --slot-mid-bg: var(--slot-zone-bg);
  --slot-num: var(--color-pinnedline-num-def);
  --slot-name: var(--color-pinnedline-name-def);
  --slot-status-bg: var(--slot-zone-bg);
  --slot-status-brd: var(--slot-zone-brd);
  --slot-status-icon: var(--color-pinnedline-icon-inactive-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.pinned-slot-card--inactive-muted {
  --slot-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --slot-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --slot-mic-bg: var(--slot-zone-bg);
  --slot-mic-icon: var(--color-pinnedline-icon-inactive-def);
  --slot-mid-bg: var(--slot-zone-bg);
  --slot-num: var(--color-pinnedline-num-def);
  --slot-name: var(--color-pinnedline-name-def);
  --slot-status-bg: var(--color-pinnedline-btn-negcon-bg-def);
  --slot-status-brd: var(--color-pinnedline-btn-negcon-brd-def);
  --slot-status-icon: var(--color-pinnedline-btn-negcon-icon-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-neg);
}

.pinned-slot-card--active {
  --slot-zone-bg: var(--color-pinnedline-bg-active-def);
  --slot-zone-brd: var(--color-pinnedline-brd-active-def);
  --slot-mic-bg: var(--color-pinnedline-btn-callcon-active-bg-def);
  --slot-mic-icon: var(--color-pinnedline-btn-callcon-active-icon-def);
  --slot-mid-bg: var(--slot-zone-bg);
  --slot-num: var(--color-pinnedline-num-def);
  --slot-name: var(--color-pinnedline-name-def);
  --slot-status-bg: var(--slot-zone-bg);
  --slot-status-brd: var(--slot-zone-brd);
  --slot-status-icon: var(--color-pinnedline-btn-callcon-active-icon-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.pinned-slot-card--active-muted {
  --slot-zone-bg: var(--color-pinnedline-bg-active-def);
  --slot-zone-brd: var(--color-pinnedline-brd-active-def);
  --slot-mic-bg: var(--color-pinnedline-btn-callcon-active-bg-def);
  --slot-mic-icon: var(--color-pinnedline-btn-callcon-active-icon-def);
  --slot-mid-bg: var(--slot-zone-bg);
  --slot-num: var(--color-pinnedline-num-def);
  --slot-name: var(--color-pinnedline-name-def);
  --slot-status-bg: var(--color-pinnedline-btn-negcon-bg-def);
  --slot-status-brd: var(--color-pinnedline-btn-negcon-brd-def);
  --slot-status-icon: var(--color-pinnedline-btn-negcon-icon-def);
  --slot-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --slot-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --slot-rng-thumb: var(--color-pinnedline-sldr-btn-neg);
}

.pinned-slot-card__mic {
  background-color: var(--slot-mic-bg);
  border: 1px solid var(--slot-mic-brd, var(--slot-zone-brd));
  color: var(--slot-mic-icon);
  overflow: hidden;
  border-radius: 12px 0 0 12px;
}

.pinned-slot-card__mid {
  background-color: var(--slot-mid-bg);
  border: 1px solid var(--slot-mid-brd, var(--slot-zone-brd));
  overflow: hidden;
}

.pinned-slot-card__num {
  color: var(--slot-num);
}

.pinned-slot-card__name {
  color: var(--slot-name);
}

.pinned-slot-card__volume {
  overflow: hidden;
  isolation: isolate;
  position: relative;
  z-index: 0;
}

/* Индекс дубля pServed: 18×18, radius 4, text 13/18 — Figma slot badge */
.pinned-slot-card__slot-index {
  box-sizing: border-box;
  display: inline-grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid var(--slot-index-color, var(--color-pinnedline-slot-def));
  border-radius: 4px;
  color: var(--slot-index-color, var(--color-pinnedline-slot-def));
  font-size: 13px;
  line-height: 1;
  /* Оптическая центровка цифр (глифы часто сидят выше визуального центра). */
  padding-top: 1px;
}

.pinned-slot-card--index-dis {
  --slot-index-color: var(--color-pinnedline-slot-dis);
}

.pinned-slot-card--index-def {
  --slot-index-color: var(--color-pinnedline-slot-def);
}

.pinned-slot-card--index-act {
  --slot-index-color: var(--color-pinnedline-slot-act);
}

.pinned-slot-card__status {
  background-color: var(--slot-status-bg);
  border: 1px solid var(--slot-status-brd);
  color: var(--slot-status-icon);
  overflow: hidden;
  border-radius: 0 12px 12px 0;
}

/*
 * Выбранная линия + mic off (inactive / inactive-muted):
 * рамка + фон зон bg/inactive/hov. При mic on (active*) — только рамка.
 */
.pinned-slot-card--selected.pinned-slot-card--inactive .pinned-slot-card__mic,
.pinned-slot-card--selected.pinned-slot-card--inactive .pinned-slot-card__mid,
.pinned-slot-card--selected.pinned-slot-card--inactive-muted .pinned-slot-card__mic,
.pinned-slot-card--selected.pinned-slot-card--inactive-muted .pinned-slot-card__mid {
  background-color: var(--color-pinnedline-bg-inactive-hov) !important;
}

.pinned-slot-card--selected.pinned-slot-card--inactive .pinned-slot-card__status {
  background-color: var(--color-pinnedline-bg-inactive-hov) !important;
  border-color: var(--color-pinnedline-bg-inactive-hov) !important;
}

.pinned-slot-card__side :deep(.my-btn),
.pinned-slot-card__side :deep(.wui-btn) {
  border: none !important;
  border-radius: 0 !important;
  background-color: transparent !important;
}

/* MyBtn задаёт color через --my-btn-color-* !important — иначе иконка остаётся neutcon-alpha. */
.pinned-slot-card__mic :deep(.my-btn),
.pinned-slot-card__mic :deep(.my-btn.wui-btn--is-disabled) {
  --my-btn-color-def: var(--slot-mic-icon);
  --my-btn-color-hov: var(--slot-mic-icon);
  --my-btn-color-pres: var(--slot-mic-icon);
  --my-btn-color-dis: var(--slot-mic-icon);
  color: var(--slot-mic-icon) !important;
  opacity: 1 !important;
}

.pinned-slot-card__status :deep(.my-btn) {
  --my-btn-color-def: var(--slot-status-icon);
  --my-btn-color-hov: var(--slot-status-icon);
  --my-btn-color-pres: var(--slot-status-icon);
  --my-btn-color-dis: var(--slot-status-icon);
  color: var(--slot-status-icon) !important;
}

.pinned-slot-card__side :deep(.wui-icon) {
  color: inherit;
}

/*
 * TODO: удалить wrapper после фикса inheritAttrs у WuiInputRange.
 * class на компоненте уходит на <input>, переменные должны быть на .wui-input-range.
 * Радиус scale 12px; thumb 16px → radius 8px (в либе calc(thumb-inline / 2)).
 *
 * contain/isolation: native range thumb иначе рисуется поверх wui-dialog (z-99).
 */
.pinned-slot-card__volume-range {
  overflow: hidden;
  contain: paint;
  isolation: isolate;
  position: relative;
  z-index: 0;
  transform: translateZ(0);
}

.pinned-slot-card__volume-range :deep(.wui-input-range) {
  width: 120px !important;
  min-width: 120px !important;
  height: 84px !important;
  --size-rng-scale-block: 84px;
  --size-rng-track: 68px;
  --size-rng-thumb-inline: 16px;
  --size-rng-thumb-block: 68px;
  --size-rng-radius: 12px;
  --color-rng-scale-bg-def: var(--slot-rng-scale-bg);
  --color-rng-scale-brd-def: var(--slot-rng-scale-brd);
  --color-rng-thumb-def: var(--slot-rng-thumb);
  --color-rng-thumb-mute: var(--slot-rng-thumb);
}

.pinned-slot-card__volume-range :deep(.wui-input-range__scale) {
  position: relative;
  z-index: 0;
  padding: 8px 10px;
}

/*
 * VD в free space scale (как BroadcastGroupCardFooter):
 * ::before — серые полосы при active/hold;
 * ::after — синяя дорожка по remoteVoiceLevel.
 */
.pinned-slot-card__volume-range--vad-track :deep(.wui-input-range__scale)::before,
.pinned-slot-card__volume-range--vad-track :deep(.wui-input-range__scale)::after {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 10px;
  pointer-events: none;
  border-radius: 0;
  background-size: 6px 100%;
}

.pinned-slot-card__volume-range--vad-track :deep(.wui-input-range__scale)::before {
  z-index: 0;
  width: calc(100% - 20px);
  background-image: repeating-linear-gradient(
    90deg,
    var(--color-pinnedline-sldr-ind-inactive-def) 0 4px,
    transparent 4px 6px
  );
}

.pinned-slot-card__volume-range--vad-track :deep(.wui-input-range__scale)::after {
  z-index: 0;
  width: calc((100% - 20px) * var(--slot-vad-percent, 0) / 100);
  max-width: calc(100% - 20px);
  opacity: 0;
  transition: width 0.15s ease-out, opacity 0.15s ease-out;
  background-image: repeating-linear-gradient(
    90deg,
    var(--color-pinnedline-sldr-ind-active-def) 0 4px,
    transparent 4px 6px
  );
}

.pinned-slot-card__volume-range--vad-track[data-voice='true'] :deep(.wui-input-range__scale)::after {
  opacity: 1;
  animation: pinned-slot-vad-run 0.7s linear infinite;
}

.pinned-slot-card__volume-range :deep(.wui-input-range__slider) {
  /* Без z-index: иначе thumb уезжает поверх dialog overlay (Chromium).
   * VAD ::before/::after на scale — слайдер и так выше по DOM-порядку. */
  position: relative;
}

.pinned-slot-card__volume-range :deep(.wui-input-range__slider::-webkit-slider-thumb),
.pinned-slot-card__volume-range :deep(.wui-input-range__slider::-moz-range-thumb) {
  opacity: 1;
}

@keyframes pinned-slot-vad-run {
  from {
    background-position: 0 0;
  }

  to {
    background-position: 6px 0;
  }
}
</style>
