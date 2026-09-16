# Кейс: WUI-5293 — REST persist раскладки бродкаст-групп (`groupsLayout`)

## Описание текущей части кейса

Backend добавил `groupsLayout: 4 | 8 | null` и `PUT .../groups/layout`. localStorage отключаем. Выбор 4/8 до первой группы — **runtime only**. При создании первой группы фиксируем на API `groupsLayout` и положение группы (`index`). Позиции = `group.index` (свободных координат нет).

## Контекст предыдущих частей

- `implementation_plan_1.md` — UI сетки 4/8, карточки, audio, VAD, localStorage layout.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/broadcast-groups.md`
- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/raw/jira/WUI-5293-pinned-calls-openapi-excerpt.json`

# План реализации: groupsLayout REST (runtime → fix on first group)

## Шаг 1: Типы + API + normalize panel

- **Описание:** `groupsLayout: 4 | 8 | null` в DTO/domain panel; body `PinnedCallsGroupsLayoutBody`; API `updatePinnedCallsGroupsLayout`; normalize валидирует `4|8|null` (иначе `null`).
- **Файлы:** `types.ts`, `normalizers.ts`, `use-pinned-calls-api.ts`
- **Ожидаемый результат:** GET panel отдаёт layout; PUT layout доступен.
- **Проверка:** `vue-tsc` / unit normalize
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 2: Store — runtime layout + commit при первой группе

- **Описание:**
  - Из panel: `persistedGroupsLayout` (`groupsLayout` с API, может быть `null`).
  - Runtime: `draftGroupsLayout` (выбор 4/8 до фиксации) — **не** в localStorage.
  - Effective UI layout: `persistedGroupsLayout ?? draftGroupsLayout`.
  - `setDraftGroupsLayout(4|8)` / `clearDraftGroupsLayout()` — только память; без PUT.
  - При **первом** успешном создании группы с members (типично `addGroupMember`, когда до этого ни у одной группы не было members **и** layout ещё не persisted): сначала `PUT groupsLayout` с текущим effective layout, затем member/group write; после ответа panel — `persistedGroupsLayout` заполнен, draft можно сбросить.
  - Если layout уже persisted — обычные group/member API без повторного PUT layout (кроме явной смены раскладки, если ещё разрешена продуктом при пустых группах).
  - `409` на PUT layout — не ломать member add молча: вернуть ошибку / store.error.
- **Файлы:** `use-pinned-calls-panel-store.ts`
- **Ожидаемый результат:** Reload до первой группы → empty; после первой группы → layout с API.
- **Проверка:** `vue-tsc`; ручной сценарий ниже на шаге 3
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 3: Broadcast UI — убрать localStorage, связать со store

- **Описание:** `use-broadcast-groups-layout` / actions читают effective layout из store; выбор 4/8 → draft; «Сменить раскладку» при отсутствии members → clear draft (+ clear persisted через PUT `null`, если уже было зафиксировано и backend позволяет). Удалить persist helpers localStorage (`read/write/clear` + storage key) или оставить только типы `4|8` без storage. Тесты layout обновить.
- **Файлы:** `broadcast-groups-layout.ts`, `use-broadcast-groups-layout.ts`, `use-broadcast-groups-panel-actions.ts`, `*.test.ts`
- **Ожидаемый результат:** Нет зависимости от localStorage; UX empty/edit прежний.
- **Проверка:** empty → выбрать 4 → reload → empty; выбрать 4 → добавить первого member → reload → layout 4 и группа на месте; 8→4 только без members.
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 4: Тесты + wiki

- **Описание:** Unit: normalize; commit layout on first member; draft vs persisted. Wiki `broadcast-groups.md`: runtime до первой группы, fix на API, без localStorage, 409.
- **Файлы:** тесты, `.ai/knowledge/wiki/**`
- **Ожидаемый результат:** Документированное правило + покрытие
- **Проверка:** vitest
- **Коммит после шага:** Да
- **Wiki:** Да

## Out of scope

- Миграция из localStorage.
- Свободные координаты групп на сетке.
- Админские `/users/{userId}/...`.
