# Кейс: WUI-4864 — Создание и удаление групп ПБВ

## Описание текущей части кейса

Добавить создание пустой `user`-группы через `+` у табов (модалка в `shared`) и удаление активной группы в edit mode (крестик на активном табе) без confirm. Детали — в `case.md` § «создание и удаление групп ПБВ».

## Контекст предыдущих частей

- `implementation_plan_4.md` — fast-dial layout + состав групп.
- `implementation_plan_7.md` — device affinity / pin incoming (параллельная линия).
- `+` в `TabsBlock` уже отрисован без обработчика; `createGroup` в `useGroupStore` есть, `deleteGroup` для `/api/user/groups` — нет.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/backend-integration/api-routing.md`
- `.ai/knowledge/wiki/frontend/stores.md`

# План реализации: Создание и удаление групп ПБВ

## Шаг 1: Shared modal shell (расширяемый)

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** Базовая модалка в `shared/ui` по структуре Figma modal48 (560px, header title+close, content slot, footer cancel/confirm). UI Kit: `MyBtn` / иконка close. Контракт под расширение: props title, cancelText, confirmText, confirmDisabled, loading; slots `default` (+ опционально header/footer при необходимости позже). Export через `shared/ui` public API. Без бизнес-логики групп.
- **Файлы для изменений:** `src/shared/ui/modals/app-modal/AppModal.vue` (+ types/index при необходимости), `src/shared/ui/index.ts`.
- **Ожидаемый результат:** Можно открыть shell через `useDialog` с произвольным content; кнопки Отмена/Confirm и close закрывают диалог.
- **Проверка:** `npm run ts:check`; визуально в isolation / временный вызов при отладке.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: CreateGroupModal (ПБВ) + API create/delete в group store

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** Модалка создания группы на базе shared `AppModal`, лежит в **widgets/quick-call-panel** (не в shared): одно поле `MyInput` (название), «Создать» disabled пока `trim().length < 3`. Результат диалога: `{ name } | undefined`. В `useGroupStore`: доработать `createGroup` (тело `{ guid, name, type: 'user' }`, возвращать созданную группу / обновлять map; ошибка → notification); добавить `deleteGroup(guid)` → `DELETE /api/user/groups/{guid}` + убрать из map; ошибка → notification.
- **Файлы для изменений:** `src/widgets/quick-call-panel/ui/CreateGroupModal.vue`, `src/entities/group/model/use-group-store.ts`, убрать ошибочный export из `shared/ui`.
- **Ожидаемый результат:** Store умеет create/delete backend-группы; модалка ПБВ отдаёт валидное имя или cancel.
- **Проверка:** `npm run ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Wiring создания группы в TabsBlock / ПБВ

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** `+` эмитит событие (entity `TabsBlock` без знания модалки) → в `QuickCallPanel` `showDialog(CreateGroupModal)` → `createGroup` → `refreshTabs()` → `setActiveTab` на новую группу. `+` всегда доступен. Ошибки — через store notifications.
- **Файлы для изменений:** `TabsBlock.vue` (emit), `QuickCallPanel.vue` (orchestration); при необходимости `use-contact-tabs.ts`.
- **Ожидаемый результат:** Создаётся пустая группа, появляется таб, он становится активным, сетка пустая (edit/add как сейчас).
- **Проверка:** `npm run ts:check`; ручной сценарий create.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Удаление активной группы в edit mode

- **Описание:** Прокинуть `isEditMode` в `TabsBlock` / `TabItem`. На активном табе в edit mode — крестик (`@click.stop`). Оркестрация удаления: если есть fast-dial group по `groupGuid` → `fastDialStore.deleteGroup(id)`; затем `groupStore.deleteGroup(guid)`; `refreshTabs()` (+ сброс кеша контактов удаленной группы в ПБВ при наличии API); если групп не осталось — показать «Список групп пуст» и только `+` (без крестиков). Confirm-диалог не добавлять.
- **Файлы для изменений:** `TabItem.vue`, `TabsBlock.vue`, `QuickCallPanel.vue` (проброс edit mode / empty copy); при необходимости `use-workspace-group-contacts` clear cache; orchestration composable рядом с ПБВ или тонкий метод в tabs store.
- **Ожидаемый результат:** Удаление активной группы (в т.ч. последней) без confirm; fast-dial layout чистится если был; ошибки с notification.
- **Проверка:** `npm run ts:check`; ручные сценарии: удалить не последнюю / последнюю; группа с layout и без.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Wiki

- **Описание:** Зафиксировать create/delete групп ПБВ, контракт модалки/валидации, порядок DELETE (fast-dial `id` + `/api/user/groups/{guid}`), empty state без групп.
- **Файлы для изменений:** `.ai/knowledge/wiki/domain/quick-call-panel.md`, `.ai/knowledge/wiki/backend-integration/api-routing.md`, `index.md`/`log.md` при необходимости.
- **Ожидаемый результат:** Wiki соответствует case + plan 8.
- **Проверка:** review страниц.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — перечисленные страницы

### Примечание по fast-dial DELETE

Существующий API: `DELETE /api/v1/me/fast-dial/groups/{id}` (поле `FastDialGroup.id`). Lookup: `groupsByGroupGuid.get(backendGroupGuid)` → delete по `id`, если запись есть. Не выдумывать отдельный path по `groupGuid`, если контракт прежний.
