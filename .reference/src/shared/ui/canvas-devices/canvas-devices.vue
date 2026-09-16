<template>
  <canvas
    ref="canvas"
    class="block h-10 w-full"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  stream: MediaStream | null,
  isTestStarted: boolean
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let canvasContext: CanvasRenderingContext2D | null
let animationFrameId: number
const onePercent = 16320 / 250
const gray = '#C4C4C4'
const blue = '#A38059'
const audioContext = new AudioContext()
const analyser = audioContext.createAnalyser()
const dataArray = new Uint8Array(64)
let currentSource: MediaStreamAudioSourceNode | null = null

const drawGraphMicrophoneSensitivity = () => {
  if (!props.stream || !props.stream.active) {
    return
  }
  
  // Инициализируем canvas context если еще не инициализирован
  if (!canvasContext && canvas.value) {
    canvasContext = canvas.value.getContext('2d')
    if (canvas.value.width === 0 || canvas.value.height === 0) {
      canvas.value.width = canvas.value.offsetWidth
      canvas.value.height = canvas.value.offsetHeight
    }
  }
  
  // Отключаем старый source перед созданием нового
  if (currentSource) {
    try {
      currentSource.disconnect()
    } catch (e) {
      console.warn('Error disconnecting old source:', e)
    }
    currentSource = null
  }
  
  try {
    currentSource = audioContext.createMediaStreamSource(props.stream)
    currentSource.connect(analyser)
    loop()
  } catch (e) {
    console.warn('Error creating media stream source:', e)
  }
}

const drawDefaultGraph = () => {
  if (canvas.value) {
    canvasContext = canvas.value.getContext('2d')
    canvasContext?.clearRect(0, 0, canvas.value.width, canvas.value.height)
    if (canvasContext) {
      let x = 2
      for (let i = 0; i < 100; i++) {
        canvasContext.beginPath()
        canvasContext.strokeStyle = gray
        canvasContext.lineWidth = 2
        canvasContext.moveTo(x, 30)
        canvasContext.lineTo(x, 115)
        canvasContext.stroke()
        x += 4
      }
    }
  }
}

const loop = () => {
  let x = 2
  animationFrameId = window.requestAnimationFrame(loop)
  analyser.getByteFrequencyData(dataArray)
  if (canvas.value) {
    canvasContext?.clearRect(0, 0, canvas.value.width, canvas.value.height)
  }
  const sumData = dataArray.reduce((acc, item) => {
    acc += item
    return acc
  }, 0)
  const fillingPercent = Math.floor(sumData / onePercent / 4)

  if (canvasContext) {
    canvasContext.fillStyle = blue
    for (let i = 0; i < 100; i++) {
      const color = i < fillingPercent ? blue : gray
      canvasContext.beginPath()
      canvasContext.strokeStyle = color
      canvasContext.lineWidth = 2
      canvasContext.moveTo(x, 30)
      canvasContext.lineTo(x, 115)
      canvasContext.stroke()
      x += 4
    }
  }
}

watch(() => props.isTestStarted, (value) => {
  if (value) {
    drawGraphMicrophoneSensitivity()
  } else {
    drawDefaultGraph()
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId)
    }
    // Отключаем source при остановке теста
    if (currentSource) {
      try {
        currentSource.disconnect()
      } catch (e) {
        console.warn('Error disconnecting source on stop:', e)
      }
      currentSource = null
    }
  }
})

// Watch на stream prop - пересоздаем source при изменении stream
// Используем проверку id треков вместо deep watch, так как MediaStream не всегда хорошо deep-наблюдается
watch(() => props.stream, (newStream, oldStream) => {
  // Если тест запущен и stream действительно изменился (не просто ссылка, но и содержимое)
  if (props.isTestStarted && newStream && newStream !== oldStream) {
    // Проверяем, изменились ли треки в stream (более точная проверка чем deep watch)
    const newTracks = newStream.getAudioTracks()
    const oldTracks = oldStream?.getAudioTracks() ?? []
    const tracksChanged = newTracks.length !== oldTracks.length ||
      newTracks.some((track, index) => track.id !== oldTracks[index]?.id)
    
    if (tracksChanged) {
      drawGraphMicrophoneSensitivity()
    }
  }
})

onMounted(() => {
  // Инициализируем canvas context при монтировании
  if (canvas.value) {
    canvasContext = canvas.value.getContext('2d')
    if (canvas.value.width === 0 || canvas.value.height === 0) {
      canvas.value.width = canvas.value.offsetWidth
      canvas.value.height = canvas.value.offsetHeight
    }
  }
  drawDefaultGraph()
})

onUnmounted(async () => {
  // Отключаем source перед закрытием
  if (currentSource) {
    try {
      currentSource.disconnect()
    } catch (e) {
      console.warn('Error disconnecting source on unmount:', e)
    }
    currentSource = null
  }
  
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
  }
  
  await audioContext.close()
})
</script>
