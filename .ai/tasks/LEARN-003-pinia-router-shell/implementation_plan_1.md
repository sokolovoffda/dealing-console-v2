# LEARN-003 — Pinia + Vue Router shell

## Часть плана

Один учебный каркас навигации и состояния. Два крупных шага (не микродробление). WUI — LEARN-004.

---

## Шаг 1: Vue Router + смена композиции App

- **Зачем:** `App` становится оболочкой с `<router-view>`; страница `home` открывается по URL.
- **Фокус обучения:** Vue Router, FSD (`app/router`), Composition API.
- **Референс:** `.reference/src/app/router/index.ts`, `.reference/src/main.ts` — только идея `.use(router)`, без guards/settings tree.
- **Файлы:**
  - `npm install vue-router` (версию взять совместимую с Vue 3.5, ориентир `^4`)
  - создать `src/app/router/index.ts` — `createRouter` + `createWebHistory`, роуты:
    - `/` → `HomePage` (name: `home`)
    - `/about` или `/settings` → простая заглушка-страница (чтобы было куда кликнуть; name: `about` / `settings`)
  - создать слайс второй страницы, например `src/pages/about/` (или `settings-stub`) с `ui/*.vue` + `index.ts`
  - изменить `src/app/App.vue` — только `<router-view />` (+ опционально 2 ссылки `RouterLink` для проверки)
  - реэкспорт router из `src/app/index.ts` (или оставить импорт `@/app/router` — на твой вкус, главное public API)
  - изменить `src/main.ts` — `.use(router)` до `mount`
- **Подсказки:**
  1. Роут на страницу:
     ```ts
     import { createRouter, createWebHistory } from 'vue-router'
     import { HomePage } from '@/pages/home'
     import { AboutPage } from '@/pages/about' // пример

     export const router = createRouter({
       history: createWebHistory(),
       routes: [
         { path: '/', name: 'home', component: HomePage },
         { path: '/about', name: 'about', component: AboutPage },
       ],
     })
     ```
  2. В `App.vue` не импортируй страницы напрямую — только `router-view` / `RouterLink`.
  3. `main.ts`:
     ```ts
     import { createApp } from 'vue'
     import { App } from '@/app'
     import { router } from '@/app/router'
     import './style.css'

     createApp(App).use(router).mount('#app')
     ```
  4. Почему так: URL ↔ дерево компонентов; позже на этот же router повесим auth guard.
- **Критерий готовности:** `/` и второй путь открываются в браузере; ссылки переключают страницы без reload.
- **Проверка:** `npm run dev`, клики по ссылкам; `npm run ts:check` && `npm run lint`
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `feat: add Vue Router shell with home and stub page`

---

## Шаг 2: Pinia + учебный store на HomePage

- **Зачем:** привычный контур глобального state до auth/SIP stores.
- **Фокус обучения:** Pinia (setup-store), `storeToRefs`, FSD (store пока в `shared` или `app` — без entities).
- **Референс:** `.reference/src/main.ts` — `.use(createPinia())`; stores в проде размазаны по entities — нам учебный минимум.
- **Файлы:**
  - `npm install pinia`
  - создать учебный store, например `src/shared/model/use-app-shell-store.ts` + реэкспорт в `src/shared/index.ts`  
    (альтернатива: `src/app/model/...` — тоже ок; не клади в `pages`)
  - state: что-то простое, например `title: string` или счётчик `visitCount` + action `increment`
  - на `HomePage` показать значение из store и кнопку, меняющую его
  - `main.ts`: `.use(createPinia())` **до** `.use(router)` (порядок как в референсе: pinia, затем router)
- **Подсказки:**
  1. Setup-store:
     ```ts
     import { defineStore } from 'pinia'
     import { ref } from 'vue'

     export const useAppShellStore = defineStore('app-shell', () => {
       const visitCount = ref(0)
       const increment = () => {
         visitCount.value += 1
       }
       return { visitCount, increment }
     })
     ```
  2. В компоненте:
     ```ts
     import { storeToRefs } from 'pinia'
     import { useAppShellStore } from '@/shared'

     const store = useAppShellStore()
     const { visitCount } = storeToRefs(store)
     const { increment } = store // actions можно без storeToRefs
     ```
  3. Почему `storeToRefs`: деструктуризация `store.visitCount` теряет реактивность; actions — нет.
- **Критерий готовности:** на Home клик меняет число; в Vue DevTools виден Pinia store.
- **Проверка:** `npm run ts:check` && `npm run lint` && `npm run dev`
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `feat: add Pinia and demo app-shell store`

---

## Что не делаем

- WUI / тема → **LEARN-004**
- Auth guard, login page → **LEARN-006**
- Proxy / стенд → **LEARN-005**

## После LEARN-003

`ревью` / `готово` → `старт LEARN-004-wui-theme`
