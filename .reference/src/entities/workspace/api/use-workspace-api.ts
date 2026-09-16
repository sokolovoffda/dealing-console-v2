import axios, { AxiosResponse } from 'axios'

import type {
  CreateWorkspaceSnapshotDto,
  UpdateWorkspaceSnapshotDto,
  WorkspaceSnapshotDto,
  WorkspaceSnapshotsDto,
} from '@/entities/workspace'

import { getAdditionalApiURL } from '@/shared/url-helper'

const SNAPSHOTS_PATH = '/api/v1/me/snapshots'

const fetchSnapshots = (): Promise<AxiosResponse<WorkspaceSnapshotsDto>> => {
  return axios.get<WorkspaceSnapshotsDto>(getAdditionalApiURL({ pathName: SNAPSHOTS_PATH }))
}

const createSnapshot = (snapshot: CreateWorkspaceSnapshotDto): Promise<AxiosResponse<WorkspaceSnapshotDto>> => {
  return axios.post<WorkspaceSnapshotDto>(getAdditionalApiURL({ pathName: SNAPSHOTS_PATH }), snapshot)
}

const updateSnapshot = (snapshot: UpdateWorkspaceSnapshotDto): Promise<AxiosResponse<WorkspaceSnapshotDto>> => {
  return axios.put<WorkspaceSnapshotDto>(getAdditionalApiURL({ pathName: `${SNAPSHOTS_PATH}/${snapshot.id}` }), snapshot)
}

const deleteSnapshot = (snapshotId: string): Promise<AxiosResponse> => {
  return axios.delete(getAdditionalApiURL({ pathName: `${SNAPSHOTS_PATH}/${snapshotId}` }))
}

export const useWorkspaceApi = () => {
  return {
    fetchSnapshots,
    createSnapshot,
    updateSnapshot,
    deleteSnapshot,
  }
}
