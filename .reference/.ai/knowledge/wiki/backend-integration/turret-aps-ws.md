# Turret APS WebSocket

## Назначение

Страница фиксирует интеграцию `dealing-console-ui` с Turret APS WebSocket в `dealing-admin`.

## Текущее понимание

Turret APS WebSocket находится на additional backend и использует endpoint `/ws/turret`. Frontend строит WS URL на основе `VITE_ADDITIONAL_API_URL`; отдельный env для Turret APS не нужен, пока endpoint живёт на том же backend, что и additional API.

Console открывает WS при старте приложения, включая страницу логина. После открытия отправляется `SessionHello`, после успешной авторизации Console отправляет `SessionUpgrade` с MOA access token. Для поддержания сессии Console отправляет `SessionHeartbeat` примерно раз в 30 секунд.

При logout Console не закрывает Turret APS WS: отправляется `SessionStageChanged { stage: CONNECTED_UNAUTH }`, затем очищается token. Следующий login делает `SessionUpgrade` на том же соединении.

После успешной отправки wire-команды на локальный controller WS Console дублирует её в Admin как `ControllerCommandLogged` (`direction: console_to_hardware`). Это audit, не управление железом. Если Turret APS WS закрыт, команда на sods всё равно уходит.

Admin может запросить диагностику пульта сообщением `CollectDiagnosticsRequested`. Console собирает локальный snapshot/HAR, грузит файл HTTP `POST /api/v1/me/diagnostics/upload` и подтверждает маленьким `DiagnosticsUploadReported`. Это не CON-WS-4: файл не уходит snapshot-ом по WS.

## Lifecycle стадий

- `CONNECTED_UNAUTH` — серверная стадия после открытия WS до авторизации; Console также шлёт её при logout.
- `AUTHENTICATED` — стадия после успешного `SessionUpgradeAck`; Console также шлёт её при отвале sods, если абонент ещё авторизован.
- `CONTROLLER_ONLINE` — отправляется после `register_answer` локального controller WS со `state: accept_registration`, пока ещё нет пары MAC+serial.
- `READY` — отправляется только когда известны и `hardwareMac`, и `hardwareSerial`.

## Источники аппаратных идентификаторов

- `hardwareMac` берётся из ответа локального controller WS на `sysinfo:netinfo`: `return_value.interfaces[].mac_address`.
- `hardwareSerial` берётся из hub-модуля ответа `sysinfo:modulesinfo`: `return_value.modules[]`, где `id === "hub"`. Сначала `serial` (серийный номер ЦВМ), если это не пустое/`UNKNOWN`; иначе `mcu_uuid`. На текущем железе `hub.serial` приходит как `UNKNOWN`, поэтому в Admin уходит `mcu_uuid`.
- `register_answer` сам по себе не содержит MAC/serial, только факт принятия регистрации.

## Правила и ограничения

- Не смешивать Turret APS WS с локальным controller WS `ws://127.0.0.1:8765`: это разные интеграции.
- Turret APS WS не должен стартовать в `LayoutApplication.vue`, потому что layout доступен только после авторизации.
- Logout не должен закрывать Turret APS WS; закрытие — только при unload вкладки.
- При `CONTROLLER_DISCONNECTED` Console даунгрейдит стадию до `AUTHENTICATED` (если есть сессия) или `CONNECTED_UNAUTH`.
- `capabilities` пока не передаются.
- Входящая команда Admin→Console в коде сейчас одна: `CollectDiagnosticsRequested`. CON-WS-4 (`DebugCollectRequested` → `DebugSnapshot` по WS) не реализован и не должен подменяться HAR-upload.
- Исходящие sods-команды логируются через `_send` в `useController.ts`: `wireModel`/`wireName` из `model`/`name`, `wirePayload` — остаток объекта, `correlationId` — `uid` если UUID.
- HAR-файлы с WS-трафиком могут содержать JWT в `SessionUpgrade`; их нельзя сохранять в project wiki/raw без очистки секретов.

## Диагностика по команде Admin

Поток:

```text
Admin POST /api/v1/turret/diagnostics/collect
        │
        ▼
WS CollectDiagnosticsRequested  →  Console
        │
        ├─ kind=har       → artifacts.networkHar.log  (Electron main; web — renderer snapshot)
        ├─ kind=snapshot  → DiagnosticSnapshot JSON
        └─ kind=archive   → JSON { snapshot, har } без zip
        │
        ▼
POST /api/v1/me/diagnostics/upload  (MOA JWT, additional backend)
        │
        ▼
WS DiagnosticsUploadReported { correlationId, uploadId, kind, byteSize }
```

Правила:

- `correlationId` берётся только из команды, Console свой не генерирует.
- Кнопки «отправить» в UI пульта нет: collect стартует по WS.
- Файл уже после redact текущего snapshot pipeline.
- `periodMinutes` → `filter.period.from/to`, `preset: custom`, `limit: 500`. Нет поля или значение не положительное — 60 минут.
- `categories` если есть — в filter snapshot; неизвестные категории отбрасываются.
- `includeBodyPreview === true` оставляет HAR `postData.text` / `response.content.text`; иначе тела вычищаются.
- `shared/turret-admin-ws` не импортирует `features/diagnostics`. Shared парсит команду и зовёт `onCollectDiagnosticsRequested`; сбор и upload живут в `features/diagnostics` (`startDiagnosticsAdminCollect` из `App.vue`).
- Electron: renderer snapshot + `window.electronAPI.getDiagnosticsSnapshot` + merge. Web / нет IPC → всё равно POST renderer snapshot (для `kind=har` тоже, чтобы ушло хотя бы что-то).
- Ошибка сбора или POST: `console.warn` и diagnostic event, **без** `DiagnosticsUploadReported`.
- Upload multipart: `file`, `correlationId`, `kind`; Console также шлёт `connectionId`, `consoleType: dealing`, `metadata` JSON. `hardwareMac` / `hardwareSerial` в текущем Console upload не заполняются.
- Тип файла — `application/json`. `archive` — один JSON `{ snapshot, har }`, не `.zip`.

## Связанные страницы

- `api-routing.md`
- `controller-ws.md`
- `../frontend/architecture.md`

## Источники

- `src/shared/turret-admin-ws/useTurretAdminWs.ts`
- `src/shared/turret-admin-ws/types.ts`
- `src/features/diagnostics/model/use-diagnostics-admin-collect.ts`
- `src/features/diagnostics/model/collect-diagnostics-for-admin.ts`
- `src/features/diagnostics/api/use-diagnostics-upload-api.ts`
- `src/app/App.vue`
- `src/shared/controller/useController.ts`
- `src/shared/controller/registerControllerEventHandler.ts`
- `src/shared/controller/commandExecHandler.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/schemas/turret.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/server/schemas/diagnostics.ts`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/docs/turret-aps.md`
- `C:/Users/d.sokolov/Desktop/projects/dealing-admin/docs/dealing-console-ui-turret-ws-tasks.md`
- Уточнение пользователя от 2026-06-18
- Уточнение пользователя от 2026-08-13 (WUI-5032: logout, serial, READY, sods offline)
- Уточнение пользователя от 2026-08-13 (WUI-5032: CollectDiagnosticsRequested → HTTP upload, не CON-WS-4)
- Анализ `C:/Users/d.sokolov/Downloads/localhost2.har` от 2026-06-18 без сохранения содержимого из-за JWT
- `.ai/tasks/WUI-5032/implementation_plan_2.md`

## Открытые вопросы

- Нужно ли передавать `capabilities` snapshot контроллера в `SessionStageChanged`.
