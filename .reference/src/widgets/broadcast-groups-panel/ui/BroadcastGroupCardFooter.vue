<template>
  <footer
    class="broadcast-group-card-footer flex h-22 shrink-0 items-stretch gap-px"
    :class="`broadcast-group-card-footer--${visualState}`"
    data-test="broadcast-group-footer"
    @click.stop
  >
    <div
      class="broadcast-group-card-footer__side broadcast-group-card-footer__side--start broadcast-group-card-footer__mic flex size-22 shrink-0 items-center justify-center"
    >
      <my-btn
        icon
        mode="toggle"
        tone="alpha"
        :size="72"
        :active="isMicOn"
        :disabled="disabled"
        :prepend-icon="micIcon"
        class="rounded-none! bg-transparent!"
        data-test="broadcast-group-mic"
        @click="emit('micClick')"
      />
    </div>

    <div
      class="broadcast-group-card-footer__volume flex min-w-0 flex-1 items-center px-3"
      data-test="broadcast-group-volume"
    >
      <!--
        TODO WUI-5293: временно — WuiInputRange кидает class/style на <input>, не на корень.
        Убрать wrapper-токены, когда в common-library attrs пойдут на .wui-input-range
        (Figma range: node 1269-14793).
      -->
      <div
        class="broadcast-group-card-footer__volume-range w-full"
        :class="{ 'broadcast-group-card-footer__volume-range--vad-track': showVadTrack }"
        :style="vadStyle"
        :data-voice="hasVoiceActivity ? 'true' : 'false'"
      >
        <wui-input-range
          v-model="volumePercentModel"
          orientation="horizontal"
          :min="0"
          :max="100"
          :step="1"
          :size="72"
          :disabled="disabled"
        />
      </div>
    </div>

    <div
      class="broadcast-group-card-footer__side broadcast-group-card-footer__side--end broadcast-group-card-footer__speaker flex size-22 shrink-0 items-center justify-center"
    >
      <my-btn
        icon
        mode="toggle"
        tone="alpha"
        :size="72"
        :active="!isAudible"
        :disabled="disabled"
        :prepend-icon="volumeIcon"
        class="rounded-none! bg-transparent!"
        data-test="broadcast-group-speaker"
        @click="emit('speakerClick')"
      />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { WuiInputRange } from '@wui/common-library'
import { computed } from 'vue'

import { MyBtn } from '@/shared/ui'

import {
  isBroadcastGroupAudible,
  resolveBroadcastGroupMicIcon,
  resolveBroadcastGroupVolumeIcon,
  type BroadcastGroupFooterVisualState,
} from '../model/broadcast-group-card-view'

const props = withDefaults(defineProps<{
  visualState: BroadcastGroupFooterVisualState
  isMicOn: boolean
  volumePercent: number
  /** Ширина активной (синей) VD-дорожки 0..100 — max volume говорящих. */
  voiceActivityPercent?: number
  /** Серая VD-дорожка на весь free space, если в группе ≥1 активная сессия. */
  showVadTrack?: boolean
  disabled?: boolean
}>(), {
  voiceActivityPercent: 0,
  showVadTrack: false,
  disabled: false,
})

const emit = defineEmits<{
  micClick: []
  speakerClick: []
  volumeChange: [volumePercent: number]
}>()

const isAudible = computed(() => isBroadcastGroupAudible(props.volumePercent))

const micIcon = computed(() => resolveBroadcastGroupMicIcon(props.isMicOn))

const volumeIcon = computed(() => resolveBroadcastGroupVolumeIcon(props.volumePercent))

const hasVoiceActivity = computed(() => props.voiceActivityPercent > 0)

const vadStyle = computed(() => ({
  '--footer-vad-percent': String(Math.min(100, Math.max(0, props.voiceActivityPercent))),
}))

const volumePercentModel = computed({
  get: () => props.volumePercent,
  set: (value: number) => {
    emit('volumeChange', value)
  },
})
</script>

<style scoped>
/*
 * Матрица п.1–п.5 (case.md): токены pinnedline-*.
 * Зоны берут --footer-*-* ; range — --color-rng-* через :deep.
 */
