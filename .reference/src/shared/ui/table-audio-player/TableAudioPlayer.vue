<template>
  <div
    ref="playerRoot"
    class="table-audio-player"
    :class="{
      'table-audio-player--playing': isPlaying,
      'table-audio-player--disabled': isDisabled,
      'table-audio-player--seeking': isSeeking,
      'table-audio-player--volume-open': showVolumeControl,
    }"
  >
    <audio
      ref="audioRef"
      class="hidden"
      :src="audioSrc"
      preload="metadata"
      @error="onAudioError"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    />

    <wui-btn
      icon
      text
      rounded
      :size="48"
      variant="neut"
      state="alpha"
      class="table-audio-player__toggle shrink-0"
      :disabled="isDisabled"
      :prepend-icon="isPlaying ? 'pauseM' : 'playM'"
      :aria-label="isPlaying ? 'Pause' : 'Play'"
      @click.stop="togglePlay"
    />

    <div
      v-if="!showVolumeControl"
      class="table-audio-player__content"
      :class="{ 'table-audio-player__content--seekable': canSeek }"
      @mousedown="onSeekMouseDown"
    >
      <span v-if="isPlaying" class="table-audio-player__time">{{ templateTime }}</span>
      <span
        v-else
        class="table-audio-player__name"
        :title="trackName || undefined"
      >{{ trackName }}</span>
    </div>

    <div
      v-if="isPlaying && !showVolumeControl"
      class="table-audio-player__timeline"
      :style="{ width: `${progress}%` }"
    />

    <button
      v-if="canSeek"
      type="button"
      class="table-audio-player__seek-hit"
      aria-label="Seek"
      @mousedown.prevent="onSeekMouseDown"
    />

    <div
      v-click-outside="closeVolumeControl"
      class="table-audio-player__volume-zone"
      :class="{ 'table-audio-player__volume-zone--open': showVolumeControl }"
    >
      <div v-if="showVolumeControl" class="table-audio-player__scale">
        <input
          class="table-audio-player__slider"
          :class="{ 'table-audio-player__slider--muted': isMuted }"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="volume"
          :disabled="isDisabled"
          aria-label="Volume"
          @input="onVolumeInput"
          @click.stop
        >
      </div>
      <wui-btn
        icon
        text
        rounded
        :size="48"
        variant="neut"
        state="alpha"
        class="table-audio-player__toggle shrink-0"
        :class="{ 'table-audio-player__toggle--muted': isMuted }"
        :disabled="isDisabled"
        :prepend-icon="isMuted ? 'volumeOffM' : 'volumeOnM'"
        :aria-label="isMuted ? 'Unmute' : 'Volume'"
        :aria-expanded="showVolumeControl"
        @click.stop="toggleVolumeControl"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClickOutside as vClickOutside, WuiBtn } from '@wui/common-library'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

type TableAudioPlayerProps = {
  audioSrc: string
  trackName?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<TableAudioPlayerProps>(), {
  trackName: '',
  disabled: false,
})

const emit = defineEmits<{
  handleError: [event: Event]
  playing: [isPlaying: boolean]
}>()

const isPlaying = ref(false)
const hasError = ref(false)
const progress = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)
const playerRoot = ref<HTMLElement | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(100)
const isSeeking = ref(false)
const showVolumeControl = ref(false)

const isDisabled = computed(() => props.disabled || hasError.value || !props.audioSrc.trim())
const isMuted = computed(() => volume.value === 0)
const canSeek = computed(() => isPlaying.value && !showVolumeControl.value && !isDisabled.value)
const templateTime = computed(() => `${formatTime(currentTime.value)} / ${formatTime(duration.value)}`)

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return '0:00'

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const updateProgress = () => {
  const audio = audioRef.value
  if (!audio || !Number.isFinite(audio.duration) || isSeeking.value) return

  progress.value = audio.currentTime / audio.duration * 100
}

const getSeekRatio = (clientX: number) => {
  if (!playerRoot.value) return 0

  const rect = playerRoot.value.getBoundingClientRect()
  if (!rect.width) return 0

  return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
}

const previewSeek = (clientX: number) => {
  const ratio = getSeekRatio(clientX)
  progress.value = ratio * 100
  currentTime.value = ratio * duration.value
}

const applySeek = (clientX: number) => {
  const audio = audioRef.value
  if (!audio || !duration.value) return

  const ratio = getSeekRatio(clientX)
  audio.currentTime = ratio * duration.value
  currentTime.value = audio.currentTime
  progress.value = ratio * 100
}

const onSeekMouseMove = (event: MouseEvent) => {
  if (isSeeking.value) previewSeek(event.clientX)
}

const onSeekMouseUp = (event: MouseEvent) => {
  if (!isSeeking.value) return

  applySeek(event.clientX)
  stopSeeking()
}

const stopSeeking = () => {
  isSeeking.value = false
  document.removeEventListener('mousemove', onSeekMouseMove)
  document.removeEventListener('mouseup', onSeekMouseUp)
}

const onSeekMouseDown = (event: MouseEvent) => {
  if (!canSeek.value) return

  event.preventDefault()
  isSeeking.value = true
  previewSeek(event.clientX)
  document.addEventListener('mousemove', onSeekMouseMove)
  document.addEventListener('mouseup', onSeekMouseUp)
}

const togglePlay = () => {
  const audio = audioRef.value
  if (!audio || isDisabled.value) return

  if (isPlaying.value) {
    audio.pause()
    return
  }

  void audio.play()
}

const toggleVolumeControl = () => {
  if (isDisabled.value) return

  showVolumeControl.value = !showVolumeControl.value
}

const closeVolumeControl = () => {
  showVolumeControl.value = false
}

const onVolumeInput = (event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return

  volume.value = Number(target.value)
}

const onAudioError = (event: Event) => {
  stopSeeking()
  hasError.value = true
  isPlaying.value = false
  showVolumeControl.value = false
  progress.value = 0
  currentTime.value = 0
  duration.value = 0
  emit('handleError', event)
}

const resetPlaybackState = () => {
  if (isPlaying.value) isPlaying.value = false

  hasError.value = false
  progress.value = 0
  currentTime.value = 0
  duration.value = 0
}

watch(progress, (value) => {
  if (!isSeeking.value && value >= 100) isPlaying.value = false
})

watch(() => props.audioSrc, resetPlaybackState)

watch(volume, (value) => {
  if (audioRef.value) audioRef.value.volume = value / 100
})

watch(isPlaying, (value) => {
  emit('playing', value)
  if (value) showVolumeControl.value = false
  else stopSeeking()
})

onMounted(() => {
  const audio = audioRef.value
  if (!audio) return

  audio.volume = volume.value / 100
  audio.addEventListener('timeupdate', () => {
    if (isSeeking.value || !audioRef.value) return

    currentTime.value = audioRef.value.currentTime
    updateProgress()
  })
  audio.addEventListener('loadedmetadata', () => {
    if (!audioRef.value) return

    duration.value = audioRef.value.duration
  })
  audio.addEventListener('ended', () => {
    isPlaying.value = false
    progress.value = 0
    currentTime.value = 0
  })
})

onUnmounted(() => {
  stopSeeking()
  audioRef.value?.pause()
})
</script>

<style scoped src="./table-audio-player.css"></style>
