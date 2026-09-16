# WUI-5528 — контракт Media Devices API

Источник: `src/__mocks_/openapi.json` (Dealing Admin API, OpenAPI 3.0.3).  
Дата сверки: **2026-09-15** (обновление относительно сверки 2026-09-01).

## Важно: расхождение с черновиком фронта

Черновик `.ai/tasks/WUI-5444/backend-media-settings-model.md` (`GET/PUT /settings/media?stationId=`) **в OpenAPI нет**.

Фактический контракт бэка — **три ресурса** (для dealing console UI):

1. **Goose settings** — singleton **per user**.
2. **Media device overrides** — **per user + hardwareSerial** (GET/PATCH).
3. **Console media profile** — snapshot устройств по `hardwareSerial` (GET only, side-channel).

`stationId` **не используется**.

---

## Endpoints (dealing UI)

### 1. Goose settings

```text
GET  /api/v1/me/goose-settings  → GooseSettings
PUT  /api/v1/me/goose-settings  ← GooseSettingsPutBody → GooseSettings
```

Admin mirror: `/api/v1/users/{userId}/goose-settings` (+ `/import`).

**GooseSettings (response):**

```json
{
  "schemaVersion": 1,
  "preferredGooseModuleId": "goose_L1",
  "mode": "stateful",
  "pttScope": "standard"
}
```

| Поле | Тип | UI Media |
|------|-----|----------|
| `schemaVersion` | `1` | pass-through |
| `preferredGooseModuleId` | `string \| null` | select «Goose для завешенных» |
| `mode` | `stateful` \| `pushToTalk` | select режима |
| `pttScope` | `standard` \| `activePinned` | select PTT (если mode = pushToTalk) |

**GooseSettingsPutBody:** все поля optional в schema (включая `schemaVersion`). На leave шлём полный snapshot dirty-полей + `schemaVersion: 1` (как у Main — явный full body с текущими значениями).

**Маппинг с клиента:**

| Runtime (`devices-store`) | API |
|---------------------------|-----|
| `preferredGooseId` | `preferredGooseModuleId` |
| `gooseMode` | `mode` |
| `goosePttScope` | `pttScope` |

Persist: **убрать** `localStorage` `dealing-console:goose-settings` → GET/PUT API.

---

### 2. Media device overrides (NEW в OpenAPI 2026-09-15)

```text
GET   /api/v1/me/media-device-overrides/{hardwareSerial}
  → MediaDeviceOverridesDto

PATCH /api/v1/me/media-device-overrides/{hardwareSerial}
  ← MediaDeviceOverridesPatchBody → MediaDeviceOverridesDto
```

Admin mirror: `/api/v1/users/{userId}/media-device-overrides/{hardwareSerial}`.

**Scope:** user + `hardwareSerial` (path). Смешанная модель с goose (goose per user, overrides per serial) — **зафиксировано OpenAPI**.

**MediaDeviceOverridesDto (response):**

```json
{
  "schemaVersion": 1,
  "hardwareSerial": "...",
  "devices": [
    {
      "logicalKey": "goose_L1",
      "enabled": true,
      "volume": 50,
      "echoCancellation": true,
      "noiseSuppression": true,
      "autoGainControl": true
    }
  ]
}
```

**MediaDeviceOverrideDevice (элемент GET):** все поля required: `logicalKey`, `enabled`, `volume` (0–100), `echoCancellation`, `noiseSuppression`, `autoGainControl`.

**MediaDeviceOverridesPatchBody:**

```json
{
  "devices": [
    {
      "logicalKey": "handset_L1",
      "volume": 60,
      "enabled": false
    }
  ]
}
```

**MediaDeviceOverridePatchDevice:** required только `logicalKey`; остальные поля optional (partial patch по устройствам).

**Ключ:** только `logicalKey` (`goose_L1`, `handset_L1`, `hub`, …). Не browser `deviceId`, не uuid.

**Merge на UI:**

```text
UI card = localLogicalDevice + (overrides[logicalKey] ?? defaults)
```

Defaults (если записи нет): `enabled: true`, `volume: 50`, AEC/noise/AGC — текущие runtime defaults.  
Orphans (override без локального устройства): в store держим, карточку не рисуем, на leave не delete.

---

### 3. Console media profile (snapshot, side-channel)

```text
GET /api/v1/me/turret-media-devices/{hardwareSerial}?consoleType=dealing
  → ConsoleMediaProfileResponse
```

Turret-side: `GET /api/v1/turret/media-devices/{hardwareSerial}`.

**Для Settings UI dealing-console:** список карточек = **локальная сборка** (`devices-store`). Snapshot **не** источник списка. GET profile в v1 Settings **не обязателен** (админка / инвентарь).

---

## Deprecated (не использовать)

```text
GET/PUT/DELETE /api/v1/me/media-devices-configs[/{id}]
```

---

## hardwareSerial — откуда брать

Из controller/turret:

- `useTurretAdminWs().updateControllerIdentity({ hardwareSerial })`
- `commandExecHandler` при `command_exec`

Нужен для **overrides** (и опционально profile). Для **goose-settings** — не нужен.

---

## Persist v1 (по OpenAPI 2026-09-15)

| Что | Метод | Save-on-leave |
|-----|-------|---------------|
| Goose (3 select) | PUT `/goose-settings` | да |
| Overrides карточек | PATCH `/media-device-overrides/{hardwareSerial}` | да |
| Список устройств | локальная сборка | — |
| Snapshot profile | GET (не UI list) | — |

Пул flush на leave (как Main): Main PATCH + goose PUT (если dirty) + overrides PATCH (если dirty). Fail → rollback + toast.

---

## PreferencesReloadRequested

Admin write goose-settings → WS reload. **Не в скоупе v1.**

---

## Proxy (vite/nginx)

Через `getAdditionalApiURL`, в `vite.config.ts` добавить proxy (по аналогии с `main-settings`):

- `/api/v1/me/goose-settings`
- `/api/v1/me/media-device-overrides`
- (опционально) `/api/v1/me/turret-media-devices`

---

## Решения по открытым вопросам

1. **Q1 Main volume** — **да** (2026-09-15). `logicalKey` hub/main в overrides. Footer/header и Settings — один runtime; вне Settings → отдельный PATCH volume с debounce.
2. PUT goose — schema partial; клиент шлёт полный dirty snapshot + `schemaVersion: 1` (решение фронта).
3. ~~Endpoint overrides~~ — **закрыто**, есть в OpenAPI.
4. ~~Scope goose vs overrides~~ — **закрыто OpenAPI:** goose per user, overrides user+serial (модель C).
