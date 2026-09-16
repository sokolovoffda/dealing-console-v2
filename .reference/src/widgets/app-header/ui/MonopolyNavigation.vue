<template>
  <nav class="flex items-center gap-2">
    <router-link
      v-for="item in navigationItems"
      :key="item.name"
      v-slot="{ isActive, navigate }"
      custom
      :to="{ name: item.name }"
    >
      <my-btn
        icon
        :prepend-icon="item.icon"
        variant="brandcon"
        :size="72"
        :selected="isActive"
        :disabled="item.disabled"
        @click="!item.disabled && navigate()"
      />
    </router-link>
  </nav>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { MyBtn, type MyBtnIconName } from '@/shared/ui'

type NavigationItem = {
  name: string
  icon: MyBtnIconName
  disabled?: boolean
}

const navigationItems = computed<NavigationItem[]>(() => ([
  {
    name: 'Contacts',
    icon: 'layoutTilesM' as MyBtnIconName,
  },
  {
    name: 'BroadcastGroups',
    icon: 'micM' as MyBtnIconName,
  },
  {
    name: 'PinnedCalls',
    icon: 'pinnedM' as MyBtnIconName,
  },

  // {
  //   name: 'SharedLines',
  //   icon: 'shareM' as MyBtnIconName,
  // },
  {
    name: 'Favorites',
    icon: 'starEmptyM' as MyBtnIconName,
  },
  {
    name: 'Phonebook',
    icon: 'userM' as MyBtnIconName,
  },
  {
    name: 'History',
    icon: 'clockM' as MyBtnIconName,
  },
  // {
  //   name: 'MonopolyCallQueue',
  //   icon: 'userTwoM' as MyBtnIconName,
  // },
  {
    name: 'MainSettings',
    icon: 'gearM' as MyBtnIconName,
  },
]))
</script>
