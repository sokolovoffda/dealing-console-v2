<template>
  <canvas
    ref="canvas"
    class="w-2 h-2"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onUnmounted, ref, watch } from 'vue'

import { usePinnedCallsStore } from '@/entities/call-session'

const { activePinnedCallSession } = storeToRefs(usePinnedCallsStore())

const localStream = computed<MediaStream | undefined>(() => activePinnedCallSession.value?.localStream.value)

const canvas = ref<HTMLCanvasElement | null>(null)
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let bufferLength: number = 0
let dataArray: Uint8Array = new Uint8Array(new ArrayBuffer(0))
// let animationFrameId: number | null = null

watch(() => localStream.value, (stream) => {
  if (stream && stream.active) {
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    source.connect(analyser)
    analyser.fftSize = 256 // Размер FFT (быстрее, чем больше)
    bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(new ArrayBuffer(bufferLength))
    // animationFrameId = requestAnimationFrame(draw)

    return
  }

  if (!stream) {
    stopAudioContext()
    // if (animationFrameId) {
    //   cancelAnimationFrame(animationFrameId)
    // }
  }
})

const draw = () => {
  if (!audioContext) return

  analyser?.getByteFrequencyData(dataArray as Parameters<AnalyserNode['getByteFrequencyData']>[0])
  const average = dataArray.reduce((sum: number, val: number) => sum + val, 0) / bufferLength
  const colors = {
    900: '#395A19',
    700: '#507E23',
    500: '#67A22D',
    300: '#81BC47',
    100: '#9DCB70',
  }
  let color = 'transparent'

  if (average > 125) {
    color = colors[900]
  } else if (average > 100) {
    color = colors[700]
  } else if (average > 75) {
    color = colors[500]
  } else if (average > 50) {
    color = colors[300]
  } else if (average > 5) {
    color = colors[100]
  }

  drawCircle(color)
  // animationFrameId = requestAnimationFrame(draw)
  draw()
}

const drawCircle = (color: string) => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  const size = Math.min(canvas.value.width, canvas.value.height)
  canvas.value.width = size // Изменяем ширину холста
  canvas.value.height = size // Изменяем высоту холста

  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

const stopAudioContext = () => {
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  if (analyser) {
    analyser.disconnect()
    analyser = null
  }
  drawCircle('transparent')
}

onUnmounted(() => {
  stopAudioContext()
})
</script>
