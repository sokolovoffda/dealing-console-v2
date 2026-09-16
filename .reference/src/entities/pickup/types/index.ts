export interface PickupGroup {
  guid: string
  type: string
  name: string
  aclEnabled: boolean
  subscribers: Array<{number: string}>
}
