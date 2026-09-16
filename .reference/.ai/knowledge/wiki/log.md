# Project Wiki Log

## 2026-09-15 task-update WUI-5528 plan4 step6 wiki + tests cleanup

- **Type:** task-update
- **Summary:** Runtime-контракт overrides зафиксирован: merge → LogicalMediaDevice, AEC/`enabled` guards, soft-disable footer/ПБВ/lockdown. Case current state = plan4 done; open-questions — только follow-up диалог переноса.
- **Updated pages:**
  - `backend-integration/media-device-overrides-api.md`
  - `domain/devices.md`
  - `domain/handsets.md`
  - `domain/speakers-ptt.md`
  - `product/open-questions.md`
  - `.ai/tasks/WUI-5528/case.md`
- **Sources:**
  - `.ai/tasks/WUI-5528/implementation_plan_4.md` step 6
  - `src/entities/media-devices-settings/test/use-media-device-overrides-store.test.ts`
  - `src/features/contact-card/model/use-contact-card-call/use-contact-card-call.ts`
- **Open questions:**
  - Диалог переноса вызова с трубки при OFF (follow-up)

## 2026-09-15 task-update WUI-5528 plan4 step4 footer soft-disable

- **Type:** task-update
- **Summary:** Footer трубки: OFF+activity → клик открывает карточку; OFF без активности → disabled; одна enabled → auto-select; Answer на disabled → toast.
- **Updated pages:**
  - `domain/handsets.md`
- **Sources:**
  - `.ai/tasks/WUI-5528/implementation_plan_4.md` step 4
  - уточнение пользователя от 2026-09-15
- **Open questions:**
  - ПБВ добивка — step 5

## 2026-09-15 task-update WUI-5528 plan4 step3 soft-disable enabled

- **Type:** task-update
- **Summary:** `enabled` учитывается в ready*/readyPreferredGoose; toast при медиа без usable device; запрет выключения при bound sessions.
- **Updated pages:**
  - `domain/devices.md`
- **Sources:**
  - `.ai/tasks/WUI-5528/implementation_plan_4.md` step 3
  - `src/shared/composables/state/devices-store/media-device-usability.ts`
- **Open questions:**
  - footer UX disabled+activity — step 4

## 2026-09-15 task-update WUI-5528 plan3 step7 wiki cleanup + leave/debounce tests

- **Type:** task-update
- **Summary:** Контракт Media Devices persist зафиксирован: overrides wiki page; goose status Implemented; Q1/Q2 убраны из open-questions; тесты leave flush + debounce Main volume.
- **Updated pages:**
  - `backend-integration/media-device-overrides-api.md` (new)
  - `backend-integration/goose-settings-api.md`
  - `domain/speakers-ptt.md`
  - `domain/devices.md`
  - `product/open-questions.md`
  - `index.md`
- **Sources:**
  - `.ai/tasks/WUI-5528/implementation_plan_3.md` step 7
  - `src/pages/main/ui/settings-page/lib/run-settings-leave-flush.ts`
- **Open questions:**
  - нет по WUI-5528 v1 persist

## 2026-09-15 task-update WUI-5528 save-on-leave + Main volume debounce (plan3 step6)

- **Type:** task-update
- **Summary:** Settings leave flush: main + goose + overrides; Main volume — единый debounced PATCH по `globalVolumeMultiplier`, на leave `flushPending` без дубля.
- **Updated pages:**
  - `domain/devices.md`
- **Sources:**
  - `src/entities/media-devices-settings/model/use-media-device-overrides-store.ts`
  - `src/pages/main/ui/settings-page/ui/SettingsPage.vue`
  - `.ai/tasks/WUI-5528/implementation_plan_3.md`
- **Open questions:**
  - нет

## 2026-09-15 task-update WUI-5528 overrides store (plan3 step5)

- **Type:** task-update
- **Summary:** `useMediaDeviceOverridesStore`: hydrate GET по `hardwareSerial`, merge по `logicalKey`, orphans, Main volume → footer; карточки Media Devices читают/пишут working copy.
- **Updated pages:**
  - `domain/devices.md`
- **Sources:**
  - `src/entities/media-devices-settings/model/use-media-device-overrides-store.ts`
  - `src/entities/media-devices-settings/ui/MediaDeviceItem.vue`
  - `.ai/tasks/WUI-5528/implementation_plan_3.md`
- **Open questions:**
  - leave + debounce Main — step 6

## 2026-09-15 task-update WUI-5528 goose hydrate (plan3 step4)

- **Type:** task-update
- **Summary:** Goose settings hydrate из REST; `localStorage` снят; dirty/synced в `useGooseSettingsStore`; init рядом с main-settings.
- **Updated pages:**
  - `domain/speakers-ptt.md`
  - `backend-integration/goose-settings-api.md`
- **Sources:**
  - `src/entities/media-devices-settings/model/use-goose-settings-store.ts`
  - `src/shared/composables/state/devices-store/use-devices-store.ts`
  - `.ai/tasks/WUI-5528/implementation_plan_3.md`
- **Open questions:**
  - leave-flush wiring — step 6

## 2026-09-15 task-update WUI-5528 media API routing (plan3 step1)

- **Type:** task-update
- **Summary:** Vite/nginx proxy: `/api/v1/me/goose-settings` и `/api/v1/me/media-device-overrides` → additional backend (APS). Зафиксировано в `api-routing.md`.
- **Updated pages:**
  - `backend-integration/api-routing.md`
- **Sources:**
  - `vite.config.ts`
  - `extra/etc/nginx/sites-available/rtu-turret-console-dealing`
  - `.ai/tasks/WUI-5528/implementation_plan_3.md`
  - `.ai/tasks/WUI-5528/api-contract.md`
- **Open questions:**
  - нет

## 2026-09-15 task-update WUI-5528 Q1 Main volume closed

- **Type:** task-update
- **Summary:** Q1 закрыт: Main volume persist в overrides; footer/header и Settings синхронизированы; вне Settings — debounced PATCH. План 3 шаг 6 расширен.
- **Updated pages:**
  - `product/open-questions.md`
- **Sources:**
  - Уточнение пользователя от 2026-09-15
  - `.ai/tasks/WUI-5528/case.md`
  - `.ai/tasks/WUI-5528/implementation_plan_3.md`
- **Open questions:**
  - нет по WUI-5528 persist scope

## 2026-09-15 task-update WUI-5528 media overrides OpenAPI

- **Type:** task-update
- **Summary:** В OpenAPI появился `GET/PATCH /api/v1/me/media-device-overrides/{hardwareSerial}`; Q2 scope закрыт (goose per user, overrides user+serial). Старт API-плана `implementation_plan_3.md`.
- **Updated pages:**
  - `product/open-questions.md`
- **Sources:**
  - `src/__mocks_/openapi.json`
  - `.ai/tasks/WUI-5528/api-contract.md`
  - `.ai/tasks/WUI-5528/implementation_plan_3.md`
- **Open questions:**
  - (закрыто следующей записью) Main volume

## 2026-09-14 task-update WUI-5638 electron stand-config part 1

- **Type:** task-update
- **Summary:** Зафиксирована часть 1 runtime-стенда Electron: IPC get/set/ping, optimistic/manual UX на логине, runtime URL вместо bake-in env. Админ-гейт смены адреса и разбор ошибки логина — часть 2.
- **Updated pages:**
  - `electron/stand-config.md`
  - `electron/ipc.md`
  - `electron/preload.md`
  - `backend-integration/api-routing.md`
  - `index.md`
  - `product/open-questions.md`
