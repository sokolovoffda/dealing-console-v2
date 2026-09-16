# Кейс: WUI-5293 — Переключение `swapGroups` на `PUT groups/reorder`

## Описание текущей части кейса

Backend добавил атомарный endpoint по аналогии со `slots/reorder`:

- `PUT /api/v1/me/pinned-calls/groups/reorder`
- Body: `{ fromIndex, toIndex }` (0..7)
- Swap **содержимого** двух групп (`micState`, `volumeState`, `members`); индексы на месте
- Ответ: полный `PinnedCallsPanelDto`

Сейчас UI move left/right уже зовёт `swapGroups`, но store делает два `PUT /groups/{index}`. Нужно заменить dual-PUT на один reorder, сохранив UX и runtime volume map.

## Контекст предыдущих частей

- `implementation_plan_1.md` — UI сетки, карточки, audio, VAD
- `implementation_plan_2.md` — REST `groupsLayout`
- `implementation_plan_3.md` — move left/right + временный dual-PUT `swapGroups`

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/broadcast-groups.md`
- `.ai/knowledge/raw/jira/WUI-5293-groups-reorder-endpoint.md`
- `.ai/knowledge/raw/jira/WUI-5293-pinned-calls-openapi-excerpt.json`

# План реализации: groups/reorder

## Шаг 1: Types + API + body helper

- **Описание:**
  - Тип `PinnedCallGroupsReorderBody = { fromIndex: number; toIndex: number }`.
  - API `reorderPinnedCallGroups(payload)` → `PUT .../groups/reorder`, ответ `PinnedCallPanelDto`.
  - Helper `toPinnedCallGroupsReorderBody(fromIndex, toIndex)` по аналогии со `toPinnedCallSlotsReorderBody`.
  - Экспорт через public API entity (`index.ts` / уже существующие реэкспорты типов/API, если принято).
- **Файлы для изменений:**
  - `src/entities/pinned-calls/model/types.ts`
  - `src/entities/pinned-calls/model/normalizers.ts`
  - `src/entities/pinned-calls/api/use-pinned-calls-api.ts`
  - при необходимости `src/entities/pinned-calls/index.ts`
- **Ожидаемый результат:** клиент умеет вызвать reorder без изменения store.
- **Проверка:** `npm run ts:check`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: `swapGroups` → один `reorder` + `setPanel`

- **Описание:**
  - В `swapGroups` убрать dual `updatePinnedCallGroup`.
  - Оставить early no-op: `fromIndex === toIndex`, невалидные index, оба payload равны (как сейчас — без лишнего запроса).
  - Успех: `reorderPinnedCallGroups(toPinnedCallGroupsReorderBody(...))` → `normalizePinnedCallPanel` → `setPanel(nextPanel)`.
  - Runtime: по-прежнему swap `groupPlaybackVolumeByIndex` (в DTO нет).
  - Сигнатура `swapGroups(fromIndex, toIndex)` и вызов из menu actions **не менять** (минимальный diff UI).
  - Комментарий в store: dual-PUT удалён, путь = `groups/reorder`.
- **Файлы для изменений:**
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- **Ожидаемый результат:** move left/right = один атомарный PUT; panel state из ответа.
- **Проверка:** ручной сценарий (соседи empty/occupied) + `npm run ts:check`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Тесты + wiki

- **Описание:**
  - Обновить `swap-groups.test.ts`: мок `reorderPinnedCallGroups` вместо двух `updatePinnedCallGroup`; assert один вызов body `{ fromIndex, toIndex }`; assert panel groups после ответа; volume map swap сохранить.
  - Wiki `broadcast-groups.md`: убрать «временно dual-PUT»; зафиксировать контракт `groups/reorder` + `fromIndex`/`toIndex`.
  - Закрыть open question про контракт reorder; запись в `log.md`.
- **Файлы для изменений:**
  - `src/entities/pinned-calls/model/swap-groups.test.ts`
  - `.ai/knowledge/wiki/domain/broadcast-groups.md`
  - `.ai/knowledge/wiki/product/open-questions.md` (если пункт ещё есть)
  - `.ai/knowledge/wiki/log.md`
- **Ожидаемый результат:** тесты зелёные; wiki отражает актуальный API.
- **Проверка:** `npx vitest run src/entities/pinned-calls/model/swap-groups.test.ts`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `broadcast-groups.md`, `log.md`

## Out of scope

- Менять UX меню left/right.
- Mirror path `/users/{userId}/...` на фронте (используем только `/me`, как у slots).
- Drag-and-drop / список «поменять с группой №N».
- OpenAPI excerpt в raw — обновить только если появится выгрузка; сейчас достаточно raw-заметки от backend.
