# Frontend Stores

## Назначение

Страница фиксирует устойчивые правила по frontend-store логике, которые важны для следующих задач.

## Текущее понимание

## `useContactTabs`

`useContactTabs` — Pinia store для табов панели быстрого вызова. Он хранит:

- `tabs`;
- `activeTabId`;
- `loading`;
- `error`;
- `isInitialized`.

Getters:

- `sortedTabs`;
- `enabledTabs`;
- `activeTab`;
- `hasTabs`.

Actions:

- `initTabs(force = false)`;
- `refreshTabs()`;
- `setActiveTab(tabId)`.

`initTabs()` получает backend-группы через `useContactStore().fetchAllGroups(false)`, мапит их в `ContactTab[]` и выбирает активный таб. Если `isInitialized === true` и `force === false`, повторная загрузка не выполняется.

`refreshTabs()` вызывает forced init. При обновлении активный таб сохраняется по `groupGuid`, если такая группа осталась в новом ответе.

## `useCallHistoryStore`

Источник истории звонков пульта — IM-диалог `<sip:calls@system>` через `requestChatHistory` (`messagesLimit: 100`), по тому же контракту, что web-client (`rtu-user-web-app` / `useCallsStore.fetchNext`). Не использовать `requestDialogs()` как основной источник журнала звонков.

- Фильтр отображаемых событий: `isCallPastMessage`.
- Live: `onCallMessage`; события с `from === '<sip:calls@system>'` не дублируем; dedupe по `eventId`.
- Серверная догрузка older: `fetchMore()` с `lastEventId` (cursor последнего события предыдущего ответа). `isFullyLoaded` — когда страница пустая/stale или короче лимита.
- Клиентская пагинация таблицы — поверх загруженного списка; при нехватке строк на странице панель запрашивает `fetchMore`.

Источник: `src/entities/call-history/model/use-call-history-store.ts`, WUI-5557, сравнение с `rtu-user-web-app/src/entities/calls/model.ts`.

## `useWorkspaceGroupContacts`

`useWorkspaceGroupContacts` — widget-level composable для загрузки контактов активной backend-группы панели быстрого вызова. Он не является глобальным source of truth для всех контактов.

Состояние:

- `activeGroupGuid`;
- `contactsByGroupGuid`;
- `loading`;
- `error`.

Поведение:

- грузит контакты через `useContactApi().fetchContacts({ groupId })`;
- кеширует результат по `groupGuid`;
- повторно не грузит уже загруженную группу без `force`;
- при ошибке удаляет кеш проблемной группы и выставляет `error`.

## `useWorkspaceStore`

`useWorkspaceStore` — Pinia store для workspace snapshots и визуальной раскладки рабочих столов.

Состояние:

- `workspaces` хранит только реальные `WorkspaceSnapshotDto[]`, полученные от backend;
- `workspaceLayouts` хранит локально выбранные layout draft-состояний, которые ещё не сохранены на backend;
- `loading`, `error`, `isInitialized`.

Computed/actions:

- `workspaceSlots` добивает список рабочих столов клиентскими draft-слотами до **пяти** (`draft-workspace-1` … `draft-workspace-5`);
- `workspaceViewModels` добавляет колонки layout через `getWorkspaceColumns`;
- `getWorkspaceById(workspaceId)` ищет рабочий стол по route id без скрытого alias mapping;
- `isWorkspaceEditMode` — глобальный флаг edit mode для UI рабочих столов;
- `initWorkspaces(force = false)` загружает `GET /api/v1/me/snapshots`;
- `createSnapshot()` создаёт snapshot через `POST`, без frontend-generated ids и без `params`;
- `updateSnapshot()` обновляет snapshot через `PUT /api/v1/me/snapshots/{id}`;
- `deleteSnapshot()` удаляет snapshot через `DELETE /api/v1/me/snapshots/{id}`;
- `deleteWorkspaceSnapshot(workspaceId)` удаляет сохранённый snapshot текущего слота и возвращает `{ draftWorkspaceId }` для `router.replace`;
- `setWorkspaceLayout()` / `clearWorkspaceLayout()` меняют layout локально без backend-запроса;
- `setWorkspaceEditMode(value, workspaceId?)` включает/выключает edit mode; при выходе без виджетов сбрасывает локальный layout через `resetWorkspaceLayoutIfNoWidgets`;
- `addWorkspaceWidget()` создаёт snapshot из draft через `POST` или обновляет сохранённый snapshot через `PUT`; созданный snapshot id используется страницей для `router.replace`;
- `removeWorkspaceWidget()` удаляет widget через пересохранение всего snapshot; если widget был последним, удаляет snapshot через `DELETE`, оставляет draft с прежней layout и возвращает draft id для `router.replace`;
- `moveWorkspaceWidget({ workspaceId, position, direction })` меняет позицию виджета (swap с соседом или перенос в пустую колонку) через `PUT`;
- `replaceWorkspaceWidget({ workspaceId, position, type })` заменяет тип виджета на той же позиции через `PUT`.

Workspace snapshots управляют только визуальной раскладкой. Widget-компоненты используют свои store и не получают отдельное состояние из snapshot.

## Правила и ограничения

- Не смешивать store табов и загрузку контактов активной группы.
- Не складывать контакты панели быстрого вызова в `useContactCachedStore` без отдельного решения.
- Widget-level composables допустимы для логики, специфичной для `workspace-widget`.
- Тесты store/composable должны покрывать кеширование и forced refresh.

- Для workspace snapshots не добавлять `params`: snapshot widget содержит только `id`, `type`, `position` при чтении и `type`, `position` при создании.
- Frontend не генерирует `id` snapshot/widget для сохранения. Id назначает backend.
- Drag and drop workspace widgets в текущей реализации WUI-4448-p2 не входит.

## Связанные страницы

- `../domain/quick-call-panel.md`
- `../backend-integration/im-preferences.md`

## Источники

- `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`
- `src/entities/settings/contact-tabs/test/use-contact-tabs.test.ts`
- `src/widgets/workspace-widget/model/use-workspace-group-contacts/use-workspace-group-contacts.ts`
- `src/widgets/workspace-widget/model/use-workspace-group-contacts/use-workspace-group-contacts.test.ts`
- Уточнение пользователя от 2026-06-01

- `src/entities/workspace/model/use-workspace-store.ts`
- `src/entities/workspace/model/use-workspace-store.test.ts`
- `src/entities/workspace/model/types.ts`
- `src/pages/main/ui/workspace/WorkspacePage.vue`
- Уточнение пользователя от 2026-06-09
- Уточнение пользователя от 2026-07-13

## Открытые вопросы

- Нужен ли общий shared/entity-level кеш контактов групп, если похожая загрузка появится не только в `workspace-widget`.
