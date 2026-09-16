# Settings API — DTO и эндпоинты (для backend)

Источник: согласование фронта 2026-08-26, WUI-5444.  
Детали/правила: `.ai/tasks/WUI-5444/backend-*-settings-model.md`.  
Этот файл — **контракт для реализации**: типы + предлагаемые path. Path/`PUT` vs `PATCH` можно менять, DTO — желательно сохранить.

**Общее**

- Auth: текущий пользователь (`me`).
- `revision` / `updatedAt` — опционально на всех новых ресурсах.
- Нет записи → **defaults**, не 404.
- Admin (PIN): UI раскрывает вкладки/поля; write admin-разделов целевое — с admin-сессией (unlock отдельно, WUI-4281).
- CRUD файлов рингтонов: существующий **`/prompt`**, не в settings DTO.

| Раздел | Access | Scope | Persist |
|--------|--------|-------|---------|
| Main | user | user | **новый** |
| Media | user | user + station | **новый** |
| Keys (line) | user | user + station | **новый** |
| Prioritization | admin | user | **новый** |
| Forwarding | admin | subscriber (как RTU) | **старый** `/api/Forwarding` |

---

## 1. Main — `WUI-5527`

```text
GET  /api/v1/me/settings/main
PUT  /api/v1/me/settings/main
```

```ts
type MainSettingsDto = {
  locale: 'ru-RU' | 'en-GB' | 'zh-CN' | 'zh-TW'
  isAutomaticallyConferenceRecordEnabled: boolean
  openCallCardOnHandsetPickup: boolean // global; force-open группы/контакта — Prioritization
  autoAnswerOnHandsetPickup: boolean
  pushToTalk: {
    enabled: boolean
    forOperator: boolean
    forParticipants: boolean
    forPinnedTiles: boolean
    forQueueTiles: boolean
  }
  notifications: {
    isIncomingCallSoundEnabled: boolean
    incomingCallVolume: number // 0..100
    incomingRingtoneGuid: string | null
  }
  revision?: number
  updatedAt?: string
}
```

Default:

```json
{
  "locale": "ru-RU",
  "isAutomaticallyConferenceRecordEnabled": true,
  "openCallCardOnHandsetPickup": false,
  "autoAnswerOnHandsetPickup": false,
  "pushToTalk": {
    "enabled": true,
    "forOperator": true,
    "forParticipants": true,
    "forPinnedTiles": true,
    "forQueueTiles": true
  },
  "notifications": {
    "isIncomingCallSoundEnabled": true,
    "incomingCallVolume": 50,
    "incomingRingtoneGuid": null
  }
}
```

---

## 2. Media — `WUI-5528`

```text
GET  /api/v1/me/settings/media?stationId={stationId}
PUT  /api/v1/me/settings/media?stationId={stationId}
```

`stationId` — стабильный id станции с клиента (формат согласовать). Inventory устройств на бэк **не** кладём. Orphans в `devices[]` храним.

```ts
type MediaDeviceIcon =
  | 'micSpeaker' | 'phone' | 'headsetMic' | 'workspaces' | 'speaker'
  | 'settingsPhone' | 'recordVoiceOver' | 'mic' | 'headphones' | 'audioControl'

type MediaDeviceOverrideDto = {
  deviceId: string          // controller id, напр. "goose_L1" — не browser deviceId
  enabled: boolean
  icon: MediaDeviceIcon
  iconNumber: string        // "1" | "" 
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
  volume: number            // 0..100, default 50
  micSensitivity: number    // 0..100, default 50
}

type MediaSettingsDto = {
  stationId: string
  preferredGooseId: string | null
  goose: {
    mode: 'stateful' | 'pushToTalk'
    pttScope: 'standard' | 'activePinned'
  }
  devices: MediaDeviceOverrideDto[]
  revision?: number
  updatedAt?: string
}
```

Default:

```json
{
  "stationId": "<from-client>",
  "preferredGooseId": null,
  "goose": { "mode": "stateful", "pttScope": "standard" },
  "devices": []
}
```

Пустой `devices[]` → клиент применяет локальные defaults карточки.

---

## 3. Keys (line keys v1) — `WUI-5531`

```text
GET  /api/v1/me/settings/keys?stationId={stationId}
PUT  /api/v1/me/settings/keys?stationId={stationId}

# опционально точечно:
PUT    /api/v1/me/settings/keys/{keyId}?stationId={stationId}
DELETE /api/v1/me/settings/keys/{keyId}?stationId={stationId}
```

v1: только `keyKind: 'line'`. Mic/back — later. Orphans храним, клиент отсекает.

