# Кейс: WUI-5293 — Перемещение бродкаст-групп влево/вправо

## Описание текущей части кейса

В edit оператор двигает группу по слотам раскладки стрелками **влево/вправо**. Порядок ячеек — слева направо: `0..3` или `0..7`. Сосед пустой → переезд; сосед занят → swap содержимого. Backend swap API нет — два `PUT groups/{index}`.

## Контекст предыдущих частей

- `implementation_plan_1.md` — UI сетки, карточки, audio, VAD.
- `implementation_plan_2.md` — REST `groupsLayout` (шаги 1–3; шаг 4 layout tests/wiki — отдельно).

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/broadcast-groups.md`
- `.ai/knowledge/raw/jira/WUI-5293-pinned-calls-openapi-excerpt.json`

# План реализации: move left/right (+ swap)

## Шаг 1: Store `swapGroups(fromIndex, toIndex)`

- **Описание:**
  - Обмен полным payload двух index (`micState`, `volumeState`, `members`). Нет группы → empty payload (members `[]` + дефолтные mic/volumeState).
  - Оба empty → no-op.
  - Последовательно два `PUT`; runtime `groupPlaybackVolumeByIndex` тоже менять местами.
  - Ошибка → `error` + throw.
- **Файлы:** `use-pinned-calls-panel-store.ts`
- **Ожидаемый результат:** `swapGroups(0, 1)` меняет содержимое соседних слотов.
- **Проверка:** `vue-tsc`
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 2: Меню «Переместить влево/вправо»

- **Описание:**
  - В edit, меню заполненной ячейки (есть members): пункты с иконками стрелок — **«Переместить влево»** / **«Переместить вправо»**.
  - Target: `index - 1` / `index + 1` в пределах `0..layoutCount-1` (effective `groupsLayout`).
  - Край: влево у `0` / вправо у последнего — **disabled** (или скрыть; по умолчанию **disabled**, чтобы пункты всегда на месте).
  - С пустой ячейки (`+`) пункты перемещения **не** показываем.
  - Клик → `swapGroups(current, neighbor)` + close; ошибка → notification.
  - `layoutCount` брать из store `groupsLayout` (или проп из layout composable).
- **Файлы:** `use-broadcast-groups-panel-actions.ts` (+ проброс layout при необходимости)
- **Ожидаемый результат:** Группа на index 2 → влево → swap/move с index 1; визуальный порядок слева направо сохраняется.
- **Проверка:** ручной сценарий; `vue-tsc`
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 3: Тесты + wiki (точечно)

- **Описание:** Unit на `swapGroups` (обмен / empty neighbor = move / no-op / volume map). Wiki: move left/right = swap с соседом по index.
- **Файлы:** тест store; `broadcast-groups.md`, `log.md`
- **Ожидаемый результат:** Покрытие + правило в wiki
- **Проверка:** vitest
- **Коммит после шага:** Да
- **Wiki:** Да

## Out of scope

- Список «поменять с группой №N».
- Drag-and-drop.
- Перемещение вне edit.
- Переключение на backend `groups/reorder` — отдельным шагом после появления API (сейчас dual PUT + пометка в wiki).
