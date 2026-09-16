<template>
  <div
    v-if="loading"
    class="flex items-center justify-center h-[280px] w-full"
  >
    <wui-icon name="animatedLoaderWheel" large class="text-white" />
  </div>
  <section
    v-else
    class="grow grid grid-cols-4 grid-rows-4 text-center gap-2"
    @touchend="onTouchEndFallback"
  >
    <template v-for="[order, pin] in pinnedCalls" :key="order">
      <pinned-calls-item
        v-if="pin"
        :pinned-call="pin"
        :draggable="true"
        class="cursor-move relative"
        :data-order="order"
        @dragstart="onDragStart(order)"
        @dragover.prevent
        @drop="onDrop(order)"
        @touchstart="onTouchStart(order, $event)"
        @touchmove="onTouchMove"
      />
      <add-to-pinned-calls-card
        v-else
        :order="order"
        class="relative"
        :data-order="order"
        @dragover.prevent
        @drop="onDrop(order)"
        @touchstart="onTouchStart(order, $event)"
        @touchmove="onTouchMove"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { WuiIcon } from '@wui/common-library'
import { PServed } from '@wui/im'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

import { PinnedCallsItem } from '@/widgets/pinned-calls'

import { AddToPinnedCallsCard } from '@/features/pinned-calls'

import { usePinnedCallsStore, PinnedCall } from '@/entities/call-session'
import { useContactCachedStore } from '@/entities/contact'

import { useStatusSubscribe } from '@/shared/composables/im'
import { useWebRTC } from '@/shared/jssip/useWebRTC'
import { contactNumberToPServed, contactPServedToNumber, pServedIsNotGroup } from '@/shared/services'
import { arrayBatchesHandler } from '@/shared/utils/array-batches-handler'

const store = usePinnedCallsStore()
const { pinnedCalls, isReady } = storeToRefs(store)
const { fetchContactsBySomeIds } = useContactCachedStore()
const { subscribeSIP, onRegisteredSIP } = useWebRTC()
const { subscribe: contactStatusSubscribe } = useStatusSubscribe()

// === Состояние для drag & drop ===

const draggedOrder = ref<number | null>(null)
const isDragging = ref(false)
const touchStartTime = ref<number | null>(null)
const dragPreviewElement = ref<HTMLElement | null>(null)
const originalElement = ref<HTMLElement | null>(null)

// === Обработчики событий мыши (для десктопа) ===

function onDragStart (order: number) {
  draggedOrder.value = order
}

function onDrop (targetOrder: number) {
  const sourceOrder = draggedOrder.value
  if (sourceOrder === null || sourceOrder === targetOrder) return

  const sourceItem = pinnedCalls.value.get(sourceOrder)
  const targetItem = pinnedCalls.value.get(targetOrder)

  if (sourceItem && targetItem) {
    store.clearSlot(targetOrder)
    store.clearSlot(sourceOrder)
    store.updateSlot({ ...sourceItem, order: targetOrder })
    store.updateSlot({ ...targetItem, order: sourceOrder })
  } else if (sourceItem) {
    store.updateSlot({ ...sourceItem, order: targetOrder })
    store.clearSlot(sourceOrder)
  } else if (targetItem) {
    store.updateSlot({ ...targetItem, order: sourceOrder })
    store.clearSlot(targetOrder)
  }

  store.savePreferencesOnServer()
  draggedOrder.value = null
}

// === Обработчики событий тача (для мобильных устройств) ===

const dragThreshold = 5
const initialTouch = ref<{ x: number; y: number } | null>(null)
const hasExceededThreshold = ref(false) // флаг: порог смещения превышен

function onTouchStart (order: number, event: TouchEvent) {
  const touch = event.touches[0]
  touchStartTime.value = Date.now()
  draggedOrder.value = order
  isDragging.value = true
  initialTouch.value = { x: touch.clientX, y: touch.clientY }
  hasExceededThreshold.value = false

  const target = event.target as HTMLElement
  originalElement.value = target.closest('[data-order]') as HTMLElement
}

