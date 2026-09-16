import dayjs from 'dayjs'
import { computed, ComputedRef, ref } from 'vue'

export interface SessionTimer {
  start: () => void;
  stop: () => void;
  duration: ComputedRef<string>
}

export function useSessionTimer (): SessionTimer {
  let intervalId: NodeJS.Timeout
  const timer = ref(0)

  function start () {
    intervalId = setInterval(() => {
      timer.value += 1
    }, 1000)
  }

  function stop () {
    if (!intervalId) return
    clearInterval(intervalId)
  }

  const duration = computed(() => {
    const seconds = timer.value % 60
    const minutes = Math.floor(timer.value / 60)
    const hours = Math.floor(timer.value / 60 / 60)
    return dayjs.duration({
      hours,
      seconds,
      minutes,
    }).format('HH:mm:ss')
  })

  return {
    start,
    stop,
    duration,
  }
}
