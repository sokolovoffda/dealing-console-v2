# Кейс: WUI-4448-design — приведение snapshots рабочих столов к макетам Figma

## Описание текущей части кейса

Привести UI рабочих столов к макетам Figma и сценарию view/edit mode: пустое состояние, визуальный picker раскладки, сетка в edit mode, **локальное shared context menu** (slot + позиционирование от activator) с действиями над виджетами. Backend/API snapshots из `WUI-4448-p2` не меняем по контракту. `@wui/common-library` — `2.0.0`.

## Контекст предыдущих частей

- `WUI-4448` — каркас workspace/monopoly routes, registry виджетов.
- `WUI-4448-p2` — snapshots API, store, базовое добавление/удаление виджетов, draft slots.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/frontend/stores.md`
- `.ai/knowledge/wiki/frontend/routing.md`
- `.ai/knowledge/wiki/frontend/components.md`
- `.ai/knowledge/wiki/backend-integration/api-routing.md`

# План реализации: UI рабочих столов по макетам

## Шаг 0 (подготовка): Зафиксировать `@wui/common-library@2.0.0`

- **Описание:** Откатить зависимость с `2.1.0-alpha.1` на `2.0.0`, обновить lockfile. Убедиться, что `dist/types/index.d.ts` содержит экспорты (`WuiIcon`, `WuiList`, `Direction` и т.д.) и `npm run ts:check` не падает из‑за пустых типов либы.
- **Файлы для изменений:** `package.json`, `package-lock.json`.
- **Ожидаемый результат:** Стабильные типы common-library; можно работать над UI без массовых `TS2305`.
- **Проверка:** `npm ci`, `npm run ts:check` (ожидаемо без ошибок типов либы).
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 1: View/edit mode и пустые состояния WorkspacePage

- **Описание:** Подключить `isWorkspaceEditMode` к `WorkspacePage`. Реализовать два режима:
  - **view mode:** виджеты интерактивны как обычно; если виджетов нет — центрированная надпись с иконкой (клик → edit mode + подсветка toggle в header); если виджеты есть — только виджеты, без сетки редактирования.
  - **edit mode:** если виджетов нет и layout не выбран — показать picker (шаг 2); если layout выбран — сетка редактирования (шаг 3). Убрать постоянный header `wui-select`. Убрать крестик удаления. Inline `<ul>` для меню пока можно оставить — заменится на шаге 4.
- **Файлы для изменений:** `src/pages/main/ui/workspace/WorkspacePage.vue`, при необходимости новые компоненты в `src/pages/main/ui/workspace/`.
- **Ожидаемый результат:** Страница различает view/edit; пустой стол без виджетов ведёт себя по сценарию из кейса.
- **Проверка:** `npm run ts:check`, targeted lint, ручная проверка toggle и пустого состояния.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 2: Визуальный picker раскладки (4 варианта)

- **Описание:** Заменить `wui-select` визуальным picker по макету `115-22699`: 4 layout (`two-equal`, `two-left-narrow`, `two-right-narrow`, `three-equal`). Picker в edit mode, пока на столе нет виджетов. Выбор → `setWorkspaceLayout` без backend save до первого widget. После выбора — пустая сетка по макету `115-22748`. Стили — design tokens.
- **Файлы для изменений:** `src/pages/main/ui/workspace/` (`WorkspaceLayoutPicker.vue` или аналог), `WorkspacePage.vue`.
- **Ожидаемый результат:** Раскладка выбирается кликом по превью.
- **Проверка:** `npm run ts:check`, targeted lint, ручная проверка draft workspace.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 3: Сетка edit mode — my-btn и токены для пустых ячеек

- **Описание:** В edit mode пустые колонки — `my-btn` + `plusAddM` с токенами (`border-card-deal-border-state-add`, `text-card-deal-add-def`, `rounded-12`). Занятые колонки — виджет без крестика; клик в edit mode откроет меню (шаги 4–5). В view mode сетка и plus-кнопки скрыты. Каждая колонка — отдельный activator для будущего меню.
- **Файлы для изменений:** `WorkspacePage.vue`, возможно `WorkspaceGridCell.vue`.
- **Ожидаемый результат:** Внешний вид пустых ячеек по макету; `wui-btn` для plus заменён на `my-btn`.
- **Проверка:** `npm run ts:check`, targeted lint, ручная проверка edit/view.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 4: Shared ContextMenu + добавление виджета в пустую ячейку

- **Описание:** В `shared/ui` добавить **универсальное** context menu (сразу с public API для переиспользования):
  - **`ContextMenu.vue`** — teleport в `body`, backdrop (click → close), default **slot** для произвольного контента; props: `open`, `activator`, `placement` (настраиваемый: top/bottom/left/right + align, **дефолт `bottom-start`**), опционально `class` на panel.
  - **`useContextMenuPosition`** — вычисление `left/top` от `activator` ref, `clampToViewport`, пересчёт при open/resize/scroll.
  - Стили panel — по макету workspace menu [Figma `115-23241`](https://www.figma.com/design/JTPlAtfAfY1mawkWPsejsY/?node-id=115-23241) (токены, не хардкод).
  - Подключить в `WorkspacePage`: клик на пустую ячейку (`my-btn` / activator = ячейка) → меню со списком доступных widget types (`wui-btn` text в slot). Выбор → `addWorkspaceWidget` + `router.replace` при create из draft.
  - Убрать inline `<ul>` и overlay из `WorkspacePage`.
  - Макет пустой ячейки: `142-34002`.
- **Файлы для изменений:** `src/shared/ui/context-menu/` (`ContextMenu.vue`, `use-context-menu-position.ts`, `index.ts`), `src/shared/ui/index.ts`, `WorkspacePage.vue` (возможно `WorkspaceGridCell.vue`), labels при необходимости.
- **Ожидаемый результат:** Generic context menu в shared; workspace использует его для add-widget; меню привязано к кликнутой колонке.
- **Проверка:** `npm run ts:check`, targeted lint, ручная проверка add flow и позиции меню у краёв viewport.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 5: Меню кнопки `setSquareM` — редактировать / удалить рабочий стол

- **Описание:** Изменить поведение кнопки редактирования в `WorkspaceSwitchers`:
  - **Настроенный стол** (есть сохранённый snapshot на бэке, не draft): клик `setSquareM` в **view mode** → `ContextMenu` (activator = кнопка), два пункта:
    - **Редактировать** → `setWorkspaceEditMode(true)`, далее обычный сценарий (picker / сетка / меню ячеек);
    - **Удалить** → `deleteSnapshot` для **текущего** `workspaceId` из route, `router.replace` на `draft-workspace-{order+1}`, `setWorkspaceEditMode(false)`, пустое состояние «Нажмите, чтобы настроить».
  - **Пустой стол** (draft без snapshot): клик `setSquareM` — сразу edit mode, без меню (как клик по empty state).
  - **Edit mode уже активен**: клик `setSquareM` — сразу выход в view (toggle off + существующий сброс layout без виджетов), меню не показывается.
  - Кнопка `setSquareM` в edit mode по-прежнему `:active="isWorkspaceEditMode"`.
- **Файлы для изменений:** `WorkspaceSwitchers.vue`, при необходимости `use-workspace-store.ts` (action-обёртка delete + draft id), тесты header/workspace.
- **Ожидаемый результат:** Удаление рабочего стола целиком через header; вход в edit для настроенного стола — через меню.
- **Проверка:** `npm run ts:check`, targeted lint, ручная проверка delete/re-enter edit на сохранённом snapshot.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 6: Context menu виджета и store actions move/replace

- **Описание:** Расширить использование shared `ContextMenu` для занятой ячейки по макетам `115-23241`, `144-32477` (контент в slot):
  - **Переместить влево / вправо** — swap/move через `position` + `PUT`;
  - **Удалить** — `removeWorkspaceWidget` (удаление **виджета**, не всего стола);
  - **Заменить** — список других widget types на той же позиции;
  - **Сменить раскладку** — только когда виджетов не осталось: открыть layout picker.
  Добавить в store `moveWorkspaceWidget`, `replaceWorkspaceWidget` (или эквивалент без лишних слоёв). Тот же `ContextMenu`, другой набор пунктов в slot.
- **Файлы для изменений:** `use-workspace-store.ts`, `WorkspacePage.vue`, `shared/ui/context-menu` (только если нужны доработки API).
- **Ожидаемый результат:** Полный набор действий из макета; swap влево/вправо для 2- и 3-колоночных layout.
- **Проверка:** `npm run ts:check`, targeted lint, ручная проверка move/replace/delete widget / change layout.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Нет.

## Шаг 7: Финальные автотесты и wiki по рабочим столам

- **Описание:** Тесты: `useContextMenuPosition`, `ContextMenu`, store (move/replace, delete workspace), `WorkspacePage`, `WorkspaceSwitchers` (меню setSquareM). Wiki: view/edit mode, 5 slots, layout rules, header menu, shared `ContextMenu` API. Запуск `npm run test` (точечно), `npm run ts:check`, targeted lint.
- **Файлы для изменений:** тесты в `shared/ui/context-menu`, `entities/workspace`, `pages/main/ui/workspace`, `widgets/app-header`; wiki `stores.md`, `components.md`, `routing.md`, `log.md`.
- **Ожидаемый результат:** Проверки пройдены или проблемы описаны; wiki обновлена по workspace UI и context menu.
- **Проверка:** Команды из описания.
- **Коммит после шага:** Да.
- **Нужно ли обновить project wiki:** Да.
