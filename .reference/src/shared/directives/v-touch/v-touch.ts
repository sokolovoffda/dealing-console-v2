import { Directive, DirectiveBinding } from 'vue'

interface TouchHandlers {
  handleStart: (event: Event) => void
  handleEnd: (event: Event) => void
}

// WeakMap для хранения обработчиков по элементам
const touchHandlersMap = new WeakMap<HTMLElement, TouchHandlers>()
const MOUSE_EVENT_SUPPRESSION_MS = 1000

const vTouch: Directive = {
  mounted (element: HTMLElement, binding: DirectiveBinding) {
    // Проверяем, что переданы start и end функции
    const value = binding.value
    if (!value || typeof value.start !== 'function' || typeof value.end !== 'function') {
      console.warn('v-touch requires both start and end functions')
      return
    }
    const { start, end } = value
    let timeoutID: number | null = null
    let lastTouchEventTimestamp = Number.NEGATIVE_INFINITY

    const shouldIgnoreMouseEvent = (event: Event) => {
      return event.type.startsWith('mouse')
        && event.timeStamp - lastTouchEventTimestamp < MOUSE_EVENT_SUPPRESSION_MS
    }
    // --- Обработчики ---
    const handleStart = (event: Event) => {
      if (shouldIgnoreMouseEvent(event)) return
      if (event.type === 'touchstart') lastTouchEventTimestamp = event.timeStamp

      element.classList.add('select-none')
      element.classList.add('v-touch')
      if (binding.modifiers?.stop) {
        event.stopPropagation()
      }
      if (binding.modifiers?.long) {
        // Задержка для long press
        timeoutID = window.setTimeout(() => {
          start(event, binding.arg)
        }, 500)
      } else {
        start(event, binding.arg)
      }
    }

    const handleEnd = (event: Event) => {
      if (shouldIgnoreMouseEvent(event)) return
      if (event.type === 'touchend') lastTouchEventTimestamp = event.timeStamp

      if (timeoutID !== null) {
        clearTimeout(timeoutID)
        timeoutID = null
      }

      element.classList.remove('select-none')
      element.classList.remove('v-touch')
      end(event, binding.arg)
    }
    // --- Подписываемся ---
    element.addEventListener('touchstart', handleStart, { passive: false })
    element.addEventListener('mousedown', handleStart, { passive: false })

    element.addEventListener('touchend', handleEnd)
    element.addEventListener('mouseup', handleEnd)

    // --- Сохраняем обработчики в WeakMap ---
    touchHandlersMap.set(element, { handleStart: handleStart, handleEnd: handleEnd })
  },

  unmounted (element: HTMLElement) {
    // Извлекаем обработчики из WeakMap
    const handlers = touchHandlersMap.get(element)
    if (!handlers) return

    const { handleStart, handleEnd } = handlers
    // Удаляем подписки
    element.removeEventListener('touchstart', handleStart)
    element.removeEventListener('mousedown', handleStart)

    element.removeEventListener('touchend', handleEnd)
    element.removeEventListener('mouseup', handleEnd)

    // Удаляем запись из WeakMap
    touchHandlersMap.delete(element)
  },
}

export default vTouch
