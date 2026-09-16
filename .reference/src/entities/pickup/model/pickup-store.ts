import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getAppURL } from '@/shared/url-helper'

import { PickupGroup } from '../types'

export const usePickupStore = defineStore('pickup-store', () => {
  const pickupGroups = ref<Array<PickupGroup>>([])
  const uniqueNumbers = ref<Set<string>>(new Set())

  const fetchPickupGroups = () => {
    return new Promise((resolve, reject) => {
      axios.get<PickupGroup[]>(getAppURL({ pathName: '/api/call-interception' }))
        .then((res) => {
          pickupGroups.value = res.data
          pickupGroups.value.forEach((group) => {
            group.subscribers.forEach((s) => {
              uniqueNumbers.value.add(s.number)
            })
          })
          resolve(res.data)
        }).catch(reject)
    })
  }
  const hasNumberInGroups = (number: string) => {
    return uniqueNumbers.value.has(number)
  }

  return {
    pickupGroups,
    fetchPickupGroups,
    hasNumberInGroups,
  }
})
