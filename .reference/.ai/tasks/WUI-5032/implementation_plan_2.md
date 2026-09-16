# Кейс: WUI-5032 — CollectDiagnosticsRequested → HTTP upload

## Описание текущей части кейса

Админ шлёт на пульт `CollectDiagnosticsRequested`. Console собирает локальный HAR/snapshot (уже redact), грузит файл `POST /api/v1/me/diagnostics/upload` и подтверждает маленьким WS `DiagnosticsUploadReported`. Кнопки «отправить» в UI нет. CON-WS-4 / `DebugSnapshot` не трогаем.

Проверенный inbound:

```text
type: CollectDiagnosticsRequested
payload: { correlationId, kind: "har", periodMinutes: 30, includeBodyPreview: false }
```

## Контекст предыдущих частей

- `implementation_plan_1.md` — CON-WS-3 `ControllerCommandLogged`.
- Сбор логов renderer/main/HAR уже есть из WUI-4685 (`features/diagnostics`, Electron IPC). Upload и WS-команда на Console ещё не подключены.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/backend-integration/turret-aps-ws.md`
- `.ai/knowledge/wiki/backend-integration/api-routing.md`
- `.ai/knowledge/wiki/electron/ipc.md`

Контракт Admin: `dealing-admin/docs/turret-aps.md`, `server/schemas/diagnostics.ts`, `server/schemas/turret.ts`.

## Согласованный дизайн

```text
Admin POST /api/v1/turret/diagnostics/collect
        │
        ▼
WS CollectDiagnosticsRequested  →  Console
        │
        ├─ kind=har       → artifacts.networkHar.log  (Electron main; web — renderer snapshot)
        ├─ kind=snapshot  → DiagnosticSnapshot JSON
        └─ kind=archive   → JSON { snapshot, har } без новой zip-зависимости
        │
        ▼
POST /api/v1/me/diagnostics/upload  (MOA JWT, additional backend)
        │
        ▼
WS DiagnosticsUploadReported { correlationId, uploadId, kind, byteSize }
```

### Правила

- `correlationId` только из команды, свой не генерить.
- Файл уже после redact (текущий snapshot pipeline).
- `periodMinutes` → `filter.period.from/to`. Нет поля — как в модалке, last 1h.
- `categories` если есть — в filter snapshot; для `kind=har` HAR всё равно собираем.
- `includeBodyPreview: false` — вычистить HAR `response.content.text` / preview тел перед файлом.
- `shared/turret-admin-ws` не импортирует `features/diagnostics` (FSD). Shared только парсит команду и зовёт зарегистрированный handler; сбор/upload живут в `features/diagnostics`.
- Web: нет `electronAPI.getDiagnosticsSnapshot` → всё равно POST: renderer snapshot (для `har` тоже, чтобы «хоть что-то» ушло).
- Ошибка POST / сборки: `console.warn` (+ diagnostic event), **без** `DiagnosticsUploadReported`.
- `archive` = один `application/json` (или gzip, если `CompressionStream` есть), не `.zip` и без новых npm-зависимостей.
- Dev proxy: `/api/v1/me/diagnostics` → additional backend, иначе upload уйдёт на основной API.

# План реализации: диагностика по команде Admin

## Шаг 1: WS-контракт CollectDiagnosticsRequested / DiagnosticsUploadReported

- **Описание:** Расширить turret types. В `handleMessage` добавить ветку `CollectDiagnosticsRequested` → зарегистрированный callback. Добавить `sendDiagnosticsUploadReported`. Экспорт `onCollectDiagnosticsRequested` / unsubscribe.
- **Файлы для изменений:**
  - `src/shared/turret-admin-ws/types.ts`
  - `src/shared/turret-admin-ws/useTurretAdminWs.ts`
  - `src/shared/turret-admin-ws/index.ts`
  - `src/shared/turret-admin-ws/useTurretAdminWs.test.ts`
- **Ожидаемый результат:** Входящая команда не теряется в switch; можно отправить typed report; shared не знает про HAR/upload.
- **Проверка:** `npx vitest run src/shared/turret-admin-ws/useTurretAdminWs.test.ts`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Proxy + POST upload API

- **Описание:** Прокси `/api/v1/me/diagnostics` на additional backend. API `uploadDiagnosticsArchive` через `getAdditionalApiURL` + axios multipart (`file`, `correlationId`, `kind`, опционально `connectionId` / `hardwareMac` / `hardwareSerial` / `consoleType: dealing` / `metadata` JSON-строкой). Content-Type файла: `application/json` (или gzip). Ответ: `upload.id`, `byteSize`.
- **Файлы для изменений:**
  - `vite.config.ts`
  - `src/features/diagnostics/api/` (новый, через public API слайса)
  - `src/features/diagnostics/index.ts`
- **Ожидаемый результат:** Upload бьёт в dealing-admin, не в MOA `/api`.
- **Проверка:** Ручная по Network после шага 3; на этом шаге — код + ts.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (wiki в шаге 5)

## Шаг 3: Сбор файла и handler команды

- **Описание:** В `features/diagnostics` собрать payload по `kind` / периоду / `includeBodyPreview`: renderer snapshot + IPC main snapshot (если Electron) + merge. Зарегистрировать handler из App bootstrap. Успех POST → `sendDiagnosticsUploadReported`. Ошибка → warn, без WS report.
- **Файлы для изменений:**
  - `src/features/diagnostics/model/` (collect-for-admin helper/composable)
  - `src/features/diagnostics/index.ts`
  - `src/app/App.vue` (старт handler рядом с существующей инициализацией diagnostics)
- **Ожидаемый результат:** Команда с админки, как в логе пульта, приводит к файлу в `GET /api/v1/turret/diagnostics` и WS report.
- **Проверка:** Ручная: Admin collect `kind=har` → Console POST → Admin список/download. Повторить `snapshot` и `archive`. Web: уходит хотя бы renderer JSON.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Тесты collect/upload маппинга

- **Описание:** AAA на период, kind→файл, strip body preview, web fallback без electronAPI. Мок axios/WS по существующему паттерну слайса.
- **Файлы для изменений:** тесты рядом с collect helper / api
- **Ожидаемый результат:** Регрессия маппинга команды на filter/kind ловится без SIP.
- **Проверка:** vitest по новым тестам
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Wiki

- **Описание:** Зафиксировать поток Admin collect → Console upload → report. Proxy `/api/v1/me/diagnostics`. Это не CON-WS-4.
- **Файлы для изменений:**
  - `.ai/knowledge/wiki/backend-integration/turret-aps-ws.md`
  - `.ai/knowledge/wiki/backend-integration/api-routing.md`
  - `.ai/knowledge/wiki/log.md`
- **Ожидаемый результат:** Следующие задачи не путают HAR-upload с `DebugSnapshot`.
- **Проверка:** чтение wiki
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: страницы выше
