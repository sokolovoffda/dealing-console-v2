# Кейс: WUI-5446 — Activity Monitor

## Описание текущей части кейса

Вторая часть — **верхняя зона** монитора активности: вынос общей карточки контакта в `features`, empty-state, карточки как в ПБВ, edit-действия (add/delete/reorder) через REST subscriptions, загрузка контактов по `contactGuid`, SIP/BLF presence-подписки на абонентов сетки. Нижняя очередь в эту часть не входит.

## Контекст предыдущих частей

- `implementation_plan_1.md` — каркас: entity/API/store, widget layout (grid + queue stubs), monopoly page + router + vite/nginx proxy.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/backend-integration/sip-webrtc.md` — `subscribeSIP`, batch 16 / 1000ms / expires 5×60
- `.ai/knowledge/wiki/domain/statuses.md` — presence / selfStatus / subscriberStatus
- `.ai/knowledge/wiki/domain/quick-call-panel.md` — карточка ПБВ, EmptySetupPrompt (частично устарело по presence)
- `.ai/tasks/WUI-4733/implementation_plan_2.md` — **шаг 3**: как подписывать контакты на BLF
- `.ai/tasks/WUI-4864/case.md` + планы — presence + self + subscriber visual layers
- Живой референс батч-подписки: `src/widgets/pinned-calls/ui/PinnedCallsCards.vue` (`subscribeToContacts`)

# План реализации: верхняя сетка Activity Monitor

## Шаг 1: Вынести карточку контакта в `features/contact-card`

- **Описание:** Сразу вынести общую карточку из `widgets/quick-call-panel` в FSD feature (не в `features/call-card` — там карточка трубки footer). Перенести вместе с зависимостями карточки: UI, `contact-card-tone`, `use-contact-card-status`, `use-quick-call-contact-call` (переименовать нейтрально, напр. `use-contact-card-call`), typography, связанные тесты. Public API: `@/features/contact-card` → `ContactCard` (или сохранить alias `QuickCallContactCard` на время). ПБВ перевести на импорт из feature; из `quick-call-panel/index` убрать экспорт карточки (или thin re-export deprecated). Меню edit сделать конфигурируемым через props/emits (ПБВ: move/duplicate/delete; AM потом: delete / move), без хардкода только ПБВ-сценариев внутри feature. Поведение звонка по клику сохранить.
- **Файлы для изменений:** новый `src/features/contact-card/**`, правки `src/widgets/quick-call-panel/**`, тесты карточки перенести/поправить импорты.
- **Ожидаемый результат:** Карточка лежит в feature-слое; ПБВ работает как раньше; widget→widget импорт для AM не нужен.
- **Проверка:** Ручная регрессия ПБВ (клик-звонок, edit-меню). Targeted tests карточки при наличии.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да (кратко): `frontend/fsd-structure` / `quick-call-panel` — карточка переехала в feature

## Шаг 2: EmptySetupPrompt для пустой верхней сетки

- **Описание:** Как в ПБВ / pinned: если нет ни одной subscription, не loading/error и не edit mode — показывать `EmptySetupPrompt` поверх верхней зоны (очередь снизу остаётся). Текст вроде «Нажмите, чтобы добавить абонентов»; клик → `setEditMode(true)`. В edit пустая сетка показывает plus в ячейках как сейчас.
- **Файлы для изменений:** `src/widgets/activity-monitor/ui/ActivityMonitorPanel.vue` (и при необходимости grid).
- **Ожидаемый результат:** Пустой монитор не выглядит «дырявой» сеткой из 24 пустых ячеек вне edit.
- **Проверка:** Ручной просмотр: пустой panel → prompt; edit → сетка с plus; после появления subscription → сетка.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Загрузка контактов по `contactGuid` и ячейки с `Contact`

- **Описание:** После `fetchPanel` (и при изменении subscriptions) резолвить контакты для guid'ов сетки через существующий contact cache/API (по аналогии с pinned/ПБВ). Построить UI-модель ячеек: `{ cellIndex, subscription, contact | null }`. Guid без найденного контакта — не падать: ячейка placeholder или скрыть карточку (минимально).
- **Файлы для изменений:** composable в `src/widgets/activity-monitor/model/`, при необходимости store; `ActivityMonitorGrid.vue`.
- **Ожидаемый результат:** Для известных guid в сетке есть данные контакта (номер/имя) для карточки.
- **Проверка:** Review + ручная проверка с реальными subscriptions с backend.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2.4: Карточки верхней сетки = `ContactCard` из feature

- **Описание:** В заполненных ячейках рендерить `ContactCard` из `@/features/contact-card`. В edit: kebab с удалением (и move для reorder); клик по plus → add. Вне edit: клик = звонок. Не дублировать разметку.
- **Файлы для изменений:** `ActivityMonitorGrid.vue`, actions composable в widget.
- **Ожидаемый результат:** Верхняя сетка визуально как ПБВ на заполненных ячейках.
- **Проверка:** Ручной визуальный review рядом с ПБВ.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2.5: Edit-действия — add / delete / reorder через API

- **Описание:**
  - **Add:** plus → `ChangeContactsModal` (single) → `POST /subscriptions` `{ contactGuid, order: cellIndex }`; 409 — лог/ошибка без падения.
  - **Delete:** меню → `DELETE /subscriptions/{contactGuid}`.
  - **Reorder:** pending source → целевая ячейка → `PUT .../reorder` `{ fromOrder, toOrder }`.
- **Файлы для изменений:** widget actions, `useActivityMonitorStore`, grid/panel.
- **Ожидаемый результат:** Наполнение/чистка/перестановка сетки через REST.
- **Проверка:** Ручные сценарии add/delete/reorder.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2.6: SIP/BLF presence-подписки на абонентов монитора

- **Описание:** Widget-level composable в `activity-monitor`: после загрузки контактов — `internalNumber` + `onRegisteredSIP` → batch `subscribeSIP(..., 5 * 60)` (16 / 1000ms). Только пока открыт AM. ПБВ не подписываем.
- **Файлы для изменений:** `src/widgets/activity-monitor/model/use-activity-monitor-blf-subscription.ts`, Panel.
- **Ожидаемый результат:** `contactStatuses` / lines обновляются для абонентов монитора.
- **Проверка:** NOTIFY/online на AM; ПБВ без batch-subscribe.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `domain/activity-monitor.md` + `sip-webrtc.md`

## Шаг 2.7: Вернуть presence / subscriber visual на `ContactCard`

- **Описание:** Вариант **A**: вернуть presence/subscriber в feature `contact-card` (status + tone), контракт WUI-4864 / `statuses.md`. Подписки только на AM; ПБВ «тихий». Не ломать self-статус и звонок.
- **Файлы для изменений:** `features/contact-card` (status/tone/ui), тесты — после согласования.
- **Ожидаемый результат:** AM показывает BLF presence/линии; ПБВ без регрессии self/звонка.
- **Проверка:** online/offline + subscriber на AM; регрессия ПБВ.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `statuses.md`, `activity-monitor.md`, `quick-call-panel.md`

## Вне этой части

- Карточки нижней «Очереди вызовов» → **часть 3** (обсуждение + макеты).
- Favorites (WUI-5445), если отдельно.
- Автотесты сверх перенесённых — отдельным шагом после апрува сценариев.

---

## Статус части 2

**Закрыта** (2026-08-26): верхняя сетка, `features/contact-card`, BLF subscribe на AM, presence/subscriber visual, ПБВ без batch-subscribe / без presence-visual.
