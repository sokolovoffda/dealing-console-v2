import { Pageable } from '@wui/common-library'
import { ref, Ref, watch, computed } from 'vue'

import { contactNumberToPServed } from '@/shared/services'
import { debounce } from '@/shared/utils/debounce'
import { throttle } from '@/shared/utils/throttle'

import { useContactApi } from '../api/use-contact-api'
import { GetContactsQuery, Contact } from '../types'

import { useContactCachedStore } from './use-contact-cached-store'
import { useContactStore } from './use-contact-store'

export const useContactFiltering = (searchText: Ref<string>, initialSize = 14) => {
  const page = ref(0)
  const perPage = ref(0)
  const list = ref<Contact[]>([])
  const total = ref(0)
  const lastPage = ref(0)
  const loading = ref(false)

  const { fetchAllGroups } = useContactStore()
  const { setContactIfDoesNotExists } = useContactCachedStore()

  const fetchContacts = async (query: GetContactsQuery) => {
    const { fetchContacts } = useContactApi()
    const groups = await fetchAllGroups()

    try {
      loading.value = true
      const response = await fetchContacts(query)

      list.value = response.data.list.map(item => {
        const contact = {
          ...item,
          pServed: item.imLogin || contactNumberToPServed(item.internalNumber) || contactNumberToPServed(item.mobilePhone as string),
          groups: groups?.filter(({ guid }) => item.groupIds.includes(guid)) ?? [],
        }

        setContactIfDoesNotExists(contact)
        return contact
      })

      page.value = response.data.page.currentPage
      perPage.value = response.data.page.perPage
      lastPage.value = response.data.page.lastPage
      total.value = response.data.page.total
    } finally {
      loading.value = false
    }
  }

  const paginationModel = computed<Pageable>({
    get: () => ({
      currentPage: page.value,
      total: total.value,
      perPage: perPage.value,
    }),
    // Без троттла отправляется 2 запроса. Проверить после мержа либы с wui-paginator
    set: throttle(({ perPage, currentPage }: Pageable) => {
      fetchContacts({ Size: perPage, Page: currentPage, SearchText: searchText.value })
    }, 100),
  })

  watch(searchText, debounce(() => fetchContacts({ SearchText: searchText.value, Page: 1, Size: perPage.value || initialSize }), 1000))

  return {
    fetchContacts,
    paginationModel,
    loading,
    list,
    page,
    perPage,
    total,
    lastPage,
  }
}
