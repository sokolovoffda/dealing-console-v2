import { PServed, useIM } from '@wui/im'

import { useAppStore } from '@/shared/composables'
import { contactPServedToNumber } from '@/shared/services'
import { createExternalContact, createFallbackContact } from '@/shared/utils/contact'

import { useContactCachedStore } from './model/use-contact-cached-store'
import { useContactStore } from './model/use-contact-store'
import { Contact, ContactDto, GetContactsQuery } from './types'

const bindingContactResolutionCache = new Map<PServed, Promise<Contact>>()
const IM_NO_USER_MESSAGE = 'no user'

export const contactsQueryToString = (query: GetContactsQuery): string => {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (key === 'Filters') return

    params.set(key, value.toString())
  })

  // Filters как в web/dispatch: скобки `[` `]` не кодируем через URLSearchParams
  // (иначе Filters%5B0%5D... и ASP.NET иногда плохо биндит массив).
  let string = params.toString()

  if (query.Filters) {
    query.Filters.forEach((f, i) => {
      f.AvailableOperations.forEach((o, j) => {
        string += `&Filters[${i}].AvailableOperations[${j}]=${encodeURIComponent(o)}`
      })
      string += `&Filters[${i}].AvailableValues=${encodeURIComponent(f.AvailableValues)}`
      string += `&Filters[${i}].PropertyName=${encodeURIComponent(f.PropertyName)}`
      string += `&Filters[${i}].TypeFilter=${encodeURIComponent(f.TypeFilter)}`
    })
  }

  return string
}

export const isExternalContactDto = (contact: ContactDto): boolean => {
  if (contact.contactType) {
    return contact.contactType === 'externalContact'
  }

  return !contact.imLogin && !contact.internalNumber
}

export const getContactByPServed = async (pServed: string) => {
  const internalNumber = contactPServedToNumber(pServed)
  const contactStore = useContactStore()
  const cachedStore = useContactCachedStore()
  const storeContact = contactStore.getByPServed(pServed) as Contact | undefined
  const storeContactByNumber = contactStore.getByInternalNumber(internalNumber) as Contact | undefined
  const cachedContact = await cachedStore.getByPServed(pServed, true)
  const cachedContactByNumber = await cachedStore.getByInternalNumber(internalNumber, true)
  const internalContact = [storeContact, storeContactByNumber, cachedContact, cachedContactByNumber]
    .find((contact) => contact && !contact.isExternal)

  if (internalContact) {
    return internalContact
  }

  if (storeContact) {
    return storeContact
  }

  if (storeContactByNumber) {
    return storeContactByNumber
  }

  if (cachedContact) {
    return cachedContact
  }

  if (cachedContactByNumber) {
    return cachedContactByNumber
  }

  return undefined
}

export const getContactByInternalNumber = async (internalNumber: string, createExternalContactIfNotFound = false) => {
  const contactStore = useContactStore()
  const cachedStore = useContactCachedStore()
  const storeContact = contactStore.getByInternalNumber(internalNumber) as Contact | undefined
  const cachedContact = await cachedStore.getByInternalNumber(internalNumber, true)
  const internalContact = [storeContact, cachedContact]
    .find((contact) => contact && !contact.isExternal)

  if (internalContact) {
    return internalContact
  }

  if (storeContact) {
    return storeContact
  }

  if (cachedContact) {
    return cachedContact
  }

  if (createExternalContactIfNotFound) {
    return createExternalContact(internalNumber)
  }

  return undefined
}

const isNoUserError = (error: unknown) => {
  return error instanceof Error
    ? error.message === IM_NO_USER_MESSAGE
    : String(error) === IM_NO_USER_MESSAGE
}

export const resolveBindingContactByPServed = async (pServed: PServed): Promise<Contact> => {
  const internalNumber = contactPServedToNumber(pServed)
  const contact = await getContactByPServed(pServed) ?? await getContactByInternalNumber(internalNumber)

  if (contact) {
    return contact
  }

  const cachedRequest = bindingContactResolutionCache.get(pServed)
  if (cachedRequest) {
    return cachedRequest
  }

  const request = (async () => {
    const { onIMReady } = useAppStore()

    if (!onIMReady) {
      return createFallbackContact(internalNumber)
    }

    try {
      await useIM().requestBriefStatus({ contactId: pServed })
      return createFallbackContact(internalNumber)
    } catch (error) {
      if (isNoUserError(error)) {
        return createExternalContact(internalNumber, false)
      }

      console.warn('Failed to resolve binding contact by IM:', pServed, error)
      return createFallbackContact(internalNumber)
    }
  })().finally(() => {
    bindingContactResolutionCache.delete(pServed)
  })

  bindingContactResolutionCache.set(pServed, request)
  return request
}
