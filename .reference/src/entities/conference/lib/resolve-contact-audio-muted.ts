import { ContactState } from '@wui/im'

// Wire: snake_case (client_enabled); runtime/d.ts могут быть camelCase
type StreamLike = {
  mid?: string
  kind?: string
  name?: string
  enabled?: boolean
  clientNameByServer?: string
  client_name_by_server?: string
  clientBound?: boolean
  client_bound?: boolean
  clientEnabled?: boolean
  client_enabled?: boolean
}

const getClientBound = (stream: StreamLike): boolean | undefined => {
  if (typeof stream.clientBound === 'boolean') return stream.clientBound
  if (typeof stream.client_bound === 'boolean') return stream.client_bound
  return undefined
}

const getClientNameByServer = (stream: StreamLike): string | undefined => {
  return stream.clientNameByServer ?? stream.client_name_by_server
}

const getClientEnabled = (stream: StreamLike): boolean | undefined => {
  if (typeof stream.clientEnabled === 'boolean') return stream.clientEnabled
  if (typeof stream.client_enabled === 'boolean') return stream.client_enabled
  if (typeof stream.enabled === 'boolean') return stream.enabled
  return undefined
}

const isParticipantAudioStream = (stream: StreamLike): boolean => {
  if (stream.kind !== 'audio') return false

  const bound = getClientBound(stream)
  const nameByServer = getClientNameByServer(stream)

  // Основной mic участника: mid/name audio + client_bound
  if (bound === false) return false
  if (stream.mid === 'audio' || nameByServer === 'audio' || stream.name === 'audio') {
    return bound === true || bound === undefined
  }
  return false
}

/**
 * mutedMyAudio deprecated — mute из streams (client_enabled / clientEnabled).
 */
export const resolveContactAudioMuted = (contact: ContactState): boolean => {
  const call = contact.calls?.at(0)
  const streams = call?.streams as StreamLike[] | undefined

  if (streams?.length) {
    const audioStream = streams.find(isParticipantAudioStream)
    const enabled = audioStream ? getClientEnabled(audioStream) : undefined
    if (typeof enabled === 'boolean') {
      return !enabled
    }
  }

  return !!contact.mutedMyAudio
}
