<template>
  <div>
    <template v-for="item in list" :key="item.id">
      <small-contact-list-item
        :contact="item"
        class="w-full"
        @click.stop="onClick(item)"
      />
    </template>
    <wui-paginator
      v-model="paginationModel"
      :variants="PER_PAGE_VARIANTS"
      class="whitespace-nowrap text-black"
    />
  </div>
</template>

<script lang="ts" setup>
import { Pageable, WuiPaginator } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, onBeforeMount } from 'vue'

import { useContactStore, Contact } from '@/entities/contact'

import { throttle } from '@/shared/utils/throttle'

import SmallContactListItem from './SmallContactListItem.vue'

const storeContacts = useContactStore()
const { contacts, page, perPage, total } = storeToRefs(storeContacts)

const PER_PAGE_VARIANTS = [15]
const paginationModel = computed<Pageable>({
  get: () => ({
    currentPage: page.value,
    perPage: perPage.value,
    total: total.value,
  }),
  // Без троттла отправляется 2 запроса. Проверить после мержа либы с wui-paginator
  set: throttle(async ({ perPage, currentPage }: Pageable) => {
    await storeContacts.fetchData({ Size: perPage, Page: currentPage })
  }, 100),
})

const list = computed(() => Array.from(contacts.value.values()))

const emit = defineEmits<{
  (event: 'selectContact', value: Contact): void;
}>()

const onClick = (contact: Contact): void => {
  emit('selectContact', contact)
}

onBeforeMount(() => {
  storeContacts.fetchData({ Page: 1, Size: 10 })
})
</script>
