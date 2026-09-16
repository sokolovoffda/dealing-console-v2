<template>
  <div class="w-full max-w-full overflow-hidden">
    <div class="flex items-center gap-2 overflow-hidden">
      <wui-btn
        v-if="canScrollLeft"
        icon
        text
        rounded
        prepend-icon="arrowLeft"
        class="h-8! w-8! text-black-135! hover:bg-black-600!"
        @click="scrollTabs('left')"
      />
      <div
        ref="scrollViewport"
        class="tabs-block__viewport min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div
          ref="tabsTrack"
          class="flex w-max min-w-full items-start gap-2 justify-start"
        >
          <tab-item
            v-for="(tab, index) in enabledTabs"
            :key="tab.id"
            :tab="tab"
            :display-index="index + 1"
            :is-active="tab.id === activeTabId"
            @click="handleTabClick(tab, $event)"
          />
          <wui-btn
            v-if="enabledTabs.length > 0"
            icon
            text
            :size="48"
            rounded
            prepend-icon="plusAddM"
            class="text-btn-neut-alpha-icon-def! bg-transparent! hover:bg-btn-neut-soft-bg-hov!"
            data-test="tabs-block-create-group"
            @click="emit('create')"
          />
        </div>
      </div>
      <wui-btn
        v-if="canScrollRight"
        icon
        text
        rounded
        prepend-icon="arrowRight"
        class="h-8! w-8! text-black-135! hover:bg-black-600!"
        @click="scrollTabs('right')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { ContactTab } from '../model/types'
import { useContactTabs } from '../model/use-contact-tabs'


import TabItem from './TabItem.vue'

const scrollViewport = ref<HTMLDivElement>()
const tabsTrack = ref<HTMLDivElement>()
const hasOverflow = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
let resizeObserver: ResizeObserver | undefined

const contactTabsStore = useContactTabs()
const { activeTabId, enabledTabs } = storeToRefs(contactTabsStore)
const { setActiveTab } = contactTabsStore

const emit = defineEmits<{
  create: []
  tabClick: [payload: { groupGuid: string, event: MouseEvent }]
}>()

const handleTabClick = (tab: ContactTab, event: MouseEvent) => {
  setActiveTab(tab.id)
  emit('tabClick', {
    groupGuid: tab.groupGuid,
    event,
  })
}

const updateScrollState = () => {
  const element = scrollViewport.value
  if (!element) {
    hasOverflow.value = false
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  const maxScrollLeft = element.scrollWidth - element.clientWidth
  const nextHasOverflow = maxScrollLeft > 1

  hasOverflow.value = nextHasOverflow
  canScrollLeft.value = nextHasOverflow && element.scrollLeft > 1
  canScrollRight.value = nextHasOverflow && element.scrollLeft < maxScrollLeft - 1
}

const scrollTabs = (direction: 'left' | 'right') => {
  const element = scrollViewport.value
  if (!element) return

  const offset = Math.max(Math.floor(element.clientWidth * 0.7), 160)
  element.scrollBy({
    left: direction === 'left' ? -offset : offset,
    behavior: 'smooth',
  })
}

onMounted(async () => {
  await nextTick()
  updateScrollState()

  if (!scrollViewport.value) return

  scrollViewport.value.addEventListener('scroll', updateScrollState, { passive: true })
  resizeObserver = new ResizeObserver(() => {
    updateScrollState()
  })
  resizeObserver.observe(scrollViewport.value)
  if (tabsTrack.value) {
    resizeObserver.observe(tabsTrack.value)
  }
})

onBeforeUnmount(() => {
  if (scrollViewport.value) {
    scrollViewport.value.removeEventListener('scroll', updateScrollState)
  }
  resizeObserver?.disconnect()
})

watch(enabledTabs, async () => {
  await nextTick()
  updateScrollState()
})
</script>

<style scoped>
.tabs-block__viewport {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs-block__viewport::-webkit-scrollbar {
  display: none;
}
</style>
