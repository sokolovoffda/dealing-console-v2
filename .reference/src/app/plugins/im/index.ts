import { UserInfo } from '@wui/common-library'
import { useIM } from '@wui/im'
import { storeToRefs } from 'pinia'
import { Plugin, watch } from 'vue'

import { useAppStarter } from '@/app'

import { useAppStore } from '@/shared/composables'

export const imPlugin: Plugin  = {
  install: () => {
    const { currentUser } = storeToRefs(useAppStore())
    watch(currentUser, async (user, oldUser) => {
      if (!oldUser && user) {
        await useAppStarter(user as UserInfo).startIM()
      } else if (oldUser && !user) {
        await useIM().close()
      }
    }, {
      immediate: true,
    })
  },
}
