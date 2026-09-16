import type { StandPingResult } from '@/shared/stand-config'

export const mapStandPingFailureToKey = (result: StandPingResult): string => {
  switch (result.failure) {
    case 'identity':
      return 'StandPingIdentityError'
    case 'rtu':
      return 'StandPingRtuError'
    case 'aps':
      return 'StandPingApsError'
    case 'both':
      return 'StandPingBothError'
    default:
      return 'StandPingFailed'
  }
}
