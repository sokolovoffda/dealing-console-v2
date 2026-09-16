# WUI-5528 — Media Devices API: требования для бэка

---

## Что сейчас не так


| #   | Проблема                                                                              |
| --- | ------------------------------------------------------------------------------------- |
| 1   | **Нет GET/PATCH overrides** — persist volume, enabled, AEC с Settings невозможен      |
| 2   | В ответах API **нет** `volume`, `enabled` для user settings                           |
| 3   | AEC есть только в snapshot GET, **нет** persist user overrides                        |
| 4   | Черновик `GET/PUT /settings/media?stationId` **не реализован**                        |
| 5   | **Scope не согласован** — goose per user vs overrides per serial (см. вопрос в конце) |


---

## Как должно быть

### 1. Goose settings *(есть, без изменений контракта)*

```http
GET  /api/v1/me/goose-settings
PUT  /api/v1/me/goose-settings
```

**GET 200 / PUT body / PUT 200:**

```json
{
  "schemaVersion": 1,
  "preferredGooseModuleId": "goose_L1",
  "mode": "stateful",
  "pttScope": "standard"
}
```


| Поле                     | Тип                           | Примечание                    |
| ------------------------ | ----------------------------- | ----------------------------- |
| `schemaVersion`          | `1`                           | обязательно                   |
| `preferredGooseModuleId` | `string | null`               | `null` = default goose пульта |
| `mode`                   | `"stateful" | "pushToTalk"`   |                               |
| `pttScope`               | `"standard" | "activePinned"` |                               |


Scope: **per user** (как сейчас). Нет записи → defaults.

---



### 2. Snapshot устройств *(есть GET; клиент шлёт profile по WS* `MediaDevicesReported`*)*

```http
GET /api/v1/me/turret-media-devices/{hardwareSerial}?consoleType=dealing
```

**GET 200:**

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-01T12:00:00.000Z",
  "profile": {
    "hardwareSerial": "0102240000000001",
    "browserDevices": [],
    "controllerModules": [],
    "logicalDevices": [
      {
        "logicalKey": "goose_L1",
        "name": "Goose L1",
        "type": "goose",
        "order": 1,
        "hasInput": true,
        "hasOutput": false,
        "echoCancellation": true,
        "noiseSuppression": true,
        "autoGainControl": true,
        "runtime": {
          "status": "ready",
          "inputId": "...",
          "outputId": null,
          "inputLabel": "...",
          "outputLabel": null
        }
      }
    ]
  }
}
```

Snapshot = снимок железа/runtime с пульта. **Не** user overrides.

---



### 3. Overrides карточек *(новое)*

```http
GET   /api/v1/me/media-device-overrides/{hardwareSerial}
PATCH /api/v1/me/media-device-overrides/{hardwareSerial}
```

Path `media-device-overrides` — предложение; допустим другой path, суть та же.

Scope: **user + hardwareSerial** (если иначе — см. вопрос scope).

**GET 200:**

```json
{
  "schemaVersion": 1,
  "hardwareSerial": "0102240000000001",
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


| Поле               | Тип             | Default                         |
| ------------------ | --------------- | ------------------------------- |
| `logicalKey`       | `string`        | ключ устройства (`goose_L1`, …) |
| `enabled`          | `boolean`       | `true`                          |
| `volume`           | `integer` 0–100 | `50`                            |
| `echoCancellation` | `boolean`       | `true`                          |
| `noiseSuppression` | `boolean`       | `true`                          |
| `autoGainControl`  | `boolean`       | `true`                          |


Нет записи для устройства → defaults. Orphans по `logicalKey` храним (устройство пропало — карточку не рисуем, запись не удаляем).

**Main (`hub`):** volume в UI = runtime footer. Включение Main volume в этот overrides — **открытый вопрос Q1** (см. ниже и `discussion-media-persist-model.md`).

**PATCH body** — partial, только изменённые поля (как main-settings):

```json
{
  "devices": [
    {
      "logicalKey": "goose_L1",
      "volume": 70,
      "enabled": false
    }
  ]
}
```

**PATCH 200** — актуальное состояние overrides (тот же формат, что GET 200).

---



## Не в scope v1

- `micSensitivity`, `icon`, `iconNumber`
- deprecated `media-devices-configs`
- `PreferencesReloadRequested`
- uuid как ключ overrides

---



## Открытые вопросы

Полный текст для обсуждения: `.ai/tasks/WUI-5528/discussion-media-persist-model.md`.

### Q1. Main volume на бэк?

Сохранять ли громкость основного динамика пульта (`logicalKey` hub/main) в overrides?

- **Да** — hydrate при старте, если Main локально есть.
- **Нет** — только локальный runtime / другой persist.

### Q2. Scope goose vs overrides

Сейчас goose-settings — **per user**. Overrides выше — **per user + hardwareSerial**.

**Нужна единая модель:**

- **A)** всё **per user** (goose + overrides без serial в path)
- **B)** всё **per hardwareSerial** (goose + overrides с serial)
- **C)** смешанная (goose per user, overrides per serial) — только если продукт явно ок

## Согласованные правила клиента (2026-09-03)

- Список UI = локальная сборка; snapshot ≠ список Settings.
- Leave: dirty → PUT goose / PATCH overrides; fail → rollback + toast.
- Пустой локальный список ≠ очистка бэка.
- Новые устройства → defaults; orphans не показываем и не удаляем.
- Смена serial → новый bucket overrides, без миграции.

