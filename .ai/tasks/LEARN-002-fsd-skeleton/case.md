# LEARN-002 — FSD skeleton

## Исходная задача

Разложить `src/` по Feature-Sliced Design: слои `app` → `pages` → `widgets` → `features` → `entities` → `shared`, публичные API через `index.ts`, алиас `@/`. Без Pinia, Router и WUI (это LEARN-003/004).

## Уточнения пользователя

- Scaffold руками для максимума обучения (LEARN-000).
- Импорты наружу слайса — только через public API; относительные импорты «сквозь слои» запрещены (как в правилах проекта).
- Код пишет разработчик; агент — план/ревью.

## Ограничения

- Не подключать pinia, vue-router, `@wui/*` в этом LEARN.
- Не копировать бизнес-код из `.reference/src`.
- Не добавлять eslint-plugin-boundaries, если не попросишь отдельно (можно упомянуть как опцию).
- Минимальный diff: заглушка UI может остаться той же по смыслу.

## Связанные материалы

- LEARN-000 фаза F0: `.ai/tasks/LEARN-000-app-roadmap/implementation_plan_1.md`
- LEARN-001: выполнен (Vite + stub + lint/ts:check)
- Структура слоёв в референсе: `.reference/src/{app,pages,widgets,features,entities,shared}`
- Алиас в референсе: `@/` → `src/` (vite + tsconfig)
