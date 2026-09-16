<template>
  <wui-dropdown close-on-click-outside direction="bottom">
    <template #activator="{ toggle }">
      <div 
        class="flex gap-x-2 text-primary items-center justify-center cursor-pointer"
        @click="toggle"
      >
        <wui-icon
          name="language"
          large
        />
        <p>{{ getCurrentLocale }}</p>
      </div>
    </template>
    <template #default="{ close }">
      <ul class="rounded-8 bg-black-735 border border-black-865 w-[344px] overflow-hidden">
        <li 
          v-for="{ key, value } in getLocales()"
          :key="key"
          class="text-white border-b border-black-500 px-3 py-3 hover:bg-black-600 cursor-pointer"
          @click="() => {
            changeLocale(key)
            close()
          }"
        >
          {{ value }}
        </li>
      </ul>
    </template>
  </wui-dropdown>
</template>

<script setup lang="ts">
import { WuiDropdown, WuiIcon } from '@wui/common-library'

import { Locales, useLocalization } from '@/shared/i18n'

const { getLocales, setLocale, getCurrentLocale } = useLocalization()

const changeLocale = (locale: Locales) => {
  setLocale(locale)
}
</script>