# Goose settings & line key bindings API

## Статус

**Goose settings REST — Implemented (WUI-5528).**  
Hydrate + dirty/synced + save-on-leave (`SettingsPage` / logout). Legacy `localStorage` снят.

**Line key bindings** — ещё draft; persist пока IM preferences (`bindings`). Вне скоупа WUI-5528.

## Назначение

Зафиксировать контракт для двух групп настроек из раздела **Media Devices** и **Клавиши линий**:

1. Goose settings — 3 поля (устройство для завешенных, режим, PTT scope).
2. Line key bindings — программируемые кнопки goose (контакт / группа завешенных).

## Текущее состояние на frontend

| Настройка | UI | Persist сейчас | Store / ключ |
|-----------|-----|----------------|--------------|
| Goose default + mode + PTT scope | Media Devices (верх страницы) | REST `GET/PUT /api/v1/me/goose-settings` | `devices-store` runtime + `useGooseSettingsStore` synced/dirty |
| Line key bindings | Клавиши линий | IM preferences key `bindings` | `useBindingControllerButtonsStore` |

**Не входит:** Main Settings → `pushToTalkIsEnabled` (только конференции).

## Scope

- **Per user** (уточнение пользователя от 2026-07-20) для goose-settings.
- Overrides карточек — **user + hardwareSerial** (см. `media-device-overrides-api.md`).
- Line key bindings: target per user; migrate IM → REST — отдельный этап.

---

## API (предложение)

Паттерн как у pinned-calls: `/api/v1/me/...` через additional backend (`getAdditionalApiURL`).

### 1. Goose settings

```
GET  /api/v1/me/goose-settings
PUT  /api/v1/me/goose-settings
```

```typescript
type GooseMicMode = 'stateful' | 'pushToTalk'
type GoosePttScope = 'standard' | 'activePinned'

type GooseSettingsDto = {
  schemaVersion: 1
  /** id goose-модуля контроллера, напр. "goose_L1". null = fallback на первый ready goose */
  preferredGooseModuleId: string | null
  mode: GooseMicMode
  /** meaningful only when mode === 'pushToTalk' */
  pttScope: GoosePttScope
}
```

**Defaults (если записи нет):**

- `preferredGooseModuleId`: `null`
- `mode`: `stateful`
- `pttScope`: `standard`

**Правила:**

- `mode` и `pttScope` применяются **ко всем goose-модулям одинаково** (не per-device).
- `preferredGooseModuleId` выбирает goose для pinned/footer/speak runtime (`readyPreferredGoose`).
- Backend должен валидировать, что `preferredGooseModuleId` существует среди модулей пульта пользователя (или вернуть null / 400 — на усмотрение backend).

**Runtime (frontend, уже реализовано):** см. `domain/speakers-ptt.md`.

---

### 2. Goose line key bindings

```
GET  /api/v1/me/goose-line-key-bindings
PUT  /api/v1/me/goose-line-key-bindings
```

```typescript
type GooseLineKeyBindingType = 'standard' | 'pinned-group'

type GooseLineKeyBindingDto = {
  gooseModuleId: string
  /** 1..9 — программируемые клавиши; key_speak не биндится */
  keyIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  type: GooseLineKeyBindingType
  /** required when type === 'standard' */
  pServed?: string | null
  /** required when type === 'pinned-group'; index 0..6 — тот же, что pinned-calls groups API */
  groupIndex?: number | null
}

type GooseLineKeyBindingsDto = {
  schemaVersion: 1
  bindings: GooseLineKeyBindingDto[]
}
```

**Правила для backend:**

- Уникальность пары `(gooseModuleId, keyIndex)`.
- Не более одной кнопки с одним `groupIndex` (как на frontend).
- `groupIndex` — backend index группы из `/api/v1/me/pinned-calls/groups/{index}` (0..6).
- `pServed` — идентификатор контакта (как в pinned-calls / directory).
- При удалении контакта, группы или слота — **backend выбирает стратегию** (очистить binding / вернуть null / orphan flag). Frontend должен показывать «нет привязки» для битых ссылок.

**Legacy формат (IM preferences, для справки при миграции):**

```json
{
  "goose_L1:key_1_1": { "type": "standard", "pServed": "<sip:4321@ROOT>" },
  "goose_L1:key_1_2": { "type": "pinned-group", "groupIndex": 1 }
}
```

Нормализация: `gooseModuleId = "goose_L1"`, `keyIndex = 1` из suffix `:key_1_1`.

---

## Примеры

### Goose settings

```json
{
  "schemaVersion": 1,
  "preferredGooseModuleId": "goose_L1",
  "mode": "pushToTalk",
  "pttScope": "activePinned"
}
```

### Line key bindings

```json
{
  "schemaVersion": 1,
  "bindings": [
    {
      "gooseModuleId": "goose_L1",
      "keyIndex": 1,
      "type": "standard",
      "pServed": "<sip:4321@ROOT>"
    },
    {
      "gooseModuleId": "goose_L1",
      "keyIndex": 2,
      "type": "pinned-group",
      "groupIndex": 1
    }
  ]
}
```

---

## Out of scope (текущая итерация frontend)

- ~~Реализация REST goose-settings на backend / hydrate frontend.~~ — сделано (WUI-5528).
- Миграция IM `bindings` → API.
- Dual-read / fallback для bindings.
- `PreferencesReloadRequested` listener.

## Связанные страницы

- `../domain/devices.md`
- `../domain/speakers-ptt.md`
- `../domain/pinned-calls.md`
- `media-device-overrides-api.md`
- `im-preferences.md`

## Источники

- `src/shared/composables/state/devices-store/use-devices-store.ts` (goose settings runtime)
- `src/entities/media-devices-settings/model/use-goose-settings-store.ts`
- `src/entities/media-devices-settings/api/goose-settings-api.ts`
- `src/entities/binding-contacts/model/use-binding-controller-buttons-store.ts` (bindings IM)
- `src/entities/pinned-calls/api/use-pinned-calls-api.ts` (паттерн `/api/v1/me/...`)
- `.ai/tasks/WUI-5528/api-contract.md`
- `.ai/tasks/WUI-5185/case.md` (часть 3)
- Уточнение пользователя от 2026-07-20: scope per user
- Уточнение пользователя от 2026-09-15: REST hydrate, без localStorage; save-on-leave в Settings

## Открытые вопросы

- PUT replace-all vs PATCH для bindings.
- Стратегия очистки bindings при удалении контакта/группы (backend).
- ETag / optimistic locking (опционально).
