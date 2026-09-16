import { defineStore, storeToRefs } from 'pinia'
import { reactive } from 'vue'

import { useAppStore } from '@/shared/composables'

import { useRingtonesApi } from '../api/ringtones-api'
import { isSameGuid } from '../lib/is-same-guid'
import { AudioFilesUsedSpace, NewAudioFile, AudioCategory, AudioCategoryTemplate, AudioFileTemplate } from '../types'

type GUID = string

const findUserRingtoneCategory = (
  categories: AudioCategory[],
  userGuid: string | undefined,
  categoryName: string,
) => {
  return categories.find((item) => isSameGuid(item.owner, userGuid) && item.name === categoryName)
}

export const useRingtonesStore = defineStore('ringtones', () => {

  const ringtonesList = reactive(new Map<GUID, AudioFileTemplate>())
  /** Runtime-состояние категории для upload; IM preferences больше не используем. */
  const customRingtone = reactive({
    guid: '',
    path: '',
    categoryGuid: '',
    categoryName: 'Custom Ringtone Category',
  })
  const usedSpace: AudioFilesUsedSpace = reactive({
    allSpace: 0,
    freeSpace: 0,
    usedSpace: 0,
  })

  const loadStore = async () => {
    try {
      const api = useRingtonesApi()
      const { currentUser } = storeToRefs(useAppStore())
      const { data: ringtones } = await api.fetchRingtones()
      ringtonesList.clear()
      if(Array.isArray(ringtones)) {
        ringtones.forEach(item => {
          if(isSameGuid(item.owner, currentUser.value?.guid)) {
            ringtonesList.set(item.guid, item)
          }
        })
      }
      console.debug('ringtones', ringtonesList)

      const { data: space } = await api.fetchUsedSpace()
      console.debug('usedSpace', space)
      if(typeof space === 'object' && 'allSpace' in space && 'freeSpace' in space && 'usedSpace' in space) {
        usedSpace.allSpace = space.allSpace
        usedSpace.freeSpace = space.freeSpace
        usedSpace.usedSpace = space.usedSpace
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveNewRingtone = async (file: File | string, audioFileItem: NewAudioFile) =>  {
    await ensureAudioCategoryReady()
    const api = useRingtonesApi()
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      const payload: NewAudioFile = {
        ...audioFileItem,
        categoryGuid: customRingtone.categoryGuid,
        categoryName: customRingtone.categoryName,
      }
      console.debug('audioFileItem', payload)
      api.saveRingtone(formData, payload)
        .then((result) => {
          loadStore()
          resolve(result)
        })
        .catch(err => reject(err))
    })
  }

  const removeRingtone = async (guid: string) =>  {
    const api = useRingtonesApi()
    return new Promise((resolve, reject) => {
      api.deleteRingtone(guid)
        .then(() => {
          if (isSameGuid(customRingtone.guid, guid)) {
            customRingtone.guid = ''
            customRingtone.path = ''
          }
          loadStore()
          resolve(true)
        })
        .catch(err => reject(err))
    })
  }

  const ensureAudioCategoryReady = async () => {
    const api = useRingtonesApi()
    const { currentUser } = storeToRefs(useAppStore())
    const categories = await api.fetchAudioCategories()

    if (!Array.isArray(categories)) {
      return createAudioCategoryIfNotExist([])
    }

    console.debug('fetchCategories', categories)

    if (customRingtone.categoryGuid) {
      const categoryFromCache = categories.find((item) => isSameGuid(item.guid, customRingtone.categoryGuid))
      if (categoryFromCache && isSameGuid(categoryFromCache.owner, currentUser.value?.guid)) {
        customRingtone.categoryGuid = categoryFromCache.guid
        customRingtone.categoryName = categoryFromCache.name
        return true
      }

      customRingtone.categoryGuid = ''
    }

    const findCategory = findUserRingtoneCategory(
      categories,
      currentUser.value?.guid,
      customRingtone.categoryName,
    )
    if (findCategory) {
      customRingtone.categoryGuid = findCategory.guid
      customRingtone.categoryName = findCategory.name
      return true
    }

    return createAudioCategoryIfNotExist(categories)
  }

  const createAudioCategoryIfNotExist = async (categories: AudioCategory[]) =>  {
    const api = useRingtonesApi()
    const { currentUser } = storeToRefs(useAppStore())
    const findCategory = findUserRingtoneCategory(
      categories,
      currentUser.value?.guid,
      customRingtone.categoryName,
    )
    if (findCategory) {
      customRingtone.categoryGuid = findCategory.guid
      customRingtone.categoryName = findCategory.name
      return true
    }

    const payload: AudioCategoryTemplate = {
      name: customRingtone.categoryName, // Жёстко прописано, т.к. не даем юзеру функционал управления категориями
      guid: '', // игнорируется на сервере, но обязательное
    }
    return new Promise((resolve, reject) => {
      api.createAudioCategory(payload)
        .then((result) => {
          customRingtone.categoryGuid = result.guid
          customRingtone.categoryName = result.name
          resolve(true)
        })
        .catch(reject)
    })
  }

  return {
    customRingtone,
    ringtonesList,
    usedSpace,
    loadStore,
    saveNewRingtone,
    removeRingtone,
    $reset: () => {
      ringtonesList.clear()
      customRingtone.guid = ''
      customRingtone.path = ''
      customRingtone.categoryGuid = ''
      usedSpace.allSpace = 0
      usedSpace.freeSpace = 0
      usedSpace.usedSpace = 0
    },
  }
})
