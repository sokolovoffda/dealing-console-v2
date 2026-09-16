export interface SubscriberStatus {
  internalNumber: string
  targetNumber?: string
  fromNumber?: string
  callId?: string
  registered?: boolean
  remote?: CallStatusState
  local?: CallStatusState
}

export enum CallStatusState {
  UNKNOWN = 'unknown',
  TERMINATED = 'terminated',
  EARLY = 'early',
  CONFIRMED = 'confirmed',
  HOLD = 'hold',
}

export interface Pagination {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

export interface WithPagination<T> {
  list: T[]
  page: Pagination
  sort?: {
    field: string,
    order?: 'asc' | 'desc'
  }
  warning?: 'string'
}

type AvailableOperations = 'eq' | 'contains' | 'startWith' | 'ge' | 'le' | 'ne' | 'gt' | 'lt' | 'like'

interface FilterRequestData {
  AvailableOperations: AvailableOperations[]
  AvailableValues: string
  PropertyName: 'internalNumber' | 'mobilePhone' | 'imLogin' | 'birthDay' | 'groups' | 'names' | 'email' | 'isFavorite'
  TypeFilter: 'phone' | 'imLogin' | 'dateTime' | 'string'
}

type FiltersRequestData = FilterRequestData[]

export interface Filterable {
  Filters?: FiltersRequestData
}

export type SortableFields = 'name' | 'internalNumber' | 'mobilePhone' | 'email'

export interface Sortable {
  Order?: 'asc' | 'desc',
  SortBy?: SortableFields
}

export interface PaginationRequestData {
  Page: number
  Size: number
}

export type GetContactsQuery = PaginationRequestData & Partial<{
  SearchText: string
  Direction: 'ascending' | 'descending'
  Property: 'name' | 'internalNumber' | 'mobilePhone' | 'email'
  groupId: string
  groupType: string
  contactType: 'externalContact' | 'user'
  FilterLogicOperator: 'and' | 'or' | 'xor'
}> & Filterable & Sortable

export interface ContactDto {
  id: string
  guid?: string
  name: string
  pServed: string
  internalNumber: string
  groupIds: Array<string>
  photo?: string
  organization?: string
  organizationalUnit?: string
  position?: string
  mobilePhone?: string
  imLogin: string
  email?: string
  terminalLogin: string
  terminalPassword: string
  isFavorite?: boolean
  lastSeen?: number
  isOnline?: boolean
  isExternal?: boolean
  contactType?: 'externalContact' | 'user'
}

export interface Contact extends ContactDto {
  groups: GroupDto[]
}

export interface ContactCreateRequestDto {
  groupGuid?: string
  name?: string
  number?: string
  email?: string
  vCard?: string
  existingContactGuid?: string
}

export interface ClientApplicationContactDto {
  guid?: string
  name?: string
  number?: string
  email?: string
  imLogin?: string
}

export type GroupGuid = string

export interface GroupDto {
  guid: GroupGuid
  name: string
  type?: 'predefined' | 'predefinedShared' | 'predefinedSharedInherited' | 'user'
  contactGuids?: string[]
}
