import { NavigationGuard, createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import { useDevicesStore } from '@/shared/composables'

import '@/pages/main/model'

import { beforeEachHook } from './beforeEachHook'

const MONOPOLY_WIDGET_PAGE = () => import('@/pages/main/ui/monopoly-widget-page/MonopolyWidgetPage.vue')

const createBindingContactBeforeEnter = (bindingContactBlockRouteName: string) => {
  return ((to, _from, next) => {
    const { gooseDevices } = useDevicesStore()
    const device = gooseDevices.at(0)

    if (device && to.name !== bindingContactBlockRouteName) {
      next({ name: bindingContactBlockRouteName, params: { id: device.id } })
      return
    }

    next()
  }) satisfies NavigationGuard
}

const createSettingsRoute = (path: string): RouteRecordRaw => ({
  path,
  name: 'Settings',
  component: () => import('@/pages/main/ui/settings-page/ui/SettingsPage.vue'),
  redirect: () => ({ name: 'MainSettings' }),
  children: [
    {
      path: 'media-device',
      name: 'MediaDevice',
      component: () => import('@/pages/main/ui/settings-page/sections/media-device/MediaDevicePage.vue'),
    },
    {
      path: 'main-settings',
      name: 'MainSettings',
      component: () => import('@/pages/main/ui/settings-page/sections/main-settings/MainSettings.vue'),
    },
    {
      path: 'incoming-calls-handler',
      name: 'ForwardingSettings',
      component: () => import('@/pages/main/ui/settings-page/sections/forwarding-settings/ForwardingSettingsPage.vue'),
    },
    {
      path: 'customize',
      name: 'Customize',
      component: () => import('@/pages/main/ui/settings-page/sections/customize/CustomizePage.vue'),
    },
    {
      path: 'binding-contact',
      name: 'BindingContact',
      component: () => import('@/pages/main/ui/settings-page/sections/line-keys/BindingContact.vue'),
      beforeEnter: createBindingContactBeforeEnter('BindingContactBlock'),
      children: [
        {
          path: ':id',
          name: 'BindingContactBlock',
          component: () => import('@/pages/main/ui/settings-page/sections/line-keys/BindingContactBlock.vue'),
        },
      ],
    },
    {
      path: 'black-white-list',
      name: 'BlackWhiteList',
      component: () => import('@/pages/main/ui/settings-page/sections/black-white-list/BlackWhiteListPage.vue'),
    },
  ],
})

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Root',
    redirect: { name: 'Main' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/ui/LoginPage.vue'),
    meta: {
      isPublic: true,
    },
  },
  {
    path: '/main',
    name: 'Main',
    component: () => import('@/app/layout/LayoutApplication.vue'),
    children: [
      {
        path: 'workspace/:workspaceId',
        name: 'Workspace',
        component: () => import('@/pages/main/ui/workspace/WorkspacePage.vue'),
        props: true,
      },
      {
        path: 'monopoly/activity-monitor',
        name: 'ActivityMonitor',
        component: MONOPOLY_WIDGET_PAGE,
        meta: { workspaceWidgetType: 'activityMonitor' },
      },
      {
        path: 'monopoly/contacts',
        name: 'Contacts',
        component: MONOPOLY_WIDGET_PAGE,
        meta: { workspaceWidgetType: 'contacts' },
      },
      {
        path: 'monopoly/pinnedCalls',
        name: 'PinnedCalls',
        component: MONOPOLY_WIDGET_PAGE,
        meta: { workspaceWidgetType: 'pinnedCalls' },
      },
      {
        path: 'monopoly/shared-lines',
        name: 'SharedLines',
        component: () => import('@/pages/main/ui/page-development/PageDevelopment.vue'),
      },
      {
        path: 'monopoly/broadcast-groups',
        name: 'BroadcastGroups',
        component: MONOPOLY_WIDGET_PAGE,
        meta: { workspaceWidgetType: 'groups' },
      },
      {
        path: 'monopoly/favorites',
        name: 'Favorites',
        component: () => import('@/pages/main/ui/page-development/PageDevelopment.vue'),
      },
      {
        path: 'monopoly/groups',
        name: 'Groups',
        component: () => import('@/pages/main/ui/page-development/PageDevelopment.vue'),
      },
      {
        path: 'monopoly/call-queue',
        name: 'MonopolyCallQueue',
        redirect: { name: 'ActivityMonitor' },
      },
      {
        path: 'monopoly/callQueue',
        name: 'CallQueue',
        redirect: { name: 'ActivityMonitor' },
      },
      {
        path: 'monopoly/history',
        name: 'History',
        component: MONOPOLY_WIDGET_PAGE,
        meta: { workspaceWidgetType: 'history' },
      },
      createSettingsRoute('monopoly/settings'),
      {
        path: 'monopoly/phonebook',
        name: 'Phonebook',
        component: MONOPOLY_WIDGET_PAGE,
        meta: { workspaceWidgetType: 'phonebook' },
      },
      {
        path: 'monopoly/conference/:conferencePServed',
        name: 'Conference',
        component: () => import('@/pages/main/ui/conference-call/ConferenceCall.vue'),
        props: true,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(beforeEachHook)

export default router
