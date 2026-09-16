# LEARN-002 — FSD skeleton

## Часть плана

Каркас Feature-Sliced Design поверх LEARN-001: слои, public API, алиас `@/`. Pinia/Router — LEARN-003, WUI — LEARN-004.

## Шаг 1: Создать пустые слои FSD

- **Зачем (коротко):** зафиксировать карту папок, куда дальше класть код.
- **Фокус обучения:** FSD — слои и направление зависимостей (`app` → … → `shared`, не наоборот).
- **Референс:** `.reference/src/` — имена слоёв; содержимое не копировать.
- **Файлы:** создать
  ```text
  src/app/
  src/pages/
  src/widgets/
  src/features/
  src/entities/
  src/shared/
  ```
  В каждом слое пока можно положить пустой `index.ts` (или `.gitkeep`), чтобы папки жили в git.
- **Подсказки реализации:**
  1. Пока без вложенных слайсов (`pages/home/...`) — только корни слоёв.
  2. Правило на будущее: слой ниже **не** импортирует слой выше (`shared` не знает про `pages`).
  3. Мёртвые файлы шаблона Vite (`src/assets/vite.svg`, `vue.svg`, `hero.png`, если есть) — удали в этом или следующем шаге.
- **Критерий готовности:** папки видны в дереве проекта.
- **Проверка:** глазами / `ls src`
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `chore: add empty FSD layer folders`

## Шаг 2: Перенести App в `app` и подключить через public API

- **Зачем (коротко):** `app` — композиция приложения; точка входа `main.ts` остаётся тонкой.
- **Фокус обучения:** FSD public API (`index.ts`), Vue SFC.
- **Референс:** `.reference/src/main.ts` импортирует `./app/App.vue` (у нас через `@/app`).
- **Файлы:**
  - переместить `src/App.vue` → `src/app/App.vue` (текст заглушки сохранить)
  - создать `src/app/index.ts` — реэкспорт App
  - изменить `src/main.ts` — импорт из `@/app` (алиас настроим в шаге 3; если алиас ещё нет — временно относительный `./app`, затем заменить)
- **Подсказки реализации:**
  1. `src/app/index.ts`:
     ```ts
     export { default as App } from './App.vue'
     ```
     или `export { default } from './App.vue'` — выбери один стиль и держись его.
  2. `main.ts`:
     ```ts
     import { createApp } from 'vue'
     import { App } from '@/app'
     import './style.css'

     createApp(App).mount('#app')
     ```
  3. Глобальные стили пока можно оставить `src/style.css`; в `app/assets` перенесёшь позже при желании (не обязательно сейчас).
- **Критерий готовности:** `npm run dev` показывает ту же русскую заглушку.
- **Проверка:** `npm run dev`
- **Кто пишет код:** ты
- **Коммит после шага:** да (можно объединить с шагом 3, если удобнее один коммит «App + alias»)  
  Ориентир: `refactor: move App into app layer`

## Шаг 3: Алиас `@/` в Vite и TypeScript

- **Зачем (коротко):** импорты как в проде: `@/shared/...`, без `../../../`.
- **Фокус обучения:** TS `paths` + Vite `resolve.alias` должны совпадать.
- **Референс:** `.reference/vite.config.ts` (`@/` → `src`), `.reference/tsconfig.json` `paths`.
- **Файлы:** изменить
  - `vite.config.ts`
  - `tsconfig.app.json` (у тебя project references — paths обычно сюда, не только в корневой `tsconfig.json`)
- **Подсказки реализации:**
  1. Vite:
     ```ts
     import path from 'node:path'
     import { fileURLToPath, URL } from 'node:url'
     import vue from '@vitejs/plugin-vue'
     import { defineConfig } from 'vite'

     export default defineConfig({
       plugins: [vue()],
       resolve: {
         alias: {
           '@': fileURLToPath(new URL('./src', import.meta.url)),
           // или: '@': path.resolve(__dirname, 'src'),
         },
       },
       server: { port: 5555 }, // у тебя уже 5555 — оставь как есть
     })
     ```
  2. `tsconfig.app.json` → `compilerOptions`:
     ```json
     "baseUrl": ".",
     "paths": {
       "@/*": ["./src/*"]
     }
     ```
     Убедись, что `baseUrl` относительно файла tsconfig: часто пишут `"baseUrl": "."` при `"paths": { "@/*": ["src/*"] }` если tsconfig в корне — проверь, что IDE резолвит `@/app`.
  3. В `main.ts` импорт только `@/app`, без относительного пути к App.
- **Критерий готовности:** dev + `npm run ts:check` ок; в IDE переход по `@/app` работает.
- **Проверка:** `npm run ts:check` && `npm run lint` && `npm run dev`
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `chore: add @ path alias for src`

## Шаг 4: Учебный слайс `pages/home` + public API

- **Зачем (коротко):** потренировать слайс внутри слоя: `ui` + `index.ts`, страница не торчит файлом наружу.
- **Фокус обучения:** FSD slice (`pages/home`), Vue.
- **Референс:** идея как у `.reference/src/pages/.../ui` + `index.ts` (упрощённо).
- **Файлы:**
  - создать `src/pages/home/ui/HomePage.vue` — перенести сюда разметку заглушки из `App.vue`
  - создать `src/pages/home/index.ts` — `export { HomePage } from './ui/HomePage.vue'` (или default — единообразно)
  - создать `src/pages/index.ts` — реэкспорт `HomePage` (тонкий barrel слоя; можно и без него, если реэкспортируешь только из слайса — тогда импорт `@/pages/home`)
  - изменить `src/app/App.vue` — только подключить страницу:
    ```vue
    <script setup lang="ts">
    import { HomePage } from '@/pages/home'
    </script>

    <template>
      <HomePage />
    </template>
    ```
- **Подсказки реализации:**
  1. Импорт **только** `@/pages/home`, не `@/pages/home/ui/HomePage.vue`.
  2. Внутри слайса относительные импорты `./ui/...` в его `index.ts` — норма.
  3. `widgets` / `features` / `entities` / `shared` пока пустые — ок.
- **Критерий готовности:** UI тот же; в DevTools/коде видно `HomePage` из pages.
- **Проверка:** `npm run ts:check` && `npm run lint` && `npm run dev`
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `feat: add home page slice under pages`

## Шаг 5 (опционально): короткая заметка в wiki учебного проекта

- **Зачем:** зафиксировать принятую структуру FSD для v2.
- **Файлы:** создать `.ai/knowledge/wiki/frontend/fsd-structure.md` — 10–15 строк: список слоёв, правило public API, алиас `@/`, отличие от референса (пока без router/pinia).
- **Критерий готовности:** файл есть; можно открыть без чата.
- **Проверка:** глазами.
- **Кто пишет код:** ты (или попроси агента написать текст wiki)
- **Коммит после шага:** да  
  Ориентир: `docs: note FSD layout for learning app`

---

## Что не делаем в LEARN-002

- Pinia / Vue Router → **LEARN-003**
- WUI theme → **LEARN-004**
- eslint `boundaries` / запрет deep-imports через плагин — по желанию позже
- Реальные widgets/entities

## После LEARN-002

`ревью` / `готово` → `старт LEARN-003-pinia-router-shell`
