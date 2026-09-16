import type { GetContactsQuery } from '../types'

export type ContactsDirectorySearchFilterQuery = Pick<GetContactsQuery, 'Filters'>

const isDigitsOnlySearch = (value: string): boolean => /^\d+$/.test(value)

/**
 * Фильтры поиска справочника — как web (`use-search-contacts-by-string-paginated`),
 * плюс email.
 *
 * `FilterLogicOperator=or` в одном запросе на RTU WebAPI не используем (не работает) —
 * вызывающая сторона делает отдельные GET и merge по id.
 * Без SearchText (матчит guid — WUI-5609).
 *
 * - только цифры → internalNumber + mobilePhone + email
 * - иначе → names (ФИО) + email
 */
export const buildContactsDirectorySearchFilterQueries = (
  searchText: string,
): ContactsDirectorySearchFilterQuery[] => {
  const value = searchText.trim()
  if (!value) return []

  if (isDigitsOnlySearch(value)) {
    return [
      {
        Filters: [{
          AvailableOperations: ['contains'],
          AvailableValues: value,
          PropertyName: 'internalNumber',
          TypeFilter: 'phone',
        }],
      },
      {
        Filters: [{
          AvailableOperations: ['contains'],
          AvailableValues: value,
          PropertyName: 'mobilePhone',
          TypeFilter: 'phone',
        }],
      },
      {
        Filters: [{
          AvailableOperations: ['contains'],
          AvailableValues: value,
          PropertyName: 'email',
          TypeFilter: 'string',
        }],
      },
    ]
  }

  return [
    {
      Filters: [{
        AvailableOperations: ['contains'],
        AvailableValues: value,
        PropertyName: 'names',
        TypeFilter: 'string',
      }],
    },
    {
      Filters: [{
        AvailableOperations: ['contains'],
        AvailableValues: value,
        PropertyName: 'email',
        TypeFilter: 'string',
      }],
    },
  ]
}
