import { AnswerOptions } from '@wui/jssip/lib/RTCSession'
import { CallOptions } from '@wui/jssip/lib/UA'

const BASE_OPTIONS: AnswerOptions & { extraHeaders: Array<string> } = {
  mediaConstraints: {
    audio: true,
    video: false,
  },
  rtcOfferConstraints: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
    iceRestart: false,
  },
  rtcAnswerConstraints: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    iceRestart: false,
  },
  pcConfig: {
    bundlePolicy: 'max-bundle',
  },
  extraHeaders: [
    'X-Satel-Params: MuteMyVideo=true;MuteMyAudio=false',
  ],
}

export const getAnswerOptions = (...extraHeaders: string[]): AnswerOptions => {
  const options: AnswerOptions = {
    ...BASE_OPTIONS,
    extraHeaders: [
      ...BASE_OPTIONS.extraHeaders,
      ...extraHeaders,
    ],
  }

  return options
}

export const getOfferOptions = (...extraHeaders: string[]): CallOptions => {
  const options: CallOptions = {
    ...BASE_OPTIONS,
    extraHeaders: [
      ...BASE_OPTIONS.extraHeaders,
      ...extraHeaders,
    ],
  }
  return options
}
