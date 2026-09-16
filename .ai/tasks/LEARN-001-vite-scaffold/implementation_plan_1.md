# LEARN-001 — Vite scaffold

## Часть плана

Поднятие чистого Vue 3 + TS + Vite в корне репозитория. Без FSD, Pinia, Router, WUI — они в LEARN-002…004.

## Шаг 1: Создать Vite Vue-TS проект в корне

- **Зачем (коротко):** получить рабочий `package.json`, `vite.config`, `tsconfig`, точку входа.
- **Фокус обучения:** TS, tooling (как устроен Vite + Vue SFC).
- **Референс:** версии ориентировочно из `.reference/package.json` (vue/vite/typescript); структуру референса не копировать.
- **Файлы:** создать в корне (через `npm create vite@latest` с шаблоном `vue-ts` **в текущую папку** или ручное создание тех же файлов):
  - `package.json` — `name`: `dealing-console-v2`, `"type": "module"`
  - `vite.config.ts`
  - `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` (как выдаст шаблон — ок)
  - `index.html`
  - `src/main.ts`, `src/App.vue`, `src/vite-env.d.ts` (или `env.d.ts`)
  - `.gitignore` (если ещё нет) — `node_modules`, `dist`, `.env.local` и т.п.
- **Подсказки реализации:**
  1. В корне уже есть `.ai/`, `.reference/`, `AGENTS.md`, `.npmrc` — шаблон не должен их затереть. Удобный вариант:
     ```bash
     npm create vite@latest . -- --template vue-ts
     ```
     Если CLI ругается на непустую папку — создай файлы вручную по шаблону Vite Vue-TS или во временной папке и аккуратно перенеси только нужное.
  2. После создания: `npm install`.
  3. Dev-порт: поставь `5558` в `vite.config.ts` (`server.port`), как в референсе — привычнее для стенда позже.
     ```ts
     import { defineConfig } from 'vite'
     import vue from '@vitejs/plugin-vue'

     export default defineConfig({
       plugins: [vue()],
       server: { port: 5558 },
     })
     ```
  4. Пока **не** ставь `@wui/*`, pinia, vue-router, tailwind — следующие LEARN.
- **Критерий готовности:** `npm run dev` открывается, видна дефолтная страница Vite/Vue.
- **Проверка:** `npm run dev` → http://localhost:5558
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Сообщение ориентир: `chore: scaffold Vite Vue 3 + TypeScript`

## Шаг 2: Учебная заглушка вместо демо Vite

- **Зачем (коротко):** убрать шум шаблона; сразу русский UI без i18n.
- **Фокус обучения:** Vue 3 `<script setup>`, один корневой компонент.
- **Референс:** нет (учебная заглушка).
- **Файлы:** изменить
  - `src/App.vue` — простой экран: заголовок «Dealing Console v2», подзаголовок «учебный scaffold»
  - удалить лишнее шаблона: `src/components/HelloWorld.vue`, дефолтные svg/assets логотипы Vite, если мешают
  - `src/main.ts` — только `createApp(App).mount('#app')`
- **Подсказки реализации:**
  1. `App.vue` roughly:
     ```vue
     <script setup lang="ts">
     // пока без props/store
     </script>

     <template>
       <main>
         <h1>Dealing Console v2</h1>
         <p>Учебный scaffold. FSD и интеграции — в следующих LEARN.</p>
       </main>
     </template>
     ```
  2. Стили минимальные (можно scoped); не подключай WUI.
  3. `index.html` title: `Dealing Console v2`.
- **Критерий готовности:** в браузере русский текст заглушки, нет логотипов Vite/Vue из шаблона.
- **Проверка:** `npm run dev`, визуально.
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `chore: replace Vite demo with Russian stub screen`

## Шаг 3: Скрипты проверки — `ts:check` и минимальный `lint`

- **Зачем (коротко):** привычный контур проверки, как будем гонять после каждого шага.
- **Фокус обучения:** TS (`vue-tsc`), базовый ESLint для Vue/TS.
- **Референс:** скрипты `ts:check` / `lint` в `.reference/package.json` — упростить.
- **Файлы:**
  - `package.json` — scripts:
    - `"dev": "vite"`
    - `"build": "vue-tsc --noEmit && vite build"`
    - `"ts:check": "vue-tsc --noEmit"`
    - `"lint": "eslint ."` (или `eslint src --ext .ts,.vue` — как настроишь)
  - установить devDeps при необходимости: `vue-tsc`, `eslint`, `typescript-eslint` / `@typescript-eslint/*`, `eslint-plugin-vue` (версии согласовать с Vue 3 + ESLint 9 flat config **или** ESLint 8 + legacy — на выбор; проще начать с того, что предлагает актуальный `create vite` / docs)
  - `eslint.config.js` (flat) **или** `.eslintrc.cjs` — один рабочий вариант
- **Подсказки реализации:**
  1. Не тащи `eslint-plugin-boundaries` и FSD-правила импортов — это после LEARN-002.
  2. `npm run ts:check` и `npm run lint` должны проходить на заглушке.
  3. Если ESLint ругается на `vite.config.ts` — добавь в ignore или отдельный overrides.
- **Критерий готовности:** обе команды завершаются с кодом 0.
- **Проверка:** `npm run ts:check` && `npm run lint`
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `chore: add ts:check and eslint scripts`

## Шаг 4 (опционально в том же LEARN): README для запуска

- **Зачем (коротко):** как поднять проект локально.
- **Фокус обучения:** — (документация)
- **Файлы:** создать `README.md` в корне — 5–10 строк: `npm install`, `npm run dev`, порт 5558, что это учебный клон.
- **Критерий готовности:** по README можно запустить без чтения чата.
- **Проверка:** глазами.
- **Кто пишет код:** ты
- **Коммит после шага:** да (можно объединить с шагом 3, если хочешь меньше коммитов)  
  Ориентир: `docs: add short README for local run`

---

## Что сознательно не делаем в LEARN-001

- Слои FSD и алиас `@/` → **LEARN-002**
- Pinia / Vue Router → **LEARN-003**
- `@wui/common-library` → **LEARN-004**
- Proxy на RTU/APS → **LEARN-005+**

## После завершения LEARN-001

Напиши `готово` / попроси `ревью` → затем `старт LEARN-002-fsd-skeleton`.