function onTouchMove (event: TouchEvent) {
  if (!isDragging.value || !initialTouch.value) return

  event.preventDefault()
  const touch = event.touches[0]
  const dx = touch.clientX - initialTouch.value.x
  const dy = touch.clientY - initialTouch.value.y
  const distance = Math.sqrt(dx ** 2 + dy ** 2)

  // Пока не превышен порог — ничего не делаем
  if (distance < dragThreshold) return

  // Если уже начали drag — обновляем позицию
  if (dragPreviewElement.value) {
    updateDragPreviewPosition(touch)
    return
  }

  // === Первый раз превысили порог — начинаем drag ===
  hasExceededThreshold.value = true

  if (originalElement.value) {
    // 1. Создаём превью
    dragPreviewElement.value = originalElement.value.cloneNode(true) as HTMLElement

    const computedStyle = window.getComputedStyle(originalElement.value)
    for (let i = 0; i < computedStyle.length; i++) {
      const property = computedStyle.item(i)
      dragPreviewElement.value.style.setProperty(property, computedStyle.getPropertyValue(property))
    }

    // 2. Убираем transition, чтобы не было анимации появления
    dragPreviewElement.value.style.transition = 'none'

    // 3. Стили перетаскивания
    Object.assign(dragPreviewElement.value.style, {
      position: 'fixed',
      top: `${touch.clientY - originalElement.value.offsetHeight / 2}px`,
      left: `${touch.clientX - originalElement.value.offsetWidth / 2}px`,
      zIndex: '9999',
      pointerEvents: 'none',
      transform: 'scale(1.05)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      opacity: '0.9',
    })

    document.body.appendChild(dragPreviewElement.value)

    // 4. Только теперь меняем оригинал — и тоже без transition
    originalElement.value.style.transition = 'none'
    originalElement.value.style.opacity = '0.4'
    originalElement.value.style.transform = 'scale(0.95)'
  }
}

// Вспомогательная функция для обновления позиции
function updateDragPreviewPosition (touch: Touch) {
  if (!dragPreviewElement.value) return

  // Учитываем scroll страницы
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

  dragPreviewElement.value.style.top = `${touch.clientY + scrollTop - dragPreviewElement.value.offsetHeight / 2}px`
  dragPreviewElement.value.style.left = `${touch.clientX + scrollLeft - dragPreviewElement.value.offsetWidth / 2}px`
}

function onTouchEnd (targetOrder: number) {
  if (!isDragging.value) return

  const duration = Date.now() - (touchStartTime.value ?? 0)

  // Если не было drag (порог не превышен) — это тап
  if (!hasExceededThreshold.value && duration < 200) {
    cleanupDragPreview()
    return
  }

  // Выполняем drop только если drag был
  if (draggedOrder.value !== null && draggedOrder.value !== targetOrder) {
    onDrop(targetOrder)
  }

  cleanupDragPreview()
}

// Резервный обработчик для определения drop при отпускании пальца вне элемента
function onTouchEndFallback (event: TouchEvent) {
  if (!isDragging.value) return

  const touch = event.changedTouches[0]
  const targetElement = document.elementFromPoint(touch.clientX, touch.clientY)

  const dropTarget = findOrderFromElement(targetElement)

  // Передаём в onTouchEnd только если было drag (превью создано)
  if (dropTarget !== null && dragPreviewElement.value) {
    onTouchEnd(dropTarget)
  } else {
    cleanupDragPreview()
  }
}
// === Вспомогательные функции ===

function findOrderFromElement (element: Element | null): number | null {
  while (element && !element.hasAttribute('data-order')) {
    element = element.parentElement
  }
  return element ? Number(element.getAttribute('data-order')) : null
}

function cleanupDragPreview () {
  isDragging.value = false
  touchStartTime.value = null
  draggedOrder.value = null
  initialTouch.value = null
  hasExceededThreshold.value = false

  if (originalElement.value) {
    // Возвращаем оригинал — с transition для плавности
    originalElement.value.style.transition = 'transform 0.15s ease, opacity 0.15s ease'
    originalElement.value.style.opacity = ''
    originalElement.value.style.transform = ''
    originalElement.value = null
  }

  if (dragPreviewElement.value) {
    // Удаляем превью
    if (dragPreviewElement.value.parentNode) {
      dragPreviewElement.value.parentNode.removeChild(dragPreviewElement.value)
    }
    dragPreviewElement.value = null
  }
}

const subscribeToContacts = (contacts: Array<PServed>) => {
  arrayBatchesHandler<PServed>({
    array: contacts,
    delayMs: 1000,
    batchSize: 16,
    callback: (item) => {
      const internalNumber = contactPServedToNumber(item)
      if (onRegisteredSIP.value) {
        subscribeSIP(internalNumber, 5 * 60)
      }
      contactStatusSubscribe(contactNumberToPServed(internalNumber))
    },
  })
}

const loading = ref(true)

watch([isReady, onRegisteredSIP], async ([isReady, onRegisteredSIP]) => {
  if (isReady && onRegisteredSIP) {
    try {
      const contactIds: Array<PServed> = Array.from(pinnedCalls.value.values())
        .filter((pin): pin is PinnedCall => pin !== null)
        .map(({ pServed }) => pServed)
        .filter((pServed) => pServedIsNotGroup(pServed))      
      if (contactIds.length > 0) {
        await fetchContactsBySomeIds(contactIds)
        subscribeToContacts(contactIds)
      }
    } catch (error) {
      console.error('PinnedCallsCards: Error in watch callback:', error)
    } finally {
      loading.value = false
    }
  }
}, { immediate: true })
</script>