- **Sources:**
  - `electron/stand-config.mjs`
  - `electron/preload.mjs`
  - `src/shared/stand-config/`
  - `src/features/electron-stand-setup/`
  - `.ai/tasks/WUI-5638/case.md`
  - `.ai/tasks/WUI-5638/implementation_plan_1.md`
  - Уточнение пользователя от 2026-09-14
- **Open questions:**
  - APS endpoint «только пароль» для смены адреса (часть 2)
  - Нужен ли IPC `standConfig:clear`

## 2026-09-11 task-update WUI-5637 floating virtual keyboard

- **Type:** task-update
- **Summary:** Зафиксировано правило плавающей виртуальной клавиатуры (`KeyboardModal`) для текстового ввода на пульте: ПБВ create group, поиск справочника и истории; встроенный `KeyboardPad` на логине/выборе контактов.
- **Updated pages:**
  - `frontend/components.md`
- **Sources:**
  - `src/shared/ui/modals/keyboard-modal/KeyboardModal.vue`
  - `src/widgets/quick-call-panel/ui/CreateGroupModal.vue`
  - `src/widgets/phone-book/ui/PhoneBookPanel.vue`
  - `src/widgets/call-history/ui/CallHistoryPanel.vue`
  - Jira WUI-5637
  - Уточнение пользователя от 2026-09-11
- **Open questions:**
  - нет

## 2026-09-08 task-update WUI-5615 sync on fetch / session bind

- **Type:** task-update
- **Summary:** WUI-5615 п.3: после fetchPanel sync всех групп на members; при assignSessionToSlot — applyGroupsIntentToSlot перед applySlotAudioState (dial→answer не берёт default слота).
- **Updated pages:**
  - `domain/broadcast-groups.md`
  - `domain/pinned-calls.md`
- **Sources:**
  - `.ai/tasks/WUI-5615/case.md`
  - `.ai/tasks/WUI-5615/implementation_plan_2.md`
  - Уточнение пользователя от 2026-09-08
- **Open questions:**
  - нет

## 2026-09-08 task-update WUI-5615 group audio sync rules

- **Type:** task-update
- **Summary:** Зафиксированы правила WUI-5615: sync mic/volume intent группы на всех текущих members после `updateGroup`/`addGroupMember`; card↔group = вариант A (локальный drift слота без reverse-sync intent группы).
- **Updated pages:**
  - `domain/broadcast-groups.md`
  - `domain/pinned-calls.md`
- **Sources:**
  - `.ai/tasks/WUI-5615/case.md`
  - `.ai/tasks/WUI-5615/implementation_plan_1.md` шаг 1
  - Уточнение пользователя от 2026-09-08
- **Open questions:**
  - нет
## 2026-09-10 task-update WUI-5631 TurretCallCard in dealing

- **Type:** task-update
- **Summary:** Presentational call-card UI пересажен на `TurretCallCard` (`@rtu-turret-system/turret-lib`) через `useTurretCallCardAdapter`; домен/store и footer трубок в dealing. Pinned — через `capabilities` + mic icons в queue.
- **Updated pages:**
  - `domain/calls.md`
  - `frontend/components.md`
- **Sources:**
  - `src/features/call-card/model/use-turret-call-card-adapter.ts`
  - `src/features/call-card/ui/CallCardWindow.vue`
  - Jira WUI-5631
  - уточнение пользователя от 2026-09-10 (токены из либы)
- **Open questions:**
  - Pinned queue navigator edges vs virtual slots — нужен ли `canGo*` override в контракте либы.


## 2026-09-07 task-update WUI-5557 call history fetchMore

- **Type:** task-update
- **Summary:** Добавлена серверная догрузка истории звонков (`fetchMore` + `lastEventId`); панель догружает страницы, если не хватает строк.
- **Updated pages:**
  - `frontend/stores.md`
- **Sources:**
  - `src/entities/call-history/model/use-call-history-store.ts`
  - `src/widgets/call-history/ui/CallHistoryPanel.vue`
  - Jira WUI-5557
- **Open questions:**
  - —

## 2026-09-07 task-update WUI-5557 call history from calls@system

- **Type:** task-update
- **Summary:** История звонков пульта загружается через `requestChatHistory` по `<sip:calls@system>` (как web-client), а не через `requestDialogs`.
- **Updated pages:**
  - `frontend/stores.md`
- **Sources:**
  - `src/entities/call-history/model/use-call-history-store.ts`
  - `rtu-user-web-app/src/entities/calls/model.ts`
  - Jira WUI-5557
- **Open questions:**
  - —

## 2026-09-07 decision external contacts to backend via externalContact group

- **Type:** decision
- **Summary:** Внешние контакты полностью на бэк; IndexedDB уходит. Системная группа `name: externalContact`, `type: user`; ПБВ скрывает её по имени. Реализация — отдельный тикет.
- **Updated pages:**
  - `domain/directory.md`
  - `domain/quick-call-panel.md`
  - `product/open-questions.md`
- **Sources:**
  - уточнение пользователя от 2026-09-07
  - `.ai/tasks/WUI-5609/case.md`
- **Open questions:**
  - фильтр по name vs type/flag на бэке
  - миграция IDB → backend

## 2026-09-07 task-update WUI-5609 directory search merge like web + email

- **Type:** task-update
- **Summary:** Поиск справочника как web + email: параллельные Filters (цифры → phones+email, текст → names+email), merge по id, клиентская пагинация; без SearchText / без FilterLogicOperator=or.
- **Updated pages:**
  - `domain/directory.md`
- **Sources:**
  - `src/widgets/phone-book/ui/PhoneBookPanel.vue`
  - `src/entities/contact/lib/build-contacts-directory-search-query.ts`
  - `src/entities/contact/model/use-contact-store.ts` — `fetchDirectorySearch`
  - Jira WUI-5609
  - уточнение пользователя от 2026-09-07 (как web + email)
- **Open questions:**
  - Покрывают ли Filters массивы `emails[]` / `mobilePhones[]`

## 2026-09-07 task-update WUI-5609 directory search Filters OR

- **Type:** task-update
- **Summary:** Поиск справочника: `Filters` + `FilterLogicOperator=or` по names / internalNumber / mobilePhone / email (`contains`), без `SearchText`.
- **Updated pages:**
  - `domain/directory.md`
- **Sources:**
  - `src/widgets/phone-book/ui/PhoneBookPanel.vue`
  - `src/entities/contact/lib/build-contacts-directory-search-query.ts`
  - Jira WUI-5609
  - уточнение пользователя от 2026-09-07
- **Open questions:**
  - Покрывают ли Filters массивы `emails[]` / `mobilePhones[]`
## 2026-09-04 task-update WUI-5549 History/Directory page size

- **Type:** task-update
- **Summary:** Зафиксирован page size списков History и Directory: 11 строк при видимом workspace header, 12 при скрытом; высоту строк не менять.
- **Updated pages:**
  - `domain/directory.md`
  - `frontend/components.md`
- **Sources:**
  - `src/widgets/call-history/ui/CallHistoryPanel.vue`
  - `src/widgets/phone-book/ui/PhoneBookPanel.vue`
  - Jira WUI-5549
- **Open questions:**
  - Нет


## 2026-09-07 task-update WUI-5596 contact-card incoming tests

