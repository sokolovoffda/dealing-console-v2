# Frontend Components

## Назначение

Страница фиксирует устойчивые правила использования UI-компонентов и интерактивных элементов во frontend-коде проекта.

## Текущее понимание

Проект использует компоненты `@wui/common-library` как основной UI-kit для кнопок, иконок и интерактивных контролов.

Карточка вызова (WUI-5631): presentational shell — `TurretCallCard` из `@rtu-turret-system/turret-lib`; wiring в dealing через `useTurretCallCardAdapter` + `CallCardWindow`. Стили пакета — `@rtu-turret-system/turret-lib/style.css` (после локальной темы).

### Shared `ContextMenu`

`src/shared/ui/context-menu/` — data-driven context menu для workspace и header:

- `ContextMenu.vue` — teleport в `body`, backdrop (`pointerdown` вне panel → close), список `items[]`;
- `useContextMenu({ items, anchorMode?, activator?, placement? })` — composable: `open(event?)`, `close()`, `menuProps`, `isOpen`;
- `useContextMenuPosition` — позиционирование от activator/cursor, `clampToViewport`, пересчёт на resize/scroll;
- `ContextMenuItem` — `{ label, icon, onClick, border?, iconClass?, dataTest? }`;
- placement по умолчанию: `bottom-start`; для меню ячеек workspace используется `anchorMode: 'cursor'`.

В edit mode `WorkspacePage` блокирует клики по содержимому виджета (`pointer-events-none` на component), чтобы открывалось меню ячейки, а не действия внутри виджета.

### Shared `PanelStatus`

`src/shared/ui/panel-status/PanelStatus.vue` — loader / error stub / content slot:

- `loading` → spinner;
- `message` (+ optional `icon`) → error/empty status overlay (content slot скрыт);
- иначе рендерит `<slot />`.
- При показе `message` (не loader) клик / Enter / Space → emit `retry`; подсказка «Нажмите, чтобы повторить».
- Виджеты на retry делают force-refetch (`fetchPanel(true)`, `refreshWorkspaces`, `refreshGroupContacts`, …).

## Правила и ограничения

- Все элементы, по которым пользователь должен кликать как по кнопке или action control, нужно делать через `wui-btn`.
- Не использовать нативный `<button>` для новых action controls, если тот же сценарий можно выразить через `wui-btn`.
- Не вешать клики напрямую на `wui-icon`, если это действие кнопки. Иконка должна быть передана в `wui-btn` через `prepend-icon`.
- Для иконки-кнопки использовать паттерн:

```vue
<wui-btn
  icon
  text
  :size="48"
  rounded
  prepend-icon="editM"
  @click="handleClick"
/>
```

- Для пустых ячеек сетки workspace в edit mode используется `my-btn` + `plusAddM` (не `wui-btn`).
- Для пунктов shared `ContextMenu` используется нативный `<button>` + `wui-icon` (не `wui-btn`), стили — `context-menu.css` и design tokens.
- Если кнопка находится внутри другого кликабельного контейнера, обработчик должен останавливать всплытие через `@click.stop`, чтобы не запускать действие родительской карточки.
- У `wui-data-table` `autoPerPageByHeight` включен по умолчанию. Если для экрана нужен фиксированный `perPage`, авторасчет нужно отключать явно через `:auto-per-page-by-height="false"`.
- `hide-per-page-selector` скрывает только selector выбора количества строк, но не убирает правый информационный блок paginator. В этом режиме таблица продолжает рендерить текст вида `N Строк на странице`.
- History (`CallHistoryPanel`) и Directory (`PhoneBookPanel`): фиксированный `perPage` по видимости верхнего workspace header — **11** строк при видимом header, **12** при скрытом. Высоту строк под это не подгонять (WUI-5549).

### Виртуальная клавиатура (текстовый ввод на пульте)

- Плавающий ввод: shared `KeyboardModal` (`Teleport` → `body`, drag, close) + `KeyboardPad`.
- Появление по focus/click в текстовый input; можно закрыть и открыть снова.
- Места: создание группы ПБВ (`CreateGroupModal`, auto-open), поиск в `PhoneBookPanel`, поиск в `CallHistoryPanel`.
- Встроенный (не плавающий) `KeyboardPad` остаётся на логине и в `ChangeContactsModal` / `BindingContactModal` / tab-editor.

## Примеры из проекта

- В панели быстрого вызова кнопка режима редактирования реализована через `wui-btn` с `prepend-icon="editM"`.
- В пустой ячейке сетки ПБВ кнопка добавления реализована через `wui-btn` с `prepend-icon="plusAddM"`.
- В edit mode workspace пустые ячейки — `my-btn` + `plusAddM`; меню ячеек — shared `ContextMenu`.
- В header `WorkspaceSwitchers` кнопка `setSquareM` для сохранённого стола открывает `ContextMenu` (Редактировать / Удалить).
- В карточке контакта ПБВ кнопка меню в режиме редактирования реализована через `wui-btn` с `prepend-icon="kebabHorizontalM"` и `@click.stop`.
- На страницах справочника `PhoneBookPanel` и истории `CallHistoryPanel` таблица использует фиксированный `perPage` (11 / 12 по header) и явно передаёт `:auto-per-page-by-height="false"`.

## Связанные страницы

- `architecture.md`
- `../domain/quick-call-panel.md`

## Источники

- `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
- `src/features/contact-card/ui/ContactCard.vue`
- `src/widgets/phone-book/ui/PhoneBookPanel.vue`
- `src/widgets/call-history/ui/CallHistoryPanel.vue`
- `src/features/call-card/model/use-turret-call-card-adapter.ts`
- `src/features/call-card/ui/CallCardWindow.vue`
- Jira WUI-5549
- Jira WUI-5631
- `C:/Users/d.sokolov/Desktop/projects/common-library/lib/components/data-table/wui-data-table.vue`
- `C:/Users/d.sokolov/Desktop/projects/common-library/lib/components/data-table/use-data-table-per-page.ts`
- Уточнение пользователя от 2026-06-04
- `src/shared/ui/context-menu/ContextMenu.vue`
- `src/shared/ui/context-menu/use-context-menu.ts`
- `src/pages/main/ui/workspace/WorkspacePage.vue`
- `src/widgets/app-header/ui/WorkspaceSwitchers.vue`
- Уточнение пользователя от 2026-07-13
- `src/shared/ui/modals/keyboard-modal/KeyboardModal.vue`
- `src/widgets/quick-call-panel/ui/CreateGroupModal.vue`
- Jira WUI-5637
- Уточнение пользователя от 2026-09-11

## Открытые вопросы

- Нет