.broadcast-group-card-footer--disabled {
  --footer-zone-bg: var(--color-pinnedline-bg-inactive-dis);
  --footer-zone-brd: var(--color-pinnedline-brd-inactive-dis);
  --footer-mic-bg: var(--footer-zone-bg);
  --footer-mic-icon: var(--color-pinnedline-icon-inactive-dis);
  --footer-volume-zone-bg: var(--footer-zone-bg);
  --footer-speaker-bg: var(--footer-zone-bg);
  --footer-speaker-brd: var(--footer-zone-brd);
  --footer-speaker-icon: var(--color-pinnedline-icon-inactive-dis);
  --footer-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --footer-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-dis);
  --footer-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.broadcast-group-card-footer--inactive {
  --footer-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --footer-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --footer-mic-bg: var(--footer-zone-bg);
  --footer-mic-icon: var(--color-pinnedline-icon-inactive-def);
  --footer-volume-zone-bg: var(--footer-zone-bg);
  --footer-speaker-bg: var(--footer-zone-bg);
  --footer-speaker-brd: var(--footer-zone-brd);
  --footer-speaker-icon: var(--color-pinnedline-icon-inactive-def);
  --footer-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --footer-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --footer-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.broadcast-group-card-footer--inactive-muted {
  --footer-zone-bg: var(--color-pinnedline-bg-inactive-def);
  --footer-zone-brd: var(--color-pinnedline-brd-inactive-def);
  --footer-mic-bg: var(--footer-zone-bg);
  --footer-mic-icon: var(--color-pinnedline-icon-inactive-def);
  --footer-volume-zone-bg: var(--footer-zone-bg);
  --footer-speaker-bg: var(--color-pinnedline-btn-negcon-bg-def);
  --footer-speaker-brd: var(--color-pinnedline-btn-negcon-brd-def);
  --footer-speaker-icon: var(--color-pinnedline-btn-negcon-icon-def);
  --footer-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --footer-rng-scale-brd: var(--color-pinnedline-sldr-brd-inactive-def);
  --footer-rng-thumb: var(--color-pinnedline-sldr-btn-neg);
}

.broadcast-group-card-footer--active {
  --footer-zone-bg: var(--color-pinnedline-bg-active-def);
  --footer-zone-brd: var(--color-pinnedline-brd-active-def);
  --footer-mic-bg: var(--color-pinnedline-btn-callcon-active-bg-def);
  --footer-mic-icon: var(--color-pinnedline-btn-callcon-active-icon-def);
  --footer-volume-zone-bg: var(--footer-zone-bg);
  --footer-speaker-bg: var(--footer-zone-bg);
  --footer-speaker-brd: var(--footer-zone-brd);
  --footer-speaker-icon: var(--color-pinnedline-btn-callcon-active-icon-def);
  --footer-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --footer-rng-scale-brd: var(--color-pinnedline-sldr-brd-active-def);
  --footer-rng-thumb: var(--color-pinnedline-sldr-btn-def);
}

.broadcast-group-card-footer--active-muted {
  --footer-zone-bg: var(--color-pinnedline-bg-active-def);
  --footer-zone-brd: var(--color-pinnedline-brd-active-def);
  --footer-mic-bg: var(--color-pinnedline-btn-callcon-active-bg-def);
  --footer-mic-icon: var(--color-pinnedline-btn-callcon-active-icon-def);
  --footer-volume-zone-bg: var(--footer-zone-bg);
  --footer-speaker-bg: var(--color-pinnedline-btn-negcon-bg-def);
  --footer-speaker-brd: var(--color-pinnedline-btn-negcon-brd-def);
  --footer-speaker-icon: var(--color-pinnedline-btn-negcon-icon-def);
  --footer-rng-scale-bg: var(--color-pinnedline-sldr-bg-def);
  --footer-rng-scale-brd: var(--color-pinnedline-sldr-brd-active-def);
  --footer-rng-thumb: var(--color-pinnedline-sldr-btn-neg);
}

.broadcast-group-card-footer__mic {
  background-color: var(--footer-mic-bg);
  border: 1px solid var(--footer-zone-brd);
  color: var(--footer-mic-icon);
  overflow: hidden;
}

.broadcast-group-card-footer__volume {
  background-color: var(--footer-volume-zone-bg);
  border: 1px solid var(--footer-zone-brd);
  overflow: hidden;
}

.broadcast-group-card-footer__speaker {
  background-color: var(--footer-speaker-bg);
  border: 1px solid var(--footer-speaker-brd);
  color: var(--footer-speaker-icon);
  overflow: hidden;
}

.broadcast-group-card-footer__side--start {
  border-bottom-left-radius: 12px;
}

.broadcast-group-card-footer__side--end {
  border-bottom-right-radius: 12px;
}

.broadcast-group-card-footer__side :deep(.my-btn),
.broadcast-group-card-footer__side :deep(.wui-btn) {
  border: none !important;
  border-radius: 0 !important;
  background-color: transparent !important;
}

.broadcast-group-card-footer__side :deep(.wui-icon) {
  color: inherit;
}

/*
 * TODO WUI-5293: удалить блок после фикса inheritAttrs / size API у WuiInputRange.
 * Цвета: pinnedline-sldr-* → --color-rng-*.
 * Размер: Figma 1269-14793 = 240 Fill × 56 (в либе только 32/40/48/72).
 * Переменные — на :deep(.wui-input-range): либа перетирает их на корне.
 */
.broadcast-group-card-footer__volume-range :deep(.wui-input-range) {
  width: 100% !important;
  min-width: 0 !important;
  height: 56px !important;
  --size-rng-scale-block: 56px;
  /* Figma thumb 16×48; scale 56 → padding 4 сверху/снизу */
  --size-rng-track: 44px;
  --size-rng-thumb-inline: 16px;
  --size-rng-thumb-block: 44px;
  --size-rng-radius: 14px;
  --color-rng-scale-bg-def: var(--footer-rng-scale-bg);
  --color-rng-scale-brd-def: var(--footer-rng-scale-brd);
  --color-rng-thumb-def: var(--footer-rng-thumb);
  --color-rng-thumb-mute: var(--footer-rng-thumb);
}

.broadcast-group-card-footer__volume-range :deep(.wui-input-range__scale) {
  padding: 8px 10px;
}

/*
 * VD в free space scale (под thumb):
 * ::before — серые полосы на всю ширину (если ≥1 active session);
 * ::after — синяя активная дорожка по remoteVoiceLevel.
 * inset: 10px x / 8px y; палочка 4px, зазор 2px; без скругления.
 */
.broadcast-group-card-footer__volume-range--vad-track :deep(.wui-input-range__scale)::before,
.broadcast-group-card-footer__volume-range--vad-track :deep(.wui-input-range__scale)::after {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 10px;
  pointer-events: none;
  border-radius: 0;
  background-size: 6px 100%;
}

.broadcast-group-card-footer__volume-range--vad-track :deep(.wui-input-range__scale)::before {
  z-index: 0;
  width: calc(100% - 20px);
  background-image: repeating-linear-gradient(
    90deg,
    var(--color-pinnedline-sldr-ind-inactive-def) 0 4px,
    transparent 4px 6px
  );
}

.broadcast-group-card-footer__volume-range--vad-track :deep(.wui-input-range__scale)::after {
  z-index: 0;
  width: calc((100% - 20px) * var(--footer-vad-percent, 0) / 100);
  max-width: calc(100% - 20px);
  opacity: 0;
  transition: width 0.15s ease-out, opacity 0.15s ease-out;
  background-image: repeating-linear-gradient(
    90deg,
    var(--color-pinnedline-sldr-ind-active-def) 0 4px,
    transparent 4px 6px
  );
}

.broadcast-group-card-footer__volume-range--vad-track[data-voice='true'] :deep(.wui-input-range__scale)::after {
  opacity: 1;
  animation: broadcast-vad-run 0.7s linear infinite;
}

.broadcast-group-card-footer__volume-range :deep(.wui-input-range__slider) {
  position: relative;
  z-index: 1;
}

@keyframes broadcast-vad-run {
  from {
    background-position: 0 0;
  }

  to {
    background-position: 6px 0;
  }
}
</style>
