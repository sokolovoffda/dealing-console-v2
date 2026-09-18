# LEARN-004 — WUI theme + первая кнопка

## Часть плана

Один крупный шаг: поставить UI Kit, поднять тему, показать `WuiBtn` на Home. Без i18n и без копирования всего theme-pipeline референса.

---

## Шаг 1: `@wui/common-library` + тема + кнопка на Home

- **Зачем:** дальше все экраны пульта строятся на WUI; сейчас закрепляем подключение и токены.
- **Фокус обучения:** Vue (SFC + UI Kit), FSD (`app` styles / bootstrap), токены вместо raw hex.
- **Референс:**
  - `.reference/src/main.ts` — `bootstrapStyles`
  - `.reference/src/app/assets/styles/index.css` — упростить
  - `.reference/vite.config.ts` — плагин Tailwind
  - `.reference/src/shared/ui/my-btn/MyBtn.vue` — пример `WuiBtn` (не обязательно делать обёртку MyBtn)
- **Файлы / действия:**
  1. Установить зависимости (нужен рабочий `.npmrc` с registry `@wui`):
     ```bash
     npm install @wui/common-library@2.1.0-alpha.26
     npm install -D tailwindcss @tailwindcss/vite
     ```
     Если alpha.26 не ставится — возьми ближайшую доступную 2.x из registry и зафиксируй в `package.json`.
  2. `vite.config.ts` — добавить `tailwindcss()` в `plugins` (как в референсе).
  3. Стили приложения — минимальный вход, например `src/app/assets/styles/index.css` (или обновить корневой `src/style.css`, но лучше сразу в `app`):
     ```css
     @import 'tailwindcss';
     @import '@wui/common-library/foundation.css';
     @import '@wui/common-library/palette.css';
     /* локальные theme css из референса — только если без них bootstrapStyles не даёт нормальный вид;
        начни с минимума из пакета; при необходимости скопируй/упрости light/lsDark куски из
        .reference/src/app/assets/styles/ — с пометкой источника */
     ```
  4. `main.ts` — монтировать приложение **после** `bootstrapStyles` (как в референсе):
     ```ts
     import { bootstrapStyles } from '@wui/common-library'
     import { createPinia } from 'pinia'
     import { createApp } from 'vue'
     import { App } from '@/app'
     import { router } from '@/app/router'
     import '@/app/assets/styles/index.css' // путь как у тебя получится

     bootstrapStyles({ theme: 'lsDark-1' }).then(() => {
       createApp(App).use(createPinia()).use(router).mount('#app')
     })
     ```
  5. На `HomePage` (или в `App` nav) — одна кнопка:
     ```vue
     <script setup lang="ts">
     import { WuiBtn } from '@wui/common-library'
     // ...
     </script>

     <template>
       <!-- ... -->
       <WuiBtn prepend-icon="plus">Добавить</WuiBtn>
       <!-- или текст без иконки; класс с токеном, например text-wrkspc-main-cblock-txt-def на заголовке -->
     </template>
     ```
  6. Заголовок/текст — класс на токене `wrkspc-*` / `text-wrkspc-...` из референса, **не** `#fff` руками.
- **Подсказки:**
  1. Если `bootstrapStyles` ругается на отсутствующую тему — смотри, какие CSS/data-атрибуты ждёт пакет; в референсе рядом `lsDark-1.css`, `theme.css`. Учебный минимум: скопировать из `.reference/src/app/assets/styles/` только нужные файлы и указать источник в комментарии/`case`.
  2. Обёртку `MyBtn` не делай, пока нет повторов — достаточно прямого `WuiBtn`.
  3. i18n / `vue-i18n` не подключай.
  4. После установки: `npm run ts:check` && `npm run lint` && `npm run dev` — кнопка видна в теме пульта.
- **Критерий готовности:** Home в тёмной теме WUI; есть кликабельная `WuiBtn` с русским текстом; заголовок через токен, не raw hex.
- **Проверка:** `npm run ts:check` && `npm run lint` && визуально в браузере.
- **Кто пишет код:** ты
- **Коммит после шага:** да  
  Ориентир: `feat: connect @wui/common-library theme and WuiBtn`

---

## Шаг 2 (по желанию в том же LEARN): wiki

- **Зачем:** зафиксировать, как в v2 поднимаем WUI (отличия от полного референса).
- **Файлы:** `.ai/knowledge/wiki/frontend/wui-theme.md` + строка в `index.md` / запись в `log.md`.
- **Критерий:** 10–20 строк: пакет, `bootstrapStyles`, tailwind plugin, без i18n, откуда CSS.
- **Кто пишет код:** ты или агент по просьбе
- **Коммит:** можно вместе с шагом 1 или отдельно

---

## Что не делаем

- `@wui/jssip` / SIP → **LEARN-008+**
- Auth / стенд → **LEARN-005/006**
- Полный копипаст всех theme css и generate-theme scripts — только если без этого не взлетает

## После LEARN-004

Фаза F0 закрыта → `старт LEARN-005-stand-config` (или укрупнённый LEARN на config+auth, если захочешь склеить — скажи).
