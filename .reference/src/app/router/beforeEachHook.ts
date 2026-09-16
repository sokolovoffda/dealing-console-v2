import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

import { useWorkspaceStore } from '@/entities/workspace'

import { useAuth } from '@/shared/auth'
import { useAppStore } from '@/shared/composables'

export const beforeEachHook = async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): Promise<void> => {
  const isPublicRoute = to.meta?.isPublic
  const isAuthenticated = useAuth.isAuthenticated()
  const { currentUser } = useAppStore()
  
  const isAuth = isAuthenticated && !!currentUser // Если пользователь авторизован и имеется объект currentUser

  if (isAuth) {
    if (to.name === 'Login' || !to.name) {
      next({ name: 'Main' })
    } else if (to.name === 'Main') {
      const workspaceStore = useWorkspaceStore()
      await workspaceStore.initWorkspaces()

      const firstWorkspace = workspaceStore.workspaceViewModels.at(0)

      if (firstWorkspace) {
        next({ name: 'Workspace', params: { workspaceId: firstWorkspace.id } })
      } else {
        next()
      }
    } else {
      next()
    }
  } else if (isPublicRoute) {
    next()
  } else {
    next({ name: 'Login' })
  }
}
