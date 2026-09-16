<template>
  <teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-1000"
      data-test="context-menu-backdrop"
      @pointerdown.self.prevent="emit('close')"
    >
      <div
        ref="menuRef"
        data-test="context-menu-panel"
        class="context-menu-panel pointer-events-auto fixed z-1001 flex flex-col overflow-hidden rounded-14 bg-black-665 shadow-dropdown"
        :class="panelClass"
        :style="menuStyle"
        @click.stop
      >
        <button
          v-for="(item, index) in items"
          :key="item.dataTest ?? `${item.icon}-${item.label}-${index}`"
          type="button"
          class="context-menu-item"
          :class="getItemBorderClass(item.border)"
          :disabled="item.disabled"
          :data-test="item.dataTest"
          @click="handleItemClick(item)"
        >
          <span
            class="context-menu-item__icon flex h-8 w-8 shrink-0 items-center justify-center p-1 text-comp-menu-item-icon-base-def"
            :class="item.iconClass"
          >
            <wui-icon :name="item.icon" class="h-6! w-6!" />
          </span>
          <span
            class="context-menu-item__label text-[18px] leading-[26px]"
            :class="item.labelClass"
          >
            {{ item.label }}
          </span>
        </button>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import { WuiIcon } from '@wui/common-library'
import { computed, nextTick, ref } from 'vue'

import type { ContextMenuAnchorMode, ContextMenuItem, ContextMenuItemBorder, ContextMenuPlacement } from './types'
import { useContextMenuPosition } from './use-context-menu-position'

const props = withDefaults(defineProps<{
  open: boolean
  items: ContextMenuItem[]
  anchorMode?: ContextMenuAnchorMode
  activator?: HTMLElement | null
  cursorPosition?: { x: number, y: number } | null
  placement?: ContextMenuPlacement
  panelClass?: string
}>(), {
  anchorMode: 'activator',
  activator: null,
  cursorPosition: null,
  placement: 'bottom-start',
  panelClass: '',
})

const emit = defineEmits<{
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const openRef = computed(() => props.open)
const placementRef = computed(() => props.placement)

const anchor = computed(() => {
  if (props.anchorMode === 'cursor' && props.cursorPosition) {
    return {
      type: 'point' as const,
      point: props.cursorPosition,
    }
  }

  if (props.activator) {
    return {
      type: 'element' as const,
      element: props.activator,
    }
  }

  return null
})

const { position } = useContextMenuPosition({
  open: openRef,
  anchor,
  menu: menuRef,
  placement: placementRef,
})

const menuStyle = computed(() => ({
  left: `${position.value.left}px`,
  top: `${position.value.top}px`,
}))

const getItemBorderClass = (border?: ContextMenuItemBorder) => {
  if (border === 'top') {
    return 'context-menu-item--border-top'
  }

  if (border === 'bottom') {
    return 'context-menu-item--border-bottom'
  }

  if (border === 'both') {
    return 'context-menu-item--border-both'
  }

  return ''
}

const handleItemClick = async (item: ContextMenuItem) => {
  if (item.disabled) {
    return
  }

  item.onClick()
  await nextTick()
  emit('close')
}
</script>

<style src="./context-menu.css"></style>
