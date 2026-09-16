# Кейс: WUI-5185 — WidgetViewport для сетки завешенных

## Описание текущей части кейса

Заменить CSS-порог `minmax(520px)` на явный контекст ширины виджета (`WidgetViewport`). В рамках p2 подключаем **только панель завешенных**; инфраструктура в `entities/workspace` переиспользуется позже (ПБВ и др.).

## Уточнение по колонкам (2026-07-20)

| Viewport | Где | Колонок в сетке завешенных |
|----------|-----|----------------------------|
| `monopoly` | `/monopoly/pinnedCalls` | 3 |
| `two-thirds` | колонка 2/3 workspace | 2 |
| `half` | колонка 1/2 (`two-equal`) | 2 (уже, чем 2/3) |
| `one-third` | колонка 1/3 workspace | 1 |

## Контекст предыдущих частей

- `implementation_plan_1.md` — REST API, store, сетка 15.
- `implementation_plan_2.md` — UI карточки, сессии, call card, footer.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/pinned-calls.md`

# План реализации: WidgetViewport (только завешенные)

## Шаг 1: Инфраструктура `entities/workspace`

- **Описание:** Тип `WidgetViewport`, `resolveWidgetViewport(layout, position)`, `provideWidgetViewport` / `useWidgetViewport`, компонент `WidgetViewportProvider`, unit-тесты resolver.
- **Файлы:** `src/entities/workspace/model/widget-viewport.ts`, `use-widget-viewport.ts`, `widget-viewport.test.ts`, `ui/WidgetViewportProvider.vue`, `index.ts`.
- **Ожидаемый результат:** Public API entity; default inject → `monopoly`.
- **Проверка:** `npm run test -- widget-viewport`
- **Коммит после шага:** Да
- **Wiki:** Нет (подключим при миграции других виджетов)

## Шаг 2: Доставка viewport в pinned panel

- **Описание:** `PinnedCallsPage` — provide `monopoly`. `WorkspacePage` — `WidgetViewportProvider` на каждой ячейке с виджетом. Composable `usePinnedCallsGridColumns` в widget slice.
- **Файлы:** `PinnedCallsPage.vue`, `WorkspacePage.vue`, `use-pinned-calls-grid-columns.ts`, `PinnedCallsPanel.vue`.
- **Ожидаемый результат:** Сетка `repeat(N, minmax(0, 1fr))` по viewport; без `auto-fill` / 520px.
- **Проверка:** `vue-tsc --noEmit`; ручной просмотр monopoly / workspace layouts.
- **Коммит после шага:** Да
- **Wiki:** Обновить `pinned-calls.md` — кратко про WidgetViewport.

## Out of scope (p2)

- Миграция ПБВ, истории и других виджетов на `WidgetViewport`.
- Глобальный singleton viewport в store.
