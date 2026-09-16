<template>
  <div
    v-touch.long="touchHandlers"
    :class="contactItemStyles"
    class="flex px-4 py-2 gap-4"
  >
    <wui-avatar :class="{'animate-pulse': icon }" :dark="dark" :icon="icon" :name="title" :background="isRegisteredClass" />
    <div class="grow">
      <div class="text-1624 truncate w-[180px]" :class="contactItemNameStyles">{{ title }}</div>
      <div class="text-1424" :class="contactItemSubtitleStyles">
        <slot>{{ subtitle }}</slot>
      </div>
    </div>
    <div>
      <wui-icon v-if="isMutedMember" name="micOff" />
      <slot name="append" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { IconName, WuiAvatar, WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useSessionStore } from '@/entities/call-session'
import { useConferenceSubscriberStatusState } from '@/entities/conference'
import { useContactStatusState } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'
import { vTouch } from '@/shared/directives'

const props = withDefaults(defineProps<{
  title: string,
  subtitle?: string,
  confPServed?: string,
  number?: string,
  icon?: IconName,
  dark?: boolean,
}>(), {
  subtitle: '',
  icon: undefined,
  confPServed: undefined,
  number: undefined,
  dark: false,
})

const emit = defineEmits<{
  (event: 'pttStart' | 'pttEnd'): void
}>()

const { contactStatuses } = storeToRefs(useContactStatusState())

const { currentUser } = storeToRefs(useAppStore())
const { getSessionByPServed } = useSessionStore()
const { getMemberMediaStatus } = useConferenceSubscriberStatusState()

// Hold-PTT: start/end всегда; родитель сам проверяет Active / настройку
const touchHandlers = {
  start: () => emit('pttStart'),
  end: () => emit('pttEnd'),
}

const isRegisteredClass = computed(() => {
  if(!props.number) return 'primary'
  return props.number === currentUser.value?.internalNumber || contactStatuses.value[props.number]?.registered ? 'positive' : 'primary'
})

const isMutedMember = computed(() => {
  if (!props.confPServed || !props.number) return false

  const imMuted = getMemberMediaStatus(props.confPServed, props.number)?.mutedMyAudio

  // Для себя: IM приоритетнее SIP, иначе иконка не следует серверу
  if (props.number === currentUser.value?.internalNumber) {
    if (typeof imMuted === 'boolean') {
      return imMuted
    }
    return !!getSessionByPServed(props.confPServed)?.isMuted.value
  }

  return !!imMuted
})

const contactItemStyles = computed(() => {
  return props.dark ? 'text-white bg-black-700' : 'text-black bg-black-135'
})

const contactItemNameStyles = computed(() => {
  return props.dark ? 'font-normal' : 'font-bold'
})

const contactItemSubtitleStyles = computed(() => {
  return props.dark ? 'text-black-135 font-normal' : 'font-light'
})

</script>
