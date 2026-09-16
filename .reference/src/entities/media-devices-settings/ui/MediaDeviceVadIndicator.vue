<template>
  <div
    class="media-device-vad flex h-12 w-95 shrink-0 items-center"
    data-test="media-device-vad"
  >
    <div class="flex h-10 items-end gap-0.5">
      <span
        v-for="index in VAD_BAR_COUNT"
        :key="index"
        class="media-device-vad__bar h-full w-1 shrink-0"
        :class="{ 'media-device-vad__bar--active': index <= activeVadBars }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

/** Figma indicator: 37 bars, gap 2, bar 4×40 (rotated → horizontal meter). */
const VAD_BAR_COUNT = 37

const props = defineProps<{
  /** Browser audioinput deviceId; empty → meter idle. */
  inputId?: string | null
}>()

const activeVadBars = ref(0)

let micStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let micSource: MediaStreamAudioSourceNode | null = null
let vadRafId = 0
const frequencyData = new Uint8Array(64)

const stopVadLoop = () => {
  if (vadRafId) {
    window.cancelAnimationFrame(vadRafId)
    vadRafId = 0
  }
  activeVadBars.value = 0
}

const disconnectMicGraph = () => {
  stopVadLoop()
  if (micSource) {
    try {
      micSource.disconnect()
    } catch {
      // already disconnected
    }
    micSource = null
  }
  analyser = null
  if (audioContext) {
    void audioContext.close()
    audioContext = null
  }
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop())
    micStream = null
  }
}

const runVadLoop = () => {
  if (!analyser) return

  vadRafId = window.requestAnimationFrame(runVadLoop)
  analyser.getByteFrequencyData(frequencyData)

  const sum = frequencyData.reduce((acc, value) => acc + value, 0)
  // Same scale idea as CanvasDevices; map to Figma bar count.
  const fillingPercent = Math.min(100, Math.floor(sum / (16320 / 250) / 4))
  activeVadBars.value = Math.round((fillingPercent / 100) * VAD_BAR_COUNT)
}

const startVadMonitor = async () => {
  if (!props.inputId) {
    disconnectMicGraph()
    return
  }

  disconnectMicGraph()

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: normalizeAudioDeviceIdConstraint(props.inputId),
      },
    })
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    micSource = audioContext.createMediaStreamSource(micStream)
    micSource.connect(analyser)
    runVadLoop()
  } catch (error) {
    console.error(error)
    disconnectMicGraph()
  }
}

watch(
  () => props.inputId,
  () => {
    void startVadMonitor()
  },
)

onMounted(() => {
  void startVadMonitor()
})

onBeforeUnmount(() => {
  disconnectMicGraph()
})
</script>

<style scoped>
/* Figma: inactive cblock border; active comp/pinnedline/sldr/ind/active/def */
.media-device-vad__bar {
  background-color: var(--color-wrkspc-main-cblock-brd-def);
}

.media-device-vad__bar--active {
  background-color: var(--color-pinnedline-sldr-ind-active-def);
}
</style>
