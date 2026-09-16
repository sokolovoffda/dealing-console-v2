<template>
  <div
    v-touch.long="{ start: unmute, end: mute }"
    class="card flex flex-col items-center relative rounded-4 pb-2"
    :class="[background, {'animate-pulse': status?.state as number === MemberStatusNumber.Dialing}]"
    :title="title"
  >
    <wui-icon :name="iconName" class="text-black-600 !w-12 !h-12 absolute top-2 left-2" />
    <wui-icon v-if="handEnabled" name="frontHand" class="text-black-600 !w-12 !h-12 absolute top-2 right-2" />
    <wui-avatar :name="name" class="!w-20 !h-20 mt-8 mb-5" />
    <p class="text-black text-center mb-2 text-1624">{{ name }}</p>
    <p class="text-black-800 text-center text-1624">{{ phoneNumber }}</p>
    <p>{{ title }}</p>
  </div>
</template>

<script lang="ts" setup>
import { WuiAvatar, WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useSessionStore } from '@/entities/call-session'
import { useConferenceState, MemberStatusNumber, useConferencePushToTalk } from '@/entities/conference'

import { useAppStore } from '@/shared/composables'
import { vTouch } from '@/shared/directives'

const props = defineProps<{
  name: string
  pServed: string
  phoneNumber: string
  confPServed: string
  callId?: string
}>()

const { currentUser } = storeToRefs(useAppStore())
const { getSessionByPServed } = useSessionStore()
const { getConferenceContactStatusByPServed, getMediaStatus } = useConferenceState()
const {
  pressParticipantPtt,
  releaseParticipantPtt,
  pressOperatorPtt,
  releaseOperatorPtt,
} = useConferencePushToTalk()

const status = computed(() => getConferenceContactStatusByPServed(props.confPServed, props.pServed ?? ''))

const mediaStatus = computed(() => props.callId ? getMediaStatus(props.callId, props.pServed) : { isAudioMuted: false, handEnabled: false })

const conferenceSession = computed(() => getSessionByPServed(props.confPServed))

const isSelf = computed(() => {
  return props.phoneNumber === currentUser.value?.internalNumber
    || props.pServed === currentUser.value?.imLogin
})

const colorMap = new Map([
  [ MemberStatusNumber.Inactive, 'bg-black-500' ],
  [ MemberStatusNumber.Dialing, 'bg-positive-tints-600' ],
  [ MemberStatusNumber.Active, 'bg-positive' ],
  [ MemberStatusNumber.OnHold, 'bg-threshold' ],
])

const titleMap = new Map([
  [ MemberStatusNumber.Inactive, 'Пользователь не активен' ],
  [ MemberStatusNumber.Dialing, 'Попытка дозвона...' ],
  [ MemberStatusNumber.Active, 'В звонке' ],
  [ MemberStatusNumber.OnHold, 'На паузе' ],
])

const title = computed(() => {
  const state = status.value?.state
  if (state) {
    return titleMap.get(state as number)
  } else {
    return titleMap.get(MemberStatusNumber.Inactive)
  }
})

const background = computed(() => {
  const state = status.value?.state ?? undefined
  if (state !== undefined) {
    return colorMap.get(state as number)
  } else {
    return 'bg-black-500'
  }
})

const isMuted = computed(() => {
  // Большие карточки: IM-статус; SIP только если нет callId/данных
  if (isSelf.value) {
    if (props.callId) {
      return mediaStatus.value.isAudioMuted
    }
    return !!conferenceSession.value?.isMuted.value
  }
  return mediaStatus.value.isAudioMuted
})

const handEnabled = computed(() => mediaStatus.value.handEnabled)

const iconName = computed(() => isMuted.value ? 'micOff': 'mic')

const mute = async () => {
  try {
    if (isSelf.value) {
      await releaseOperatorPtt({
        session: conferenceSession.value,
        confPServed: props.confPServed,
        phoneNumber: props.phoneNumber,
      })
      return
    }
    await releaseParticipantPtt({
      confPServed: props.confPServed,
      phoneNumber: props.phoneNumber,
      isAudioMuted: mediaStatus.value.isAudioMuted,
    })
  } catch (e) {
    console.error(e)
  }
}

const unmute = async () => {
  try {
    if (isSelf.value) {
      await pressOperatorPtt({
        session: conferenceSession.value,
        confPServed: props.confPServed,
        phoneNumber: props.phoneNumber,
        isImMuted: mediaStatus.value.isAudioMuted,
      })
      return
    }
    await pressParticipantPtt({
      confPServed: props.confPServed,
      phoneNumber: props.phoneNumber,
      isAudioMuted: mediaStatus.value.isAudioMuted,
    })
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
.card {
  /*height: 212px;*/
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}
</style>
