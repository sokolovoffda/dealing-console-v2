<template>
  <teleport to="body">
    <div
      ref="modalRef"
      v-click-outside="() => close()"
      class="keyboard-modal fixed z-1100 overflow-hidden rounded-12 border border-ftr-brd-def bg-ftr-bg-def text-white"
      data-test="keyboard-modal"
      :style="positionStyle"
    >
      <header
        class="flex cursor-move select-none items-start gap-2 border-b border-ftr-brd-def px-4 py-2"
      >
        <div class="flex min-w-0 flex-1 items-center py-1">
          <h3 class="truncate text-xl font-medium leading-8">
            {{ $t('OnScreenKeyboard') }}
          </h3>
        </div>
        <my-btn
          icon
          fixed-size
          variant="neutcon"
          tone="alpha"
          prepend-icon="closeRegularLgM"
          :size="40"
          data-test="keyboard-modal-close"
          @mousedown.stop
          @touchstart.stop
          @click="close()"
        />
      </header>
      <keyboard-pad
        class="p-4"
        @on-key-tap="onKeyTap"
      />
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import { ClickOutside as vClickOutside } from '@wui/common-library'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

import { KeyboardPad } from '@/features/keyboard-pad'

import { IKeyboardKey } from '@/shared/utils/keyboard'

import { MyBtn } from '../../my-btn'

const BOTTOM_OFFSET_PX = 8

const emit = defineEmits<{
  (event: 'onKeyTap', param: { letter: string | undefined, key: IKeyboardKey }): void,
  (event: 'close'): void,
}>()

/** Пока true — игнор click-outside (директива срабатывает раньше, чем успевает открыться). */
const loading = ref(true)
const modalRef = ref<HTMLElement | null>(null)

/** Только left/top в px — без translate, иначе при drag будет рывок. */
const positionStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
  visibility: 'hidden',
})

let clickOutsideDelayId: ReturnType<typeof setTimeout> | null = null
let removeDragListeners: (() => void) | null = null
let removeHeaderListeners: (() => void) | null = null

const placeAtBottomCenter = () => {
  const el = modalRef.value
  if (!el) return

  const width = el.offsetWidth
  const height = el.offsetHeight
  const left = Math.max(0, Math.round((window.innerWidth - width) / 2))
  const top = Math.max(0, Math.round(window.innerHeight - height - BOTTOM_OFFSET_PX))

  positionStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
  }
}

const onMoveStart = (event: MouseEvent | Touch) => {
  const el = modalRef.value
  if (!el) return

  if (event instanceof MouseEvent) {
    event.preventDefault()
  }
  const rect = el.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const originLeft = rect.left
  const originTop = rect.top

  positionStyle.value = {
    left: `${originLeft}px`,
    top: `${originTop}px`,
  }

  const moveByDelta = (clientX: number, clientY: number) => {
    positionStyle.value = {
      left: `${originLeft + (clientX - startX)}px`,
      top: `${originTop + (clientY - startY)}px`,
    }
  }

  if (event instanceof MouseEvent) {
    const onMouseMove = (moveEvent: MouseEvent) => {
      moveByDelta(moveEvent.clientX, moveEvent.clientY)
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      removeDragListeners = null
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    removeDragListeners = onMouseUp
    return
  }

  const onTouchMove = (moveEvent: TouchEvent) => {
    const touch = moveEvent.touches[0]
    if (!touch) return
    moveByDelta(touch.clientX, touch.clientY)
  }
  const onTouchEnd = () => {
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    removeDragListeners = null
  }
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd)
  removeDragListeners = onTouchEnd
}

onMounted(async () => {
  const el = modalRef.value
  const header = el?.querySelector('header')
  if (!el || !header) return

  await nextTick()
  placeAtBottomCenter()

  const onHeaderMouseDown = (mouseEvent: MouseEvent) => {
    onMoveStart(mouseEvent)
  }
  const onHeaderTouchStart = (touchEvent: TouchEvent) => {
    const touch = touchEvent.touches[0]
    if (touch) onMoveStart(touch)
  }

  header.addEventListener('mousedown', onHeaderMouseDown)
  header.addEventListener('touchstart', onHeaderTouchStart, { passive: true })
  removeHeaderListeners = () => {
    header.removeEventListener('mousedown', onHeaderMouseDown)
    header.removeEventListener('touchstart', onHeaderTouchStart)
  }

  el.ondragstart = () => false

  clickOutsideDelayId = setTimeout(() => {
    // todo v-click-outside срабатывает быстрей и закрывает модалку не успев открыться
    loading.value = false
    clickOutsideDelayId = null
  }, 200)
})

onUnmounted(() => {
  if (clickOutsideDelayId !== null) {
    clearTimeout(clickOutsideDelayId)
    clickOutsideDelayId = null
  }
  removeDragListeners?.()
  removeHeaderListeners?.()
})

const close = () => {
  if (loading.value) return
  emit('close')
}

const onKeyTap = (param: { letter: string | undefined, key: IKeyboardKey }): void => {
  if (param.letter) {
    emit('onKeyTap', param)
  }

  if (param.key.event === 'backspace') {
    emit('onKeyTap', param)
  } else if (param.key.event === 'submitForm') {
    emit('close')
  } else if (param.key.event === 'showHideKeyboard') {
    emit('close')
  }
}
</script>
