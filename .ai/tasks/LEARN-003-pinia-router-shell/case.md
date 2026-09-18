# LEARN-003 — Pinia + Vue Router shell

## Исходная задача

Подключить Pinia и Vue Router к учебному приложению: навигация на `/`, `App` через `<router-view>`, один учебный store. Без auth guards, WUI и стенда (это LEARN-004+).

## Уточнения пользователя

- Код в основном пишет разработчик.
- Планы **крупнее**, меньше дробления на микрошаги (уточнение 2026-09-18).
- i18n не подключаем.

## Ограничения

- Не копировать сложный router из `.reference` (settings children, monopoly, guards).
- Не ставить `@wui/*` здесь.
- Auth / beforeEach с токеном — LEARN-006.
- Один шаг плана ≈ один коммит, но шаг может закрывать целый кусок фичи.

## Связанные материалы

- LEARN-000 F0: LEARN-003 в таблице
- Референс: `.reference/src/main.ts` (`.use(createPinia()).use(router)`), `.reference/src/app/router/index.ts` (упростить до 1–2 роутов)
- Текущее: `src/app/App.vue` рендерит `HomePage` напрямую