- **Type:** task-update
- **Summary:** Unit-тесты accept входящего с ContactCard (pinned/handset ± device); wiki AM/calls выровнены с WUI-5596.
- **Updated pages:**
  - `domain/activity-monitor.md`
  - `domain/calls.md`
- **Sources:**
  - `src/features/contact-card/test/ContactCard.test.ts`
  - Jira WUI-5596

## 2026-09-07 task-update WUI-5596 QCP click answers incoming

- **Type:** task-update
- **Summary:** Клик по карточке ПБВ/ContactCard на входящем делает `answer` (goose / handset) или toast без устройства.
- **Updated pages:**
  - `domain/quick-call-panel.md`
- **Sources:**
  - `src/features/contact-card/model/use-contact-card-call/use-contact-card-call.ts`
  - Jira WUI-5596
  - уточнение пользователя от 2026-09-07

## 2026-09-03 task-update WUI-5528 media persist discussion model

- **Type:** task-update
- **Summary:** Зафиксированы критические сценарии persist Media Devices (merge/orphans/serial/save-on-leave) и два открытых вопроса: Main volume на бэк; goose vs overrides scope.
- **Updated pages:**
  - `domain/devices.md`
  - `product/open-questions.md`
- **Sources:**
  - уточнение пользователя от 2026-09-03
  - `.ai/tasks/WUI-5528/discussion-media-persist-model.md`
  - WUI-5528


## 2026-09-03 task-update WUI-5528 Main hub logical device

- **Type:** task-update
- **Summary:** Controller `hub` строится как logical device типа `main` (Основной динамик): output-only в Settings, без duplicate browser Main; `preferredPinnedOutputId` сохраняется.
- **Updated pages:**
  - `domain/devices.md`
- **Sources:**
  - `src/shared/composables/state/devices-store/use-devices-store.ts`
  - уточнение пользователя от 2026-09-03
  - WUI-5528 `implementation_plan_2` шаг 1


## 2026-08-31 task-update WUI-5527 Main settings stabilization (step 2.6)

- **Type:** task-update
- **Summary:** Стабилизация Main settings: API tests, init fallback, handset wiring, reset confirm modal, WUI include keys; wiki — Main settings API + runtime wiring.
- **Updated pages:**
  - `backend-integration/api-routing.md`
- **Sources:**
  - `src/entities/main-settings/test/main-settings-api.test.ts`
  - `src/shared/controller/event-handlers/handsetEventHandler.ts`
  - `src/pages/main/ui/settings-page/sections/main-settings/ResetMainSettingsConfirmModal.vue`
  - WUI-5527 step 2.6

## 2026-08-31 task-update Main settings REST persist

- **Type:** task-update
- **Summary:** Main settings persist через REST; ключ `mainSettings` убран из IM preferences hub.
- **Updated pages:**
  - `backend-integration/im-preferences.md`
- **Sources:**
  - `src/entities/main-settings/model/main-settings-store.ts`
  - `src/entities/preference/model/use-preference.ts`
  - WUI-5527 step 2.5

## 2026-08-27 task-update AM/ПБВ open pinned call-card

- **Type:** task-update
- **Summary:** Клик по завешенной сессии из ПБВ/AM (`ContactCard`) и из очереди AM открывает call-card через `openPinnedPanelSession`; handset в очереди — `openSessionInPreferredHandset`. Существующую pinned-сессию можно открыть без ready goose; медиа `switchToCall` — только при goose.
- **Updated pages:**
  - `domain/activity-monitor.md`
  - `domain/quick-call-panel.md`
- **Sources:**
  - `src/features/contact-card/model/use-contact-card-call/use-contact-card-call.ts`
  - `src/widgets/activity-monitor/ui/ActivityMonitorQueuePanel.vue`
  - `.ai/tasks/WUI-5446/implementation_plan_3.md` шаг 3.4
  - Уточнение пользователя от 2026-08-27
- **Open questions:**
  - нет

## 2026-08-27 task-update AM queue sessions model

- **Type:** task-update
- **Summary:** Нижняя очередь Activity Monitor: `useActivityMonitorQueueSessions` собирает handset ∪ pinned (не `queueSessions`), без конференций; сортировка CONNECTED → ONHOLD → RINGING|PROGRESS, FIFO внутри группы.
- **Updated pages:**
  - `domain/activity-monitor.md`
- **Sources:**
  - `src/widgets/activity-monitor/model/use-activity-monitor-queue-sessions.ts`
  - `.ai/tasks/WUI-5446/implementation_plan_3.md` шаг 3.2
  - Уточнение пользователя от 2026-08-26 / 2026-08-27
- **Open questions:**
  - UI карточки очереди и клик → call-card (шаги 3.3–3.4)

## 2026-08-26 task-update AM block call when offline

- **Type:** task-update
- **Summary:** Activity Monitor включает `requireOnlineForCall` на `ContactCard`: новый звонок внутреннему абоненту только при BLF online; внешние и открытие существующей сессии не блокируются. ПБВ без этого флага.
- **Updated pages:**
  - `domain/activity-monitor.md`
- **Sources:**
  - `src/features/contact-card/model/use-contact-card-call/use-contact-card-call.ts`
  - `src/widgets/activity-monitor/ui/ActivityMonitorGrid.vue`
  - Уточнение пользователя от 2026-08-26
- **Open questions:**
  - нет

## 2026-08-26 task-update ContactCard presence/subscriber restore

- **Type:** task-update
- **Summary:** В `features/contact-card` возвращены presence (online/offline) и subscriber visual поверх self-статусов. Batch BLF subscribe остаётся у Activity Monitor; ПБВ тихий по подпискам, звонок без требования presence online.
- **Updated pages:**
  - `domain/statuses.md`
  - `domain/activity-monitor.md`
  - `domain/quick-call-panel.md`
- **Sources:**
  - `src/features/contact-card/**`
  - `.ai/tasks/WUI-5446/implementation_plan_2.md` шаг 2.7
  - Уточнение пользователя от 2026-08-26
- **Open questions:**
  - нет

## 2026-08-26 task-update Activity Monitor BLF subscribe

- **Type:** task-update
- **Summary:** SIP/BLF batch-subscribe перенесён на Activity Monitor (`useActivityMonitorBlfSubscription`: 16 / 1000ms / expires 5×60). ПБВ больше не владеет batch presence-подпиской групп.
- **Updated pages:**
  - `domain/activity-monitor.md` (создана)
  - `backend-integration/sip-webrtc.md`
  - `index.md`
- **Sources:**
  - `src/widgets/activity-monitor/model/use-activity-monitor-blf-subscription.ts`
  - `.ai/tasks/WUI-5446/implementation_plan_2.md` шаг 2.6
  - Уточнение пользователя от 2026-08-26
- **Open questions:**
  - Нужен ли explicit unsubscribe при уходе с AM vs только expires.

## 2026-08-26 task-update ContactCard → features/contact-card

- **Type:** task-update
- **Summary:** Общая карточка контакта вынесена из `widgets/quick-call-panel` в `features/contact-card` (`ContactCard`), для переиспользования Activity Monitor (WUI-5446). ПБВ импортирует через `@/features/contact-card`.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `frontend/components.md`
  - `frontend/architecture.md`
- **Sources:**
  - `src/features/contact-card/**`
  - Уточнение пользователя от 2026-08-26
- **Open questions:**
  - нет

## 2026-08-24 task-update Deb nginx: RTU /api vs turret-admin

