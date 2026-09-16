# Activity Monitor

## Назначение

Монопольная страница «Монитор активности» (кнопка `M` в header): верхняя сетка абонентов с BLF-подписками и нижняя очередь вызовов.

## Текущее понимание

- Верхняя сетка хранит подписки на backend (`/api/v1/me/activity-monitor`): `{ contactGuid, order }` как индекс ячейки.
- UI карточек верхней сетки — общая `ContactCard` из `@/features/contact-card` (как в ПБВ).
- SIP/BLF presence-подписки на абонентов сетки выполняет только Activity Monitor, пока страница открыта. ПБВ batch-subscribe не делает.
- Нижняя «Очередь вызовов» — живые сессии **трубок + завешенных** (без конференций в текущем scope). Список строит `useActivityMonitorQueueSessions` (не `sessionStore.queueSessions`, тот pinned исключает).

## Основные сущности

- `useActivityMonitorStore` — panel/subscriptions/edit mode + REST.
- `useActivityMonitorGridContacts` — резолв `Contact` по `contactGuid`.
- `useActivityMonitorGridActions` — add/delete/reorder.
- `useActivityMonitorBlfSubscription` — batch `subscribeSIP` для `internalNumber` сетки.
- `useActivityMonitorQueueSessions` — отсортированный список сессий нижней очереди.

## Пользовательские сценарии

- Открыть AM → пустая сетка показывает EmptySetupPrompt → edit → add через модалку.
- Вне edit клик по карточке — звонок; для внутренних абонентов новый звонок только при BLF `online` (`requireOnlineForCall`). Внешние и уже существующая сессия не блокируются.
- Клик по карточке с **завешенной** сессией (ПБВ / AM сетка):
  - входящий → `answer` на goose + `openPinnedPanelSession`; без goose → toast (WUI-5596);
  - уже установленная → `openPinnedPanelSession`; при ready goose дополнительно `switchToCall`;
  - без goose для не-incoming карточка всё равно открывается.
- Клик по карточке нижней очереди AM → handset: `openSessionInPreferredHandset` (+ answer на входящем через shared ContactCard); pinned: `openPinnedPanelSession`.
- В edit: delete / move (reorder) через REST subscriptions.
- Нижняя очередь пуста → non-interactive EmptySetupPrompt «Очередь пуста».

## Правила и ограничения

- Размер верхней сетки: `ACTIVITY_MONITOR_GRID_SIZE = 24`.
- BLF: batch `16` / delay `1000 ms` / expires `5 * 60`, только при `onRegisteredSIP`.
- Подписка живёт на уровне widget Panel (lifecycle mount/unmount); при unmount текущий batch run отменяется по run id.
- Presence/subscriber visual на карточке — через shared `ContactCard` (`presence` / `selfStatus` / `subscriberStatus`).
- Очередь AM: состояния `CONNECTED` | `ONHOLD` | `PROGRESS` | `RINGING`; конференции (`session.conference` / group pServed) исключаются.
- Сортировка очереди (без priority): **CONNECTED → ONHOLD → RINGING|PROGRESS**; внутри группы — стабильный порядок появления (FIFO Map).

## Edge cases

- Guid без найденного контакта — ячейка без карточки, без падения.
- 409 на POST subscription — лог, без падения UI.
- Повторный `subscribeSIP` безопасен (`activeSubscribers`).

## Связанные страницы

- `../domain/quick-call-panel.md`
- `../domain/statuses.md`
- `../domain/pinned-calls.md`
- `../backend-integration/sip-webrtc.md`
- `../backend-integration/api-routing.md`

## Источники

- `src/widgets/activity-monitor/**`
- `src/entities/activity-monitor/**`
- `.ai/tasks/WUI-5446/implementation_plan_2.md`
- `.ai/tasks/WUI-5446/implementation_plan_3.md`
- Уточнение пользователя от 2026-08-26 (BLF только на AM)
- Уточнение пользователя от 2026-08-26 / 2026-08-27 (очередь: handset ∪ pinned, сортировка, empty)

## Открытые вопросы

- Стрелки горизонтального листинга — после дизайна.
- Названия цветовых токенов карточек очереди — от пользователя.
