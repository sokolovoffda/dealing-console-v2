import { computed, Ref } from 'vue'

import useConferenceState from '../model/use-conference-state'
import { ConferenceDto } from '../types'

/** Актуальный DTO из innerData; selected после rejoin может остаться stub-ссылкой */
export const useResolvedConference = (source: Ref<ConferenceDto | undefined>) => {
  const { getConfByPServed } = useConferenceState()

  return computed(() => {
    const conference = source.value

    if (!conference?.pServed) {
      return conference
    }

    return getConfByPServed(conference.pServed) ?? conference
  })
}
