<template>
  <wui-icon v-if="icon" :name="icon" class="text-black" />
</template>

<script lang="ts" setup>
import { WuiIcon } from '@wui/common-library'
import { computed } from 'vue'

import { MemberStatus } from '@/entities/conference'

const props = defineProps<{
  status: MemberStatus
}>()

const icon = computed(() => {
  switch (props.status) {
  case MemberStatus.Active: return 'fiberManualRecord'
  case MemberStatus.Inactive: return 'fiberManualRecordOutlined'
  case MemberStatus.Dialing: return 'animatedLoaderWheel'
  case MemberStatus.OnHold: return 'pause'
  default: return undefined
  }
})
</script>
