import { useDialog } from '@wui/common-library'
import { useIM } from '@wui/im'
import { ComponentOptions, readonly, ref } from 'vue'

import { RedirectPeerToPeerToConferenceModal } from '@/features/redirect-peer-to-peer-to-conference'

import { useConferenceState } from '@/entities/conference'
import { useContactStore } from '@/entities/contact'

import { useNotification } from '@/shared/notifications'
import { contactPServedToNumber } from '@/shared/services'
import { wait } from '@/shared/utils/useWait'

const isRedirecting = ref(false)
const currentCallId = ref<string | null>(null)
const currentNumber = ref<string | null>(null)
const loading = ref(false)

type RedirectPeerToConferencePayload = {
  conferencePServed: string
  replaceableCallId: string
  subscribers: string[]
  temporary: boolean
}

type IMWithRedirectPeerToConference = ReturnType<typeof useIM> & {
  redirectP2PToConference: (payload: RedirectPeerToConferencePayload) => Promise<unknown>
}

export const useRedirectPeerToPeerToConference = () => {
  const IM = useIM() as IMWithRedirectPeerToConference
  const { showNotification } = useNotification()
  const { getConfByPServed } = useConferenceState()
  const { getByInternalNumber } = useContactStore()
  const { showDialog } = useDialog<{ muteMic: boolean, temporary: boolean, confirm: boolean }>()

  const startRedirect = (callId: string, internalNumber: string) => {
    isRedirecting.value = true
    currentCallId.value = callId
    currentNumber.value = internalNumber
    console.debug('Запись call id для функции redirectP2PToConference: ', callId)
  }

  const endRedirect = () => {
    isRedirecting.value = false
  }

  const reset = () => {
    endRedirect()
    currentCallId.value = null
    loading.value = false
  }

  const redirect = async (pServed: string) => {
    try {
      loading.value = true
      const conf = getConfByPServed(pServed)
      if (!conf) {
        throw new Error('Невозможно добавление входящего звонка в завешенную конференцию: это не конференция.')
      }
      const replaceableCallId = currentCallId.value
      if (!replaceableCallId) {
        throw new Error('Невозможно добавление входящего звонка в завешенную конференцию: отсутствует replaceableCallId.')
      }
      const number = currentNumber.value
      if (!number) {
        throw new Error('Невозможно добавление входящего звонка в завешенную конференцию: отсутствует internalNumber.')
      }
      const contact = getByInternalNumber(number)
      if (!contact) {
        throw new Error('Невозможно добавление входящего звонка в завешенную конференцию: отсутствует contact.')
      }
      const internalNumber = contactPServedToNumber(number)
      const { confirm, muteMic, temporary } = await showDialog(RedirectPeerToPeerToConferenceModal as ComponentOptions, {
        title: 'Добавление звонка в конференцию',
        hasOverlay: true,
        participantName: contact.name,
        conferenceName: conf.name,
      })
      if (!confirm) {
        throw new Error('Невозможно добавление входящего звонка в завешенную конференцию: отмена функции.')
      }
      await IM.redirectP2PToConference({
        conferencePServed: pServed,
        replaceableCallId,
        subscribers: [internalNumber],
        temporary,
      })
      await wait(500)
      if (muteMic) {
        await IM.muteSubscriberAudio({
          pServed,
          internalNumber,
        })
      }
    } catch (e) {
      showNotification({
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to create conference',
      })
      console.error(e)
    } finally {
      reset()
    }
  }

  return {
    isRedirecting: readonly(isRedirecting),
    loading: readonly(loading),
    startRedirect,
    endRedirect,
    reset,
    redirect,
  }
}