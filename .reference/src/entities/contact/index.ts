export { default as ContactCard } from './ui/ContactCard.vue'

export * from './model/use-contact-store'
export * from './model/use-contact-status-state'
export * from './model/use-contact-filtering'
export * from './model/use-contact-cached-store'

export * from './types'

export * from './api/use-contact-api'

export { getContactByPServed, getContactByInternalNumber, isExternalContactDto, resolveBindingContactByPServed } from './utils'
export {
  buildContactsDirectorySearchFilterQueries,
  type ContactsDirectorySearchFilterQuery,
} from './lib/build-contacts-directory-search-query'
