import axios from 'axios'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { shallowRef, triggerRef } from 'vue'

import { useLocalization } from '@/shared/i18n'
import { useNotification } from '@/shared/notifications'
import { getAppURL } from '@/shared/url-helper'

import { encodeGroupNameForRtu } from '../lib/group-name-rtu-workaround'
import { resolveGroupApiError } from '../lib/resolve-group-api-error'

type GUID = string

export type Group = {
  guid: string
  name: string
  type: 'predefined' | 'predefinedShared' | 'predefinedSharedInherited' | 'user'
  contactGuids?: string[]
}

type GroupUpdatePayload = Pick<Group, 'name' | 'type'> & {
  contactGuids?: string[]
}

type CreateGroupPayload = {
  name: Group['name']
  type?: Group['type']
}

export const useGroupStore = defineStore('groups', () => {
  const groups = shallowRef(new Map<GUID, Group>())

  const notifyError = (error: unknown) => {
    const { showNotification } = useNotification()
    const { t } = useLocalization()
    const resolved = resolveGroupApiError(error)

    showNotification({
      type: 'error',
      message: resolved.messageKey ? t(resolved.messageKey) : resolved.fallbackMessage,
    })
  }

  const fetchGroups = async () => {
    try {
      const { data } = await axios.get<Group[]>(getAppURL({ pathName: '/api/user/groups' }))
      data.forEach(group => {
        groups.value.set(group.guid, group)
      })
      triggerRef(groups)
    } catch (e) {
      notifyError(e)
    }
  }

  const createGroup = async (payload: CreateGroupPayload): Promise<Group | undefined> => {
    const group: Group = {
      guid: uuidv4(),
      type: payload.type ?? 'user',
      // WUI-5640: старый RTU режет имя по пробелу — на бек уходит с `_`
      name: encodeGroupNameForRtu(payload.name),
    }

    try {
      const { data } = await axios.post<Group>(getAppURL({ pathName: '/api/user/groups' }), group)
      const createdGroup = data?.guid ? data : group

      groups.value.set(createdGroup.guid, createdGroup)
      triggerRef(groups)

      return createdGroup
    } catch (e) {
      notifyError(e)
      return undefined
    }
  }

  const fetchGroup = async (guid: string): Promise<Group> => {
    const { data } = await axios.get<Group>(getAppURL({ pathName: `/api/user/groups/${guid}` }))

    groups.value.set(data.guid, data)
    triggerRef(groups)

    return data
  }

  const updateGroup = async (guid: string, payload: GroupUpdatePayload): Promise<Group> => {
    const { data } = await axios.put<Group>(getAppURL({ pathName: `/api/user/groups/${guid}` }), payload)

    groups.value.set(data.guid, data)
    triggerRef(groups)

    return data
  }

  const deleteGroup = async (guid: string): Promise<boolean> => {
    try {
      await axios.delete(getAppURL({ pathName: `/api/user/groups/${guid}` }))

      groups.value.delete(guid)
      triggerRef(groups)

      return true
    } catch (e) {
      notifyError(e)
      return false
    }
  }

  const getGroupByGuid = (guid: string): Group | undefined => {
    return groups.value.get(guid)
  }

  return {
    groups,
    fetchGroups,
    fetchGroup,
    getGroupByGuid,
    createGroup,
    updateGroup,
    deleteGroup,
  }
})