- **Type:** task-update
- **Summary:** Deb site больше не проксирует весь `/api/` на turret-admin. Login `/api/user/login` и прочий RTU REST идут на WebAPI `:6001`; `/api/v1/me/{fast-dial,snapshots,pinned-calls,diagnostics}` и `/ws/` остаются на admin `:3000`. Добавлены RTU-пути из Vite/`nginx.conf`: `/sip`, `/im`, `/prompt/`, `/selector/`.
- **Updated pages:**
  - `backend-integration/api-routing.md`
- **Sources:**
  - `extra/etc/nginx/sites-available/rtu-turret-console-dealing`
  - `vite.config.ts`
  - Уточнение пользователя от 2026-08-24
- **Open questions:**
  - нет

## 2026-08-20 task-update ПБВ movable = focused tone

- **Type:** task-update
- **Summary:** Pending-перенос карточки ПБВ больше не через opacity: DS `state=movable` ≈ `focused` (`bg-base-pres` + `brd-base-foc`). Добавлены neutcon hover/pressed/focus-visible. Уточнён токен `comp/card/neutcon/brd/base/foc`.
- **Updated pages:**
  - `domain/quick-call-panel.md`
- **Sources:**
  - Уточнение пользователя / дизайнер от 2026-08-20 (WUI-4864)
  - Figma DS `cardDefDeal` node `407:2756` / `state=movable`
  - `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`
- **Open questions:**
  - нет

## 2026-08-13 task-update WUI-5032 CollectDiagnosticsRequested upload

- **Type:** task-update
- **Summary:** Admin collect идёт WS `CollectDiagnosticsRequested` → HTTP `POST /api/v1/me/diagnostics/upload` → `DiagnosticsUploadReported`. Это не CON-WS-4 `DebugSnapshot`. Dev proxy `/api/v1/me/diagnostics` на additional backend.
- **Updated pages:**
  - `backend-integration/turret-aps-ws.md`
  - `backend-integration/api-routing.md`
- **Sources:**
  - `src/shared/turret-admin-ws/useTurretAdminWs.ts`
  - `src/features/diagnostics/model/use-diagnostics-admin-collect.ts`
  - `src/features/diagnostics/api/use-diagnostics-upload-api.ts`
  - `vite.config.ts`
  - `.ai/tasks/WUI-5032/implementation_plan_2.md`
  - Уточнение пользователя от 2026-08-13
- **Open questions:**
  - нет

## 2026-08-13 task-update WUI-5032 CON-WS-3 command audit

- **Type:** task-update
- **Summary:** Исходящие команды sods после успешного send дублируются в Admin как `ControllerCommandLogged` из единого `_send` в `useController`.
- **Updated pages:**
  - `backend-integration/turret-aps-ws.md`
- **Sources:**
  - `src/shared/controller/useController.ts`
  - `src/shared/turret-admin-ws/useTurretAdminWs.ts`
  - `.ai/tasks/WUI-5032/implementation_plan_1.md`
- **Open questions:**
  - нет

## 2026-08-13 task-update WUI-5032 hardwareSerial fallback

- **Type:** task-update
- **Summary:** `hardwareSerial` не берём из `hub.serial`, если это `UNKNOWN`; fallback на `hub.mcu_uuid`, иначе Admin создаёт вторую запись оборудования.
- **Updated pages:**
  - `backend-integration/turret-aps-ws.md`
- **Sources:**
  - Наблюдение пользователя от 2026-08-13 (Admin: serial `unknown` vs `c15d3333303038174e393733`)
  - `src/shared/controller/commandExecHandler.ts`
  - `.ai/tasks/WUI-4443/case.md`
- **Open questions:**
  - нет

## 2026-08-13 task-update WUI-5032 CON-WS-2 FSM gaps

- **Type:** task-update
- **Summary:** CON-WS-2: logout шлёт `CONNECTED_UNAUTH` и оставляет WS; `hardwareSerial` = hub.`serial`; `READY` только при mac+serial; отвал sods даунгрейдит в `AUTHENTICATED`.
- **Updated pages:**
  - `backend-integration/turret-aps-ws.md`
- **Sources:**
  - Уточнение пользователя от 2026-08-13 (WUI-5032)
  - `src/shared/turret-admin-ws/useTurretAdminWs.ts`
  - `src/shared/controller/commandExecHandler.ts`
  - `C:/Users/d.sokolov/Desktop/projects/dealing-admin/docs/turret-aps.md`
- **Open questions:**
  - Нужно ли передавать `capabilities`.

## 2026-07-24 task-update hangup pinned to goose full bind

- **Type:** task-update
- **Summary:** Hangup трубки с подхваченной pinned-сессией → полный `bindSessionToDevice` на goose (не только affinity), иначе mic остаётся на handset.
- **Updated pages:**
  - `domain/pinned-calls.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-24 (WUI-5185, обратный сценарий)
  - `src/shared/controller/event-handlers/handsetEventHandler.ts`
- **Open questions:**
  - нет

## 2026-07-24 task-update release pinned to handset full bind

- **Type:** task-update
- **Summary:** Connected сессия при снятии с завешенных → полный `bindSessionToDevice` на handset (не только affinity), иначе mic остаётся на goose.
- **Updated pages:**
  - `domain/pinned-calls.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-24 (WUI-5185)
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- **Open questions:**
  - нет

## 2026-07-24 task-update groups/reorder + optimistic swap

- **Type:** task-update
- **Summary:** `swapGroups` → `PUT groups/reorder` (`fromIndex`/`toIndex`); optimistic UI + rollback; panel DTO groups не применяем (stale). Закрыт open question по контракту reorder.
- **Updated pages:**
  - `domain/broadcast-groups.md`
  - `product/open-questions.md`
- **Sources:**
  - Уточнение пользователя / backend от 2026-07-24 (WUI-5293)
  - `.ai/knowledge/raw/jira/WUI-5293-groups-reorder-endpoint.md`
  - `.ai/tasks/WUI-5293/implementation_plan_4.md`
- **Open questions:**
  - нет

## 2026-07-24 task-update PanelStatus click-to-retry

- **Type:** task-update
- **Summary:** Error-заглушка `PanelStatus` кликабельна → emit `retry`; pinned / broadcast / quick-call / workspace делают force-refetch.
- **Updated pages:**
  - `frontend/components.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-24
  - `src/shared/ui/panel-status/PanelStatus.vue`
- **Open questions:**
  - нет

## 2026-07-24 task-update clearSlot removes group members in UI

- **Type:** task-update
- **Summary:** После успешного clear pinned slot UI локально убирает member из всех broadcast groups (backend уже чистит; DELETE не шлём).
- **Updated pages:**
  - `domain/pinned-calls.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-24 (404 на DELETE после clear)
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- **Open questions:**
  - нет

## 2026-07-24 task-update broadcast move left/right + pending groups/reorder

- **Type:** task-update
- **Summary:** Move left/right для бродкаст-групп (swap с соседом по index). Временно dual PUT; backend планирует атомарный `groups/reorder`.
- **Updated pages:**
  - `domain/broadcast-groups.md`
  - `product/open-questions.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-24
  - `.ai/tasks/WUI-5293/implementation_plan_3.md`
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- **Open questions:**
  - Контракт OpenAPI для `groups/reorder`

## 2026-07-24 task-update broadcast empty slots keep position

- **Type:** task-update
- **Summary:** Вне edit пустые ячейки бродкаст-сетки остаются как невидимый пробел (позиции не схлопываются). Промпт «создать группы» — только если ни у одной группы нет members.
- **Updated pages:**
  - `domain/broadcast-groups.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-24
  - `src/widgets/broadcast-groups-panel/model/use-broadcast-groups-grid.ts`
  - `.ai/tasks/WUI-5293/case.md`
