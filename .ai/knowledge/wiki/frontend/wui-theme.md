# WUI theme в учебном приложении

## Назначение

Как в dealing-console-v2 поднимаем `@wui/common-library` после LEARN-004.

## Текущая схема

1. Зависимость: `@wui/common-library` `^2.1.0-alpha.26` (registry `@wui` через корневой `.npmrc`).
2. Tailwind 4: `tailwindcss` + плагин `@tailwindcss/vite` в `vite.config.ts`.
3. Стили входа: `src/app/assets/styles/index.css`
   - `@import 'tailwindcss'`
   - `@import '@wui/common-library/foundation.css'`
   - `@import '@wui/common-library/palette.css'`
   - базовые `html` / `body` / `#app` (шрифт Inter, `background-color: var(--color-bg-base-bg1)`).
4. Старт приложения в `src/main.ts`: сначала `bootstrapStyles({ theme: 'lsDark-1' })`, затем `createApp` + Pinia + Router + `mount`.
5. Пример UI: на `HomePage` — `WuiBtn` (`icon`, `prepend-icon`, `variant="brand"`, `state="tonal"`). Тексты в коде на русском, **без** vue-i18n.

## Правила для UI

- Компоненты брать из `@wui/common-library` (`WuiBtn`, иконки через `prepend-icon` / `WuiIcon`).
- Цвета и текст — токены / utility на токенах (`wrkspc-*`, `color-*` из палитры), не raw hex, если токен есть.
- Обёртки вроде `MyBtn` из референса не копировать, пока нет повторов.

## Отличия от референса

- Нет полного набора локальных theme CSS (`theme.css`, `lsDark-1.css`, `generate:theme` script) — учебный минимум через пакет + `bootstrapStyles`.
- Нет `@wui/im`, `@wui/jssip`, turret-lib.
- Нет i18n.

Если визуал темы «пустой» или не хватает токенов — точечно добавить CSS из `.reference/src/app/assets/styles/` с пометкой источника, не копировать весь pipeline.

## Источники

- `.ai/tasks/LEARN-004-wui-theme/`
- `src/main.ts`, `src/app/assets/styles/index.css`, `src/pages/home/ui/HomePage.vue`
- Ориентир: `.reference/src/main.ts`, `.reference/src/app/assets/styles/index.css`
