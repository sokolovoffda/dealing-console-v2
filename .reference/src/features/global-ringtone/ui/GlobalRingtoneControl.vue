<template>
  <icon-button
    icon="audiotrack"
    large-icon
    class="!w-[80px] !h-[80px] relative"
    title="Отменить звонок"
    :active="!isPlayed"
    @click="toggleRingtone"
  />
</template>

<script setup lang="ts">
import { IconButton } from '@/shared/ui'

import { useGlobalRingtone } from '../model/useGlobalRingtone'

const { isPlayed, toggleRingtone } = useGlobalRingtone()
</script>