- **Open questions:**
  - нет

## 2026-07-23 task-update pinnedline card matrix + VAD wiki

- **Type:** task-update
- **Summary:** Зафиксирована визуальная матрица карточки завешенной (mic/volume, dual-mode status, local/remote hold, selection hov, VAD, slot index). Unit-тесты view-model расширены.
- **Updated pages:**
  - `domain/pinned-calls.md`
- **Sources:**
  - `.ai/tasks/WUI-5185/case.md` (часть 4)
  - `.ai/tasks/WUI-5185/implementation_plan_5.md` шаг 4
  - `src/widgets/pinned-calls-panel/model/pinned-call-slot-card-view.ts`
  - Уточнения пользователя от 2026-07-23
- **Open questions:**
  - Точные значения `pinnedline-slot-*` из core developerV

## 2026-07-23 task-update pinned slot index badge

- **Type:** task-update
- **Summary:** Бейдж `slotIndex` на карточках с дублем pServed; токены `pinnedline-slot-{dis|def|act}` (в developerV пока не было — добавлены по Figma-путям).
- **Updated pages:**
  - `domain/pinned-calls.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-23
  - `src/widgets/pinned-calls-panel/ui/PinnedCallsPanelSlotCard.vue`
  - `src/app/assets/styles/light-1.css` / `lsDark-1.css`
- **Open questions:**
  - Сверить точные значения `slot/*` с выгрузкой designerV, когда появятся в core

## 2026-07-23 task-update pinned calls grid fill/scroll

- **Type:** task-update
- **Summary:** Сетка завешенных: при достаточной высоте ряды растягиваются (`minmax(106px, 1fr)`); при нехватке — минимум 106px и scroll.
- **Updated pages:**
  - `domain/pinned-calls.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-23
  - `src/widgets/pinned-calls-panel/ui/PinnedCallsPanel.vue`
  - `src/entities/pinned-calls/model/types.ts`
- **Open questions:**
  - —

## 2026-07-23 task-update pinned calls 21 slots

- **Type:** task-update
- **Summary:** Backend расширен до 21 завешенной линии; UI и API max order синхронизированы (`PINNED_CALLS_UI_SLOT_COUNT` = `PINNED_CALLS_API_MAX_ORDER` = 21).
- **Updated pages:**
  - `domain/pinned-calls.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-23
  - `src/entities/pinned-calls/model/types.ts`
- **Open questions:**
  - —

## 2026-07-22 task-update WUI-5293 broadcast groups

- **Type:** task-update
- **Summary:** Зафиксированы бродкаст-группы: раскладка 4/8, index `0..7`, audio override (mic OR / volume last-action / mute max), VAD (`remoteVoiceLevel`), footer visual matrix. UI — `widgets/broadcast-groups-panel`.
- **Updated pages:**
  - `domain/broadcast-groups.md` (создана)
  - `domain/pinned-calls.md`
  - `index.md`
- **Sources:**
  - `.ai/tasks/WUI-5293/case.md`
  - `.ai/tasks/WUI-5293/implementation_plan_1.md`
  - `src/widgets/broadcast-groups-panel/**`
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
  - Уточнения пользователя от 2026-07-21/22
- **Open questions:**
  - Confluence publish; иконка `userWaveM` когда появится в common-library

## 2026-07-20 task-update preferred goose mid-call rebind

- **Type:** task-update
- **Summary:** Смена preferred Goose во время активных завешенных перепривязывает panel-сессии на новый goose (`rebindPanelSessionsToPreferredGoose`); сессии на handset не трогаем.
- **Updated pages:**
  - `domain/devices.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-20
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
  - `src/entities/media-devices-settings/model/use-goose-media-settings.ts`

## 2026-07-20 decision goose-settings-api draft

- **Type:** decision
- **Summary:** Draft REST-модели для goose settings (Media Devices, 3 поля) и line key bindings (Клавиши линий, normalized keyIndex). Scope per user; target migrate localStorage + IM preferences to backend.
- **Updated pages:**
  - `backend-integration/goose-settings-api.md`
  - `backend-integration/index via index.md`
  - `domain/devices.md`
  - `domain/speakers-ptt.md`
- **Sources:**
  - `.ai/tasks/WUI-5185/case.md`
  - `src/shared/composables/state/devices-store/use-devices-store.ts`
  - `src/entities/binding-contacts/model/use-binding-controller-buttons-store.ts`
  - Уточнение пользователя от 2026-07-20
- **Open questions:**
  - PUT replace-all vs PATCH; orphan bindings cleanup strategy

## 2026-07-20 task-update WUI-5185 PTT activePinned on panel store

- **Type:** task-update
- **Summary:** PTT `activePinned` переведён с legacy `activePinnedCall` на `usePinnedCallsPanelStore.activeSlotOrder` + override; WUI-3825 — mic только при speak press, UI line mic заблокирован. Заполнен `speakers-ptt.md`; обновлены devices/pinned-calls про preferred goose.
- **Updated pages:**
  - `domain/speakers-ptt.md`
  - `domain/devices.md`
  - `domain/pinned-calls.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-5185/implementation_plan_4.md`
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
  - `src/shared/controller/event-handlers/gooseEventHandler.ts`
- **Open questions:**
  - Persist Goose settings на backend API

## 2026-07-20 task-update WUI-5185 WidgetViewport for pinned grid

- **Type:** task-update
- **Summary:** Сетка завешенных перешла с CSS-порога 520px на явный `WidgetViewport` (monopoly → 3, two-thirds/half → 2, one-third → 1). Инфраструктура в `entities/workspace`; в p2 подключена только pinned panel.
- **Updated pages:**
  - `domain/pinned-calls.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-5185/implementation_plan_3.md`
  - `src/entities/workspace/model/widget-viewport.ts`
  - `src/widgets/pinned-calls-panel/model/use-pinned-calls-grid-columns.ts`
- **Open questions:**
  - Миграция ПБВ и других виджетов на тот же паттерн — отдельно.

## 2026-07-18 task-update WUI-5185-p2 group audio override

- **Type:** task-update
- **Summary:** Зафиксирован store-контракт `applyGroupAudioToMembers`: group mic/volume только на members, non-members не трогаем; без UI групп.
- **Updated pages:**
  - `domain/pinned-calls.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-5185/case.md`
  - `.ai/tasks/WUI-5185/implementation_plan_2.md` (шаг 7)
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- **Open questions:**
  - UI групп / REST sync
  - Нужен ли numeric group volume вместо boolean volumeState

## 2026-07-18 task-update WUI-5185-p2 pinned call card

- **Type:** task-update
- **Summary:** Call card для завешенных: `openPinnedPanelSession` без handset bind; без history; очередь из bound pinned-сессий; hold из карточки; transfer скрыт. Сетка 15 (цель 21), edit menu, dial/answer/cancel, runtime mic/volume, footer override.
- **Updated pages:**
  - `domain/pinned-calls.md`
  - `domain/calls.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-5185/case.md`
  - `.ai/tasks/WUI-5185/implementation_plan_2.md` (шаг 6)
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/widgets/pinned-calls-panel/model/use-pinned-calls-panel-slot-actions.ts`
- **Open questions:**
  - Финальный лимит слотов 15/16/21
  - Backend cleanup group members при clear slot

## 2026-07-16 task-update ПБВ empty groups shows +

- **Type:** task-update
- **Summary:** При отсутствии групп ПБВ показывает empty «Список групп пуст» в области сетки и одновременно tabs-block с `+` (tabs вынесены из PanelStatus).
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `log.md`
- **Sources:**
  - Уточнение пользователя от 2026-07-16
  - `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
- **Open questions:**
  - Нет

## 2026-07-15 task-update WUI-4864 card tones and call-disabled

- **Type:** task-update
- **Summary:** Карточки ПБВ переведены на theme-токены (`card-neutcon` / `card-state-*`). Unavailable звонок (нет goose/handset) показывает `CONTACT_CARD_DISABLED_TONE` без бордера; клик no-op. Пустая ячейка — `my-btn` alpha + `card-add-brd-base-def`.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-4864/case.md` (уточнения 2026-07-15)
  - `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`
  - `src/widgets/quick-call-panel/model/use-quick-call-contact-call/use-quick-call-contact-call.ts`
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - `src/widgets/quick-call-panel/ui/QuickCallGrid.vue`
- **Open questions:**
  - Нет

## 2026-07-13 task-update WUI-4448-design workspace UI and ContextMenu

- **Type:** task-update
- **Summary:** Зафиксированы view/edit mode рабочих столов, пять draft-слотов, shared `ContextMenu` (data-driven items, cursor/activator anchor), store actions `moveWorkspaceWidget` / `replaceWorkspaceWidget` / `deleteWorkspaceSnapshot`, header menu `setSquareM` и блокировка кликов по виджетам в edit mode.
- **Updated pages:**
  - `frontend/stores.md`
  - `frontend/components.md`
  - `frontend/routing.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-4448-design/implementation_plan_1.md`
  - `src/shared/ui/context-menu/`
  - `src/entities/workspace/model/use-workspace-store.ts`
  - `src/pages/main/ui/workspace/WorkspacePage.vue`
  - `src/widgets/app-header/ui/WorkspaceSwitchers.vue`
- **Open questions:**
  - Нет

## 2026-07-09 task-update WUI-5200 phonebook table pagination

- **Type:** task-update
- **Summary:** Зафиксированы особенности использования `wui-data-table` для страницы справочника: `autoPerPageByHeight` в библиотеке включен по умолчанию и должен отключаться явно для фиксированного `perPage`, а `hide-per-page-selector` скрывает selector, но оставляет правый текстовый блок paginator. Для `PhoneBookPanel` применен фиксированный `perPage`, зависящий от скрытия верхнего workspace header.
- **Updated pages:**
  - `frontend/components.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-5200/case.md`
  - `src/widgets/phone-book/ui/PhoneBookPanel.vue`
  - `C:/Users/d.sokolov/Desktop/projects/common-library/lib/components/data-table/wui-data-table.vue`
  - `C:/Users/d.sokolov/Desktop/projects/common-library/lib/components/data-table/use-data-table-per-page.ts`
  - Уточнение пользователя от 2026-07-09
- **Open questions:**
  - Нет
## 2026-07-07 task-update WUI-5185 pinned calls groups store

- **Type:** task-update
- **Summary:** Зафиксирована новая REST-модель pinned calls для WUI-5185: 15 UI-слотов на монопольной странице, runtime `sessionId` только на фронте, несколько слотов на один `pServed` через `slotIndex`, группы как часть единой panel-модели backend с index `0..6` и future UI-лейблом `1..7`. Store подготовлен к странице групп через `groupCells`, lookup helpers и group actions.
- **Updated pages:**
  - `domain/pinned-calls.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-5185/case.md`
  - `.ai/tasks/WUI-5185/implementation_plan_1.md`
  - `src/entities/pinned-calls/model/types.ts`
  - `src/entities/pinned-calls/model/normalizers.ts`
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
- **Open questions:**
  - Нужно подтвердить финальное ограничение backend: 15 или 16 слотов.
  - Нужно подтвердить, чистит ли backend group members при очистке слота.
  - Нужно отдельно согласовать модель устройств/Goose/microphone для слотов и групп.

## 2026-07-03 task-update WUI-5081 call card session model

- **Type:** task-update
- **Summary:** Зафиксирована модель состояний карточки вызова 3.0: `tone` для цветовой схемы, `controlLayout` для нижней панели действий, правила цветов и иконок для `outgoing`, `incoming`, `active`, `hold`, а также связь выбранной трубки footer с карточкой вызова.
- **Updated pages:**
  - `domain/calls.md`
  - `domain/handsets.md`
  - `log.md`
- **Sources:**
  - `.ai/tasks/WUI-5081/case.md`
  - `.ai/tasks/WUI-5081/implementation_plan_4.md`
  - `src/features/call-card/model/types.ts`
  - `src/features/call-card/model/call-card-session-view.ts`
  - `src/features/call-card/ui/CallCardSessionState.vue`
  - Уточнение пользователя от 2026-07-03
- **Open questions:**
  - Transfer mode и SIP/WebRTC-контракт переводов будут согласованы отдельной частью.

## 2026-06-30 task-update WUI-5083 footer handsets

- **Type:** task-update
- **Summary:** Зафиксирована модель двух трубок footer: всегда выбрана одна трубка, статус линии на каждой трубке независим от выбранности, выбранность переключает только `active/inactive` внутри статусной цветовой группы.
- **Updated pages:**
  - `index.md`
  - `domain/handsets.md`
  - `log.md`
- **Sources:**
  - Уточнение пользователя от 2026-06-30
  - `src/widgets/app-footer/ui/FooterHandsetControls.vue`
  - `src/widgets/app-footer/ui/FooterHandsetButton.vue`
  - `src/widgets/app-footer/test/FooterHandsetControls.test.ts`
  - `src/widgets/app-footer/test/FooterHandsetButton.test.ts`
- **Open questions:**
  - Полный список статусов линии и backend/store-контракт для двух трубок будут уточняться в отдельном кейсе.

## 2026-06-17 task-update WUI-4864 external contact type and calls

- **Type:** task-update
- **Summary:** Зафиксировано восстановление внешнего контакта из backend DTO через `contactType: 'externalContact'`, а также правило ПБВ: внешний контакт может быть визуально offline из-за отсутствия SIP/BLF presence, но клик по карточке должен запускать звонок при наличии номера. Созданный через API внешний контакт сразу добавляется в выдачу `ChangeContactsModal` и дальше используется с backend `guid`.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `backend-integration/api-routing.md`
  - `log.md`
- **Sources:**
  - `src/entities/contact/utils.ts`
  - `src/entities/contact/model/use-contact-store.ts`
  - `src/entities/contact/model/use-contact-cached-store.ts`
  - `src/shared/ui/modals/change-contacts-keyboard/ChangeContactsModal.vue`
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - `src/entities/contact/test/use-contact-cached-store.test.ts`
  - `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`
  - Уточнение пользователя от 2026-06-17
- **Open questions:**
  - Backend должен стабильно возвращать `contactType: 'externalContact'` для внешних контактов во всех contact DTO, которые использует ПБВ.

## 2026-06-17 task-update WUI-4864 quick-call external contacts

- **Type:** task-update
- **Summary:** Зафиксировано backend-first создание внешних контактов для ПБВ: `ChangeContactsModal` получает `groupGuid` активной группы, создает внешний контакт через `POST /api/v1/user/client/contact`, возвращает backend contact с настоящим `guid`, а ПБВ сохраняет позицию в fast-dial без повторного добавления контакта в группу. IndexedDB остается временным fallback для старых сценариев модалки без `groupGuid`.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `backend-integration/api-routing.md`
  - `log.md`
- **Sources:**
  - `src/entities/contact/api/use-contact-api.ts`
  - `src/shared/ui/modals/change-contacts-keyboard/ChangeContactsModal.vue`
  - `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
  - Уточнение пользователя от 2026-06-17
- **Open questions:**
  - Backend пока может требовать `groupGuid` для создания контакта; frontend оставляет prop опциональным ради совместимости старых сценариев модалки.

## 2026-06-16 task-update WUI-4864 fast-dial layout

- **Type:** task-update
- **Summary:** Зафиксирована целевая модель сетки ПБВ: отображаются только `user` группы, старый backend `/api/user/groups` остается источником состава групп, fast-dial `/api/v1/me/fast-dial` хранит layout карточек, `contacts[].order` трактуется как `cellIndex`, сетка ограничена 36 ячейками, пустой fast-dial layout удаляется через `DELETE`.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `backend-integration/api-routing.md`
  - `log.md`
- **Sources:**
  - `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`
  - `src/entities/fast-dial/model/types.ts`
  - `src/entities/fast-dial/model/normalizers.ts`
  - `src/entities/fast-dial/model/use-fast-dial-store.ts`
  - `src/widgets/quick-call-panel/model/use-quick-call-fast-dial-grid/use-quick-call-fast-dial-grid.ts`
  - `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
  - Уточнение пользователя от 2026-06-16
- **Open questions:**
  - Нет.

## 2026-06-08 task-update WUI-4864 quick-call add contact

- **Type:** task-update
- **Summary:** Зафиксировано финальное поведение edit mode ПБВ для текущей части WUI-4864: контакт добавляется в активную группу через существующую `BindingContactModal`; перед backend-запросом выполняется локальная проверка дубля в активной группе; backend-состав группы обновляется через `GET /api/user/groups/{guid}` и `PUT /api/user/groups/{guid}` с новым `contactGuids`; `cellIndex` и порядок карточек пока остаются локальным frontend layout в `useQuickCallGrid`.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `log.md`
- **Sources:**
  - `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
  - `src/widgets/quick-call-panel/model/use-quick-call-contact-transfer/use-quick-call-contact-transfer.ts`
  - `src/widgets/quick-call-panel/model/use-workspace-group-contacts/use-workspace-group-contacts.ts`
  - `src/widgets/binding-contact/ui/BindingContactModal.vue`
  - Уточнение пользователя от 2026-06-08
- **Open questions:**
  - Когда появится отдельный backend order/positions, нужно заменить локальное сохранение `cellIndex` в `useQuickCallGrid` на backend-синхронизацию.

## 2026-06-04 task-update WUI-4864 quick-call contact move between groups

- **Type:** task-update
- **Summary:** Зафиксировано поведение перемещения контактов в ПБВ: внутри группы порядок временно меняется локально через `useQuickCallGrid` со swap при клике по занятой ячейке; между группами перенос абонентов РТУ выполняется через обновление состава групп: `GET /api/user/groups/{guid}`, затем `PUT /api/user/groups/{targetGroupGuid}` и `PUT /api/user/groups/{sourceGroupGuid}` с новым `contactGuids`. `PUT /api/user/contacts/{guid}` не подходит для `contactType: user`, потому что backend требует `ExternalContact`; `/api/v1/user/client/contact` не является целевым контрактом для ПБВ.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `log.md`
- **Sources:**
  - `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - `src/widgets/quick-call-panel/model/use-quick-call-contact-transfer/use-quick-call-contact-transfer.ts`
  - Jira-кейс RTU-12674 / WUI-3859: `PUT/POST /api/user/groups` принимает `contactGuids`
  - OpenAPI `GET /api/user/groups/{guid}`
  - OpenAPI `PUT /api/user/groups/{guid}`
  - Ответ backend `The Contact must have type 'ExternalContact'` для legacy `PUT /api/user/contacts/{guid}`
  - Уточнение пользователя от 2026-06-04
- **Open questions:**
  - Нет

## 2026-06-04 decision FSD internal imports

- **Type:** decision
- **Summary:** Уточнено правило импортов FSD: внешние импорты между слайсами идут через public API и alias, а внутренние импорты внутри одного слайса можно делать прямым локальным путем `./...`; alias-import во внутренний private path того же слайса запрещается линтом `no-restricted-imports`.
- **Updated pages:**
  - `frontend/architecture.md`
  - `log.md`
- **Sources:**
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - Уточнение пользователя от 2026-06-04
- **Open questions:**
  - Нет

## 2026-06-04 decision frontend clickable controls use wui-btn

- **Type:** decision
- **Summary:** Зафиксировано правило frontend UI: все новые кликабельные action controls должны реализовываться через `wui-btn` из `@wui/common-library`; иконка действия передается через `prepend-icon`, а вложенные кнопки внутри кликабельных контейнеров останавливают всплытие через `@click.stop`.
- **Updated pages:**
  - `frontend/components.md`
  - `index.md`
  - `log.md`
- **Sources:**
  - `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - Уточнение пользователя от 2026-06-04
- **Open questions:**
  - Нет


## 2026-06-02 task-update WUI-4864 split quick-call card statuses

- **Type:** task-update
- **Summary:** Обновлена модель статусов карточки панели быстрого вызова: вместо агрегированного `cardStatus` зафиксированы независимые слои `presence`, `selfStatus`, `subscriberStatus`; visual contract разделен на presence-тона по priority, self-тона без дублирования по priority, отдельный high/non-high тон для `incoming-self` и subscriber-иконки.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `domain/statuses.md`
  - `log.md`
- **Sources:**
  - `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.ts`
  - `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - Уточнение пользователя от 2026-06-02
- **Open questions:**
  - Финальная pixel perfect доводка визуала карточек выполняется пользователем отдельным шагом.

## 2026-06-03 task-update WUI-4864 subscriber icon online-only

- **Type:** task-update
- **Summary:** Уточнено правило отображения subscriber-статуса карточки панели быстрого вызова: subscriber-иконка применяется только для `online`; для `offline` карточка остается в базовом offline-тоне без subscriber-иконки. Обновлены тесты под Tailwind token classes вместо старых hex-классов.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `domain/statuses.md`
  - `log.md`
- **Sources:**
  - `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`
  - `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.test.ts`
  - `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`
  - Уточнение пользователя от 2026-06-03
- **Open questions:**
  - Нет


## 2026-06-03 decision frontend API layer placement

- **Type:** decision
- **Summary:** Зафиксировано правило размещения frontend backend-запросов: API-методы добавляются в entity API-слой соответствующей сущности; для контактов использовать и расширять `src/entities/contact/api/use-contact-api.ts`; widget-level код вызывает API через model/composable-слой, а не напрямую из Vue-компонентов.
- **Updated pages:**
  - `frontend/architecture.md`
  - `log.md`
- **Sources:**
  - `src/entities/contact/api/use-contact-api.ts`
  - `src/entities/contact/model/use-contact-filtering.ts`
  - `src/widgets/binding-contact/ui/BindingContactModal.vue`
  - `src/widgets/quick-call-panel/model/use-workspace-group-contacts/use-workspace-group-contacts.ts`
  - Уточнение пользователя от 2026-06-03
- **Open questions:**
  - Нужен ли отдельный entity/API-слой для управления принадлежностью контактов к группам, если эта логика выйдет за пределы `entities/contact`.


- **Type:** task-update
- **Summary:** Зафиксирована модель workspace snapshots: отдельный backend `/api/v1/me/snapshots`, три client draft slots при пустом/частичном ответе, локальный layout draft без сохранения до первого widget, создание/обновление/удаление snapshot через `POST`/`PUT`/`DELETE`, отсутствие `params` и frontend-generated ids в create body. Drag and drop исключён из текущей части реализации.
- **Updated pages:**
  - `frontend/stores.md`
  - `frontend/routing.md`
  - `backend-integration/api-routing.md`
  - `log.md`
- **Sources:**
  - `src/entities/workspace/model/use-workspace-store.ts`
  - `src/entities/workspace/model/types.ts`
  - `src/entities/workspace/api/use-workspace-api.ts`
  - `src/pages/main/ui/workspace/WorkspacePage.vue`
  - Уточнение пользователя от 2026-06-09
- **Open questions:**
  - Нет.


## 2026-06-24 task-update WUI-5084 media device stores

- **Type:** task-update
- **Summary:** Зафиксирована итоговая модель media devices для пульта 3.0: `devices-store` строит logical devices из browser audio endpoints и controller modules, `devices-sessions-store` отвечает за runtime binding сессий, WebRTC `replaceTrack`, handset/goose state и глобальный переключатель Goose mic для pinned calls. Legacy IndexedDB/profile sync для устройств в новой модели не используется.
- **Updated pages:**
  - `domain/devices.md`
  - `log.md`
- **Sources:**
  - `src/shared/composables/state/devices-store/use-devices-store.ts`
  - `src/shared/composables/state/devices-store/types.ts`
  - `src/shared/composables/state/devices-sessions-store/use-devices-sessions-store.ts`
  - `src/entities/call-session/model/use-pinned-calls-store.ts`
  - `src/shared/controller/commandExecHandler.ts`
  - Уточнения пользователя по WUI-5084 от 2026-06-24
- **Open questions:**
  - Какой backend-контракт будет хранить выбор Goose для конкретной группы завешенных.
  - Нужно ли пользователю настраивать audio processing параметры или они останутся дефолтами в коде.


## 2026-06-18 task-update WUI-4443 Turret APS WS base integration


- **Type:** task-update
- **Summary:** Зафиксирована интеграция Turret APS WS: endpoint `/ws/turret` на additional backend, старт WS до логина, lifecycle `SessionHello`/`SessionUpgrade`/heartbeat, стадии `AUTHENTICATED`/`CONTROLLER_ONLINE`/`READY`, источники `hardwareMac` и временного `hardwareSerial`.
- **Updated pages:**
  - `backend-integration/turret-aps-ws.md`
  - `index.md`
  - `log.md`
- **Sources:**
  - `src/shared/turret-admin-ws/useTurretAdminWs.ts`
  - `src/shared/controller/registerControllerEventHandler.ts`
  - `src/shared/controller/commandExecHandler.ts`
  - `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/schemas/turret.ts`
  - Уточнение пользователя от 2026-06-18
  - Анализ `C:/Users/d.sokolov/Downloads/localhost2.har` от 2026-06-18 без сохранения содержимого из-за JWT
- **Open questions:**
  - Нужно ли заменить временное правило `hardwareSerial = hub.mcu_uuid` на другой идентификатор пульта.


## 2026-06-02 task-update WUI-4864 quick-call card statuses

- **Type:** task-update
- **Summary:** Зафиксирована первая часть WUI-4864: карточка панели быстрого вызова теперь имеет отдельную модель `presence + cardStatus`; визуал выбирается по `CONTACT_CARD_TONES[priority][cardStatus]`; действия по клику и контекстное меню не добавлены.
- **Updated pages:**
  - `domain/quick-call-panel.md`
  - `domain/statuses.md`
  - `log.md`
- **Sources:**
  - `src/widgets/quick-call-panel/model/use-contact-card-presence/use-contact-card-presence.ts`
  - `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.ts`
  - `src/widgets/quick-call-panel/model/contact-card-tone/contact-card-tone.ts`
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`
  - Уточнение пользователя от 2026-06-02
- **Open questions:**
  - Какие конкретные status icons будут использоваться для звонковых статусов карточки в следующих частях.

## 2026-06-01 task-update WUI-4733 quick-call panel

- **Type:** task-update
- **Summary:** Зафиксированы знания по новой панели быстрого вызова: backend-группы как source of truth для табов, widget-level загрузка и кеш контактов активной группы, SIP/BLF presence-подписки, online/offline tone-модель карточки и отказ от preferences для табов.
- **Updated pages:**
  - `index.md`
  - `product/open-questions.md`
  - `domain/quick-call-panel.md`
  - `domain/statuses.md`
  - `frontend/stores.md`
  - `frontend/testing.md`
  - `backend-integration/sip-webrtc.md`
  - `backend-integration/im-preferences.md`
- **Sources:**
  - `src/entities/settings/contact-tabs/model/types.ts`
  - `src/entities/settings/contact-tabs/model/use-contact-tabs.ts`
  - `src/app/layout/LayoutApplication.vue`
  - `src/widgets/workspace-widget/ui/WorkspaceContactsWidget.vue`
  - `src/widgets/workspace-widget/model/use-workspace-group-contacts/use-workspace-group-contacts.ts`
  - `src/widgets/workspace-widget/model/use-workspace-contact-status-subscription/use-workspace-contact-status-subscription.ts`
  - `src/widgets/workspace-widget/model/use-contact-card-presence/use-contact-card-presence.ts`
  - `src/widgets/workspace-widget/model/contact-card-tone/contact-card-tone.ts`
  - `src/widgets/workspace-widget/ui/WorkspaceContactCard.vue`
  - `src/entities/preference/model/use-preference.ts`
  - Уточнение пользователя от 2026-06-01
- **Open questions:**
  - Какой backend-контракт будет у будущего priority контакта или пользователя внутри группы.
  - Нужен ли workspace-scoped cleanup SIP-подписок при активном переключении большого количества групп.

## 2026-06-01 ingest Инициализация структуры project wiki

- **Type:** ingest
- **Summary:** Создана базовая структура `.ai/knowledge/` с raw-директориями и стартовыми wiki-страницами.
- **Updated pages:**
  - `index.md`
  - `log.md`
  - `product/overview.md`
  - `product/glossary.md`
  - `product/open-questions.md`
  - `domain/calls.md`
  - `domain/pinned-calls.md`
  - `domain/devices.md`
  - `domain/speakers-ptt.md`
  - `domain/conferences.md`
  - `domain/directory.md`
  - `domain/statuses.md`
  - `domain/quick-call-panel.md`
  - `frontend/architecture.md`
  - `frontend/routing.md`
  - `frontend/stores.md`
  - `frontend/testing.md`
  - `electron/electron-overview.md`
  - `electron/preload.md`
  - `electron/ipc.md`
  - `backend-integration/sip-webrtc.md`
  - `backend-integration/controller-ws.md`
  - `backend-integration/im-preferences.md`
  - `decisions/README.md`
- **Sources:**
  - Уточнение пользователя от 2026-06-01
- **Open questions:**
  - Нет
