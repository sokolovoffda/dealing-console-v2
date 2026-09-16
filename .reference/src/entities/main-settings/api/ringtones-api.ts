import axios from 'axios'

import { AudioCategory, AudioCategoryTemplate, AudioFilesUsedSpace, AudioFileTemplate, NewAudioFile } from '@/entities/main-settings'

import { getAppURL } from '@/shared/url-helper'

const fetchRingtones = () => {
  return axios.get<AudioFileTemplate[]>(getAppURL({ pathName: '/api/prompt?lang=ru-RU' }))
}
const fetchUsedSpace = () => {
  return axios.get<AudioFilesUsedSpace>(getAppURL({ pathName: '/api/prompt-settings' }))
}
const fetchAudioCategories = async () => {
  try {
    const result = await axios.get<AudioCategory[]>(getAppURL({ pathName: '/api/prompt-category' }))
    if (result.status !== 200) {
      console.warn('Запрос списка категорий выполнился, но код ответа не 200', result)
      return []
    }
    return result.data
  } catch (err) {
    console.error(err)
    return []
  }
}

const createAudioCategory = (newCategory: AudioCategoryTemplate): Promise<AudioCategoryTemplate> => {
  return new Promise((resolve, reject) => {
    axios.post(getAppURL({ pathName: '/api/prompt-category' }), newCategory)
      .then((result: { status: number, data: AudioCategoryTemplate }) => {
        if (result.status !== 201) console.warn('Категория создана, но код ответа не 201', result)
        resolve(result.data)
      })
      .catch((err: { response: { data: string }, message: string }) => {
        console.error(err.message)
        const message = err?.response && err.response?.data || err.message
        reject(new Error(`Ошибка при создании категории для файлов: ${message}`))
      })
  })
}

const saveRingtone = (formData: FormData, audioFileItem: NewAudioFile) => {
  return new Promise((resolve, reject) => {
    axios.post(getAppURL({ pathName: '/api/prompt' }), formData, {
      params: { ...audioFileItem },
    }).then((result: { status: number, data: AudioFileTemplate }) => {
      if (result.status !== 201) console.warn('Файл загружен, но код ответа не 201', result)
      resolve(result.data)
    })
      .catch((err: { response: { data: string }, message: string }) => {
        const message = err?.response && err.response?.data || err.message
        console.error(message)
        reject(new Error(`Ошибка при сохранении: ${message}`))
      })
  })
}

const deleteRingtone = (guid: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    axios.delete(getAppURL({ pathName: `/api/prompt/${guid}` }))
      .then(() => {
        resolve(true)
      })
      .catch((err: { response: { data: string }, message: string }) => {
        const message = err?.response && err.response?.data || err.message
        console.error(message)
        reject(new Error(`Ошибка при удалении: ${message}`))
      })
  })
}

export const useRingtonesApi = () => {
  return {
    fetchRingtones,
    fetchUsedSpace,
    fetchAudioCategories,
    createAudioCategory,
    saveRingtone,
    deleteRingtone,
  }
}
