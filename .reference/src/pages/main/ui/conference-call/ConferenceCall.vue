<template>
  <div class="conference-call h-full flex flex-col">
    <h1 class="text-white bg-black-735 py-3 px-4 text-1624 border-b border-b-black-600 border-solid"> {{ conference?.name }} - {{ countMemberTextView }} </h1>
    <div class="grow overflow-y-auto overflow-x-hidden bg-black-700">
      <div class="grid gap-2 p-2 conference-call__cards">
        <div v-for="subscriber in conference?.subscribers" :key="subscriber.pServed">
          <conference-user 
            :name="subscriber.name" 
            :phone-number="subscriber.phoneNumber" 
            :p-served="subscriber.pServed"
            :call-id="session?.callId.value"
            :conf-p-served="conferencePServed" 
          />
        </div>
      </div>
    </div>
    <div class="flex justify-center items-end bg-black-735 border-t border-t-black-600 py-3 gap-2">
      <button class="w-16 h-16 bg-black-600 rounded-8 text-black-135" @click="toggleMute">
        <wui-icon :name="micIconName" large />
      </button>
      <button class="w-16 h-16 bg-black-600 rounded-8 text-black-135" @click="onCallEndClick">
        <wui-icon name="callEndDown" large />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { WuiIcon } from '@wui/common-library'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/entities/call-session'
import { useConferenceState, ConferenceUser } from '@/entities/conference'

import { useLocalization } from '@/shared/i18n'
import countMemberText from '@/shared/utils/count-member-text'

const props = defineProps<{
  conferencePServed: string
}>()

const { t } = useLocalization()
const router = useRouter()
const { getConfByPServed } = useConferenceState()
const { getSessionByPServed } = useSessionStore()
const isOnMute = ref(false)
const conference = getConfByPServed(props.conferencePServed)

const session = computed(() => getSessionByPServed(props.conferencePServed))

if (!session.value) {
  router.push({ name: 'Contacts' })
}

const onCallEndClick = () => {
  session.value?.terminate()
  router.push({ name: 'Contacts' })
}

const toggleMute = () => {
  session.value?.toggleMute()
  isOnMute.value = !isOnMute.value
}

const wordsForCountMemberText = computed(() => ({
  forOne: t('Participant'),
  forTwo: t('Participant2'),
  forFive: t('Participants'),
}))

const countMemberTextView = computed(() => {
  return countMemberText(conference?.subscribersCount || 0, wordsForCountMemberText.value)
})

const micIconName = computed(() => isOnMute.value ? 'micOff' : 'mic')
</script>

<style scoped>
.conference-call__cards {
  grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));
}
</style>
