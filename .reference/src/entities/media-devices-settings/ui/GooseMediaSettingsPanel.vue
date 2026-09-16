<template>
  <div class="flex w-full flex-col gap-6">
    <div class="flex w-95 flex-col gap-2">
      <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
        <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
          {{ $t('PinnedLinesGooseDevice') }}
        </p>
      </div>
      <wui-select
        v-model="preferredGooseModel"
        :items="gooseSelectItems"
        :disabled="!hasGooseDevices"
        class="app-select goose-media-settings-select w-full"
        :size="48"
      />
    </div>

    <div class="flex w-95 flex-col gap-2">
      <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
        <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
          {{ $t('PinnedLinesGooseOperatingMode') }}
        </p>
      </div>
      <wui-select
        v-model="gooseModeModel"
        :items="gooseModeSelectItems"
        :disabled="!hasGooseDevices"
        class="app-select goose-media-settings-select w-full"
        :size="48"
      />
    </div>

    <div v-if="isPushToTalkMode" class="flex w-95 flex-col gap-2">
      <div class="flex h-8 items-center gap-2.5 self-stretch p-1">
        <p class="text-lg font-medium leading-6 text-wrkspc-main-cblock-txt-def">
          {{ $t('PinnedLinesGoosePttMode') }}
        </p>
      </div>
      <wui-select
        v-model="goosePttScopeModel"
        :items="goosePttScopeSelectItems"
        :disabled="!hasGooseDevices"
        class="app-select goose-media-settings-select w-full"
        :size="48"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { WuiSelect } from '@wui/common-library'

import { useGooseMediaSettings } from '../model/use-goose-media-settings'

const {
  gooseModeModel,
  gooseModeSelectItems,
  goosePttScopeModel,
  goosePttScopeSelectItems,
  gooseSelectItems,
  hasGooseDevices,
  isPushToTalkMode,
  preferredGooseModel,
} = useGooseMediaSettings()
</script>

<style scoped>
/*
 * Figma cmbBoxBig48: body/r-18-26; wui-select size-48 — 16/22.
 * TODO(WUI-5528): убрать после фикса typography size-48 в common-library.
 */
.goose-media-settings-select :deep(.wui-select__field) {
  font-size: 18px;
  line-height: 26px;
}
</style>
