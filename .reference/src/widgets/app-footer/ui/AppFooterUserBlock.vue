<template>
  <div v-chain-tooltip="tooltips.person" class="flex items-center justify-end gap-4 text-white">
    <div class="relative shrink-0">
      <wui-avatar
        :hide-border="true"
        :name="currentUser?.name"
        :size="56"
        :square="true"
        state="filled"
        variant="brand"
      />
      <!-- SIP registration status (как старый LeftPanel person color). -->
      <span
        class="pointer-events-none absolute right-0 top-0 h-4 w-4 rounded-full -m-1"
        :class="sipRegistrationDotClass"
        data-test="sip-registration-status-dot"
        :title="onRegisteredSIP ? 'SIP зарегистрирован' : 'SIP не зарегистрирован'"
      />
    </div>
    <div class="flex flex-col">
      <p class="text-xl">
        {{ currentUser?.name }}
      </p>
      <span class="text-fg-base-fg14 text-[18px]">
        {{ currentUser?.internalNumber }}
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { WuiAvatar, vChainTooltip } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { tooltips } from '@/entities/tooltips'

import { useAppStore } from '@/shared/composables'
import { useWebRTC } from '@/shared/jssip'

const { currentUser } = storeToRefs(useAppStore())
const { onRegisteredSIP } = useWebRTC()

/** green = registered (callcon), orange = not registered (warncon / incoming). */
const sipRegistrationDotClass = computed(() => {
  return onRegisteredSIP.value
    ? 'bg-btn-callcon-base-bg-def'
    : 'bg-btn-warncon-base-bg-def'
})
</script>
