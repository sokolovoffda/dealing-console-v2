import { MediaConstraints } from '@wui/jssip/lib/RTCSession'
import { CallOptions } from '@wui/jssip/lib/UA'

import { useContactStore } from '@/entities/contact'

import { useAppStore } from '@/shared/composables'
import { useNotification } from '@/shared/notifications'
import { normalizeAudioDeviceIdConstraint } from '@/shared/utils/normalize-device-id'

import { getOfferOptions } from './call-options'
import { CallConfig } from './types'
import { getUA } from './useWebRTC'

export const call = (config: CallConfig): string | undefined => {
  const { getByInternalNumber, incrementFavoriteToIndexedDb } = useContactStore()
  const { target, extraHeaders, device, stream } = config
  const { currentUser } = useAppStore()
  const { showNotification } = useNotification()

  const offerOptions = getOfferOptions(...(extraHeaders ?? []))
  const mediaConstraints = {
    audio: {
      deviceId: normalizeAudioDeviceIdConstraint(device?.inputId),
      echoCancellation: device?.echoCancellation ?? true,
      noiseSuppression: device?.noiseSuppression ?? true,
      autoGainControl: device?.autoGainControl ?? true,
    },
    video: false,
  }

  const options: CallOptions = {
    ...offerOptions,
    mediaConstraints: {
      ...(offerOptions.mediaConstraints || {}),
      ...mediaConstraints,
    }  as unknown as MediaConstraints,
  }

  if (stream) {
    options.mediaStream = stream
  }

  const contact = getByInternalNumber(target)
  if (contact && 'pServed' in contact) {
    incrementFavoriteToIndexedDb(contact.pServed)
      .catch(console.error)
  }

  if (currentUser?.internalNumber === target) {
    showNotification({
      type: 'error',
      message: 'Нельзя вызвать самого себя',
    })
    return
  }

  const rtcSession = getUA()?.call(target, options)
  const id = rtcSession?.id

  return id
}
