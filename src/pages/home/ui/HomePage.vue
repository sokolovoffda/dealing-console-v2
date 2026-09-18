<template>
  <main>
    <h1 class="text-wrkspc-main-cblock-txt-def">Dealing Console v2</h1>
    <p>Учебный scaffold. FSD и интеграции — в следующих LEARN.</p>
    <div>{{ visitCount }}</div>
    <wui-btn
      icon
      prepend-icon="plusM"
      :size="40"
      variant="brand"
      state="tonal"
      @click="increment"
    />
  </main>
</template>

<script setup lang="ts">
import { useAppShellStore } from '@/shared'
import { storeToRefs } from 'pinia'
import { WuiBtn } from '@wui/common-library'
import { getStandConfigSnapshot } from '@/shared/stand-config'

const appShellStore = useAppShellStore()

const { visitCount } = storeToRefs(appShellStore)
const { increment } = appShellStore

const stand = getStandConfigSnapshot()
console.log(stand)
</script>
