import type { LogicalMediaDevice } from '@/shared/composables'

export type CallMediaDevice = LogicalMediaDevice

export type UAConf = {
  uri: string;
  password: string;
  authorization_user: string;
  display_name?: string;
  contact_uri?: string;
}

export type SetupUA = {
  sipWs: string | undefined;
  ua: UAConf
}

export enum ReferResultType {
  SUCCESS,
  FAIL
}

export interface ReferResult {
  type: ReferResultType
  message: string
}

export type CallConfig = {
  target: string,
  extraHeaders?: string[],
  device?: CallMediaDevice,
  stream?: MediaStream,
}
