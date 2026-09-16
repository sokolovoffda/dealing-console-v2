import axios, { AxiosResponse, AxiosRequestConfig } from 'axios'

import { getAppURL } from '@/shared/url-helper'

import {
  ClientApplicationContactDto,
  ContactCreateRequestDto,
  ContactDto,
  GroupDto,
  GetContactsQuery,
  WithPagination,
} from '../types'
import { contactsQueryToString } from '../utils'

const fetchContacts = (query: GetContactsQuery, controller?: AbortController): Promise<AxiosResponse<WithPagination<ContactDto>>> => {
  const params = contactsQueryToString(query)

  const options = {} as Request & AxiosRequestConfig
  if (controller) {
    options.signal = controller.signal
  }

  return axios.get<WithPagination<ContactDto>>(getAppURL({ pathName: `/api/user/contacts?${params}` }), options)
}

const fetchContactGroups = () => {
  return axios.get<GroupDto[]>(getAppURL({ pathName: '/api/user/groups' }))
}

const createClientContact = (payload: ContactCreateRequestDto) => {
  return axios.post<ClientApplicationContactDto>(getAppURL({ pathName: '/api/v1/user/client/contact' }), payload)
}

export const useContactApi = () => {
  return {
    createClientContact,
    fetchContactGroups,
    fetchContacts,
  }
}
