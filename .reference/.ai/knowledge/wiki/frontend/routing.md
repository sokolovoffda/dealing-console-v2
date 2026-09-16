# Frontend Routing

## Назначение

Страница фиксирует устойчивые правила frontend routing, связанные с workspace snapshots.

## Текущее понимание

Основной route рабочих столов:

- `Main` — `/main`;
- `Workspace` — `/main/workspace/:workspaceId`;
- settings и monopoly-страницы остаются отдельными child routes внутри `/main`.

`beforeEachHook` при переходе на `Main` и авторизованном пользователе инициализирует `useWorkspaceStore().initWorkspaces()` и перенаправляет на первый `workspaceViewModels` item.

Если backend вернул пустой список snapshots, `workspaceViewModels` всё равно содержит **пять** client draft slots:

- `draft-workspace-1`;
- `draft-workspace-2`;
- `draft-workspace-3`;
- `draft-workspace-4`;
- `draft-workspace-5`.

Поэтому redirect с `/main` может вести на `draft-workspace-1`.

## View / edit mode

- **View mode:** виджеты интерактивны; пустой стол показывает empty state (клик → edit mode).
- **Edit mode:** сетка с пустыми ячейками (`my-btn` +) и context menu; клики по виджетам открывают меню ячейки, не действия виджета.
- Кнопка `setSquareM` в header:
  - сохранённый стол в view mode → меню «Редактировать» / «Удалить»;
  - draft без snapshot → сразу edit mode;
  - edit mode уже активен → выход в view mode без меню.
- Удаление стола (`deleteWorkspaceSnapshot`) → `router.replace` на `draft-workspace-{order+1}`.

## Правила и ограничения

- Route id может быть backend snapshot id или client draft id.
- После создания snapshot из draft `WorkspacePage` делает `router.replace` с draft id на backend snapshot id.
- После удаления последнего widget snapshot удаляется, `WorkspacePage` делает `router.replace` на draft slot, а store сохраняет локальную layout для этого draft.
- После удаления всего стола через header `WorkspaceSwitchers` делает `router.replace` на draft slot того же order.
- Settings route не является workspace widget type.

## Связанные страницы

- `stores.md`
- `../backend-integration/api-routing.md`

## Источники

- `src/app/router/beforeEachHook.ts`
- `src/app/router/index.ts`
- `src/entities/workspace/model/use-workspace-store.ts`
- `src/pages/main/ui/workspace/WorkspacePage.vue`
- `src/widgets/app-header/ui/WorkspaceSwitchers.vue`
- Уточнение пользователя от 2026-06-09
- Уточнение пользователя от 2026-07-13

## Открытые вопросы

- Открытых вопросов нет.
