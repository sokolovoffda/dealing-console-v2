import { Ref } from 'vue'

/** Порог boolean VD (remoteVoiceDetected). */
export const VOICE_INDICATION_THRESHOLD = 1

/**
 * Сырой getVolume ≈ этого значения считается «полной» полоской (100%).
 * Ниже — пропорционально; выше — clamp 100.
 */
export const VOICE_LEVEL_FULL_SCALE = 40

export const volumeToPercent = (volume: number): number => {
  if (volume <= 0) return 0

  return Math.min(100, Math.round((volume / VOICE_LEVEL_FULL_SCALE) * 100))
}

export const useSessionSpeakerIndication = () => {
  let intervalId: NodeJS.Timeout | null = null

  // Оптимизировано: используем существующий AudioContext и sourceNode
  // Вместо создания новых ресурсов, принимаем готовый analyser
  const startWatch = (
    analyser: AnalyserNode,
    voiceDetected: Ref<boolean>,
    voiceLevel?: Ref<number>,
  ) => {
    if (intervalId) {
      clearInterval(intervalId)
    }

    // Создаем массив данных для анализа
    const fftBins = new Float32Array(analyser.frequencyBinCount)

    // Функция для анализа данных аудио
    intervalId = setInterval(() => {
      analyser.getFloatTimeDomainData(fftBins)
      const volume = getVolume(fftBins)
      voiceDetected.value = volume > VOICE_INDICATION_THRESHOLD

      if (voiceLevel) {
        voiceLevel.value = volumeToPercent(volume)
      }
    }, 100)
  }

  const stopWatch = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return {
    startWatch,
    stopWatch,
  }
}

export function getVolume (dataArray: Float32Array) {
  const magicNumber = 200
  let sumSquares = 0.0
  for (const amplitude of dataArray) { sumSquares += amplitude * amplitude }
  return Math.sqrt(sumSquares / dataArray.length) * magicNumber
}