```ts
type LineKeyBindingDto =
  | { type: 'standard'; pServed: string | null }
  | { type: 'pinned-group'; groupId: string | null }

type HardwareKeyBindingEntryDto = {
  keyId: string      // напр. "goose_L1:key_1"
  moduleId: string   // напр. "goose_L1"
  keyKind: 'line'
  binding: LineKeyBindingDto
}

type HardwareKeysSettingsDto = {
  stationId: string
  keys: HardwareKeyBindingEntryDto[]
  revision?: number
  updatedAt?: string
}
```

Default: `{ "stationId": "<from-client>", "keys": [] }`  
Клиент сам заводит пустые `standard` при появлении модуля.

`groupId` — стабильный id группы завешенных (сейчас на клиенте index; нужна миграция к id).

---

## 4. Prioritization — `WUI-5530`

Предпочтительно **CRUD**, не только жирный PUT.

```text
GET    /api/v1/me/settings/prioritization
PUT    /api/v1/me/settings/prioritization

GET    /api/v1/me/settings/prioritization/groups
POST   /api/v1/me/settings/prioritization/groups
PUT    /api/v1/me/settings/prioritization/groups/{id}
DELETE /api/v1/me/settings/prioritization/groups/{id}

GET    /api/v1/me/settings/prioritization/contacts
PUT    /api/v1/me/settings/prioritization/contacts/{pServed}
DELETE /api/v1/me/settings/prioritization/contacts/{pServed}
```

Precedence (цвет, рингтон, open-card): **группа > контакт > Main**.  
`forceOpenCallCard: true` только форсирует открытие; global — `Main.openCallCardOnHandsetPickup`.  
Контакт максимум в **одной** группе.

```ts
type PriorityAppearanceBasics = {
  color: string | null          // hex, напр. "#1F6FEB"
  blinking: boolean
  frequency: 'slow' | 'middle' | 'fast'
}

type PriorityGroupDto = {
  id: string
  enabled: boolean
  priority: number              // семантика sort — подтвердить (меньше = выше?)
  name: string
  description: string
  users: string[]               // pServed[], unique across groups
  appearance: PriorityAppearanceBasics
  ringtoneGuid: string | null
  forceOpenCallCard: boolean
}

type PriorityContactOverrideDto = {
  pServed: string
  appearance: PriorityAppearanceBasics
  ringtoneGuid: string | null
  forceOpenCallCard: boolean
}

type PrioritizationSettingsDto = {
  groups: PriorityGroupDto[]
  contactOverrides: PriorityContactOverrideDto[]
  revision?: number
  updatedAt?: string
}
```

Default: `{ "groups": [], "contactOverrides": [] }`

---

## 5. Forwarding — `WUI-5529` (существующий RTU)

**Не** новый settings-store. Оставляем:

```text
GET    /api/Forwarding?condition={unconditional|noAnswer|unreachable|busy}
POST   /api/Forwarding
PUT    /api/Forwarding
DELETE /api/Forwarding/{guid}

GET    /api/subscriber-service
GET    /api/Scenario
GET    /api/timetable-template
```

Favorites `callDiversion` (WUI-5445) → `guid` правила. Отдельный summary-list не нужен.

```ts
type ForwardingCondition = 'unconditional' | 'noAnswer' | 'unreachable' | 'busy'

type ForwardingRuleDto = {
  guid: string
  enabled: boolean
  priority: number
  isDefault?: boolean
  condition: ForwardingCondition
  timeout?: string              // для noAnswer
  aNumber: string
  forwardNumber: string
  service: { key: string; value: string }
  scenario: { key: string | null; value: string | null }
  schedule: {
    permanentSchedule: unknown
    specialScheduleItems: unknown[]
  }
}
```

Минимальный PUT (schedule может отсутствовать):

```json
{
  "guid": "b55013be-2677-11ec-93e2-005056a4cdce",
  "isDefault": true,
  "condition": "unconditional",
  "enabled": true,
  "priority": 200,
  "service": { "key": "968984a9-05a5-11e8-85b5-420b635e21c2", "value": "Forward" },
  "scenario": { "key": null, "value": null },
  "timeout": "0",
  "aNumber": ".*",
  "forwardNumber": "1742"
}
```

---

## На усмотрение бэка

1. Точные path, `PUT` vs `PATCH`, формат `stationId`.
2. Нужен ли `revision`.
3. Unlock PIN / защита write admin-разделов.
4. Схема `schedule` Forwarding (как в RTU).
5. Стабильный `groupId` для pinned-групп (Keys).
6. Сортировка `priority` в Prioritization; hex vs palette id для `color`.
