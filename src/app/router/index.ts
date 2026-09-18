import { AboutPage } from '@/pages/about'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'

import { createRouter, createWebHistory } from 'vue-router'

export const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { title: 'Авторизация', nav: false },
  },
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: 'Главная', nav: true },
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
    meta: { title: 'О нас', nav: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
  },
]
export const router = createRouter({
  history: createWebHistory(),
  routes,
})
