# WUI theme в учебном приложении

## Назначение

Как в dealing-console-v2 поднимаем `@wui/common-library` и пультовые CSS-токены.

## Текущая схема

1. Зависимость: `@wui/common-library` `^2.1.0-alpha.26` (registry `@wui` через корневой `.npmrc`).
2. Tailwind 4: `tailwindcss` + плагин `@tailwindcss/vite` в `vite.config.ts`.
3. Стили входа: `src/app/assets/styles/index.css`
   - `@import 'tailwindcss'`
   - `@import '@wui/common-library/foundation.css'`
   - `@import '@wui/common-library/palette.css'`
   - локальные пультовые файлы (из `.reference/src/app/assets/styles/`):
     - `theme.css` (auto-generated mapping `@theme` → `--app-color-*`)
     - `light-1.css`, `lsDark-1.css`
     - `tokens.css` (временные card-deal и др.)
     - `table.css`
   - базовые `html` / `body` / `#app`.
4. Старт: `bootstrapStyles({ theme: 'lsDark-1' })` в `main.ts`, затем Pinia + Router + `mount`.
5. IDE: расширение Tailwind CSS IntelliSense, `tailwindCSS.experimental.configFile` → этот `index.css`, `editor.quickSuggestions.strings: true`.

## Правила для UI

- Компоненты из `@wui/common-library`.
- Цвета/текст — токены (`wrkspc-*`, `text-*` / `bg-*` из `@theme`), не raw hex.
- `turret-lib` и полный `generate:theme` pipeline пока не подключены: `theme.css` скопирован готовым из референса.

## Отличия от референса

- Нет `@rtu-turret-system/turret-lib/style.css`.
- Нет скрипта `npm run generate:theme` (при обновлении токенов в референсе — переснять CSS или позже добавить генератор).
- Нет i18n.

## Источники

- `.reference/src/app/assets/styles/`
- `src/main.ts`, `src/app/assets/styles/index.css`
- Уточнение пользователя от 2026-09-18 (подключить пультовые токены)
