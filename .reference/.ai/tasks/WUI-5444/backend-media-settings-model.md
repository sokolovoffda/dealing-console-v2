# Media Settings — модель для backend (WUI-5444 / WUI-5528)

Статус: **согласовано с фронтом 2026-08-26** (раздел Media).  
Назначение: persist пользовательских настроек страницы «Медиаустройства» для пары **user + station**.

**Access:** все поля ниже сейчас `access: user`. Admin-поля могут появиться позже в **этом же** ресурсе. Общее правило: `settings-access.md`.

---

## Вне скоупа этой модели

| Тема | Комментарий |
|------|-------------|
| Каталог / список устройств | Собирает пульт локально (controller → browser → карточки). На бэк **не** сохраняем полный inventory |
| Выбор browser input/output для тестов | Селекты только для проверки; **не** persist |
| Ручной выбор/создание устройств пользователем | Уходим от этой модели; карточки автосборные |
| CRUD рингтонов, Main Settings | Другие разделы |
| Reset endpoint | Пока не фиксируем |

---

## Привязка и API

- **Scope:** `user (login) + station`.
- **Station id:** стабильный идентификатор станции, который отдаёт клиент (например hostname Electron / machine id). Точный формат — согласовать с бэком; фронт шлёт один и тот же ключ на GET/PUT.
- **Первый запрос / нет записи:** бэкенд отдаёт **defaults**.
- **Ошибки / битые данные / устройство не сматчилось:** клиент применяет дефолты пульта; при необходимости затирает/перезаписывает то, что на бэке (детали recovery — на усмотрение реализации, контракт defaults обязателен).
- **Методы:** отдельный ресурс, детали (`GET`/`PUT` vs `PATCH`) — бэку.

Предлагаемый путь:

```text
GET  /api/v1/me/settings/media?stationId={stationId}
PUT  /api/v1/me/settings/media?stationId={stationId}
```

или `stationId` в path / body — на усмотрение бэка.

Опционально: `revision` / `updatedAt` (как в Main).

---

## UI на странице Media (что видит пользователь)

### Блок «Управление микрофоном» (Goose)

1. Устройство Goose для завешенных → `preferredGooseId`
2. Режим работы → `goose.mode` (`stateful` | `pushToTalk`)
3. Режим PTT (если mode = pushToTalk) → `goose.pttScope` (`standard` | `activePinned`)

### Карточки устройств (runtime-список с пульта)

На карточке (цель по созвону 18.08 + ответы 26.08):

- Read-only из железа: имя, тип, модуль, labels in/out, status  
- Редактируемые (persist в `devices[]`):
  - иконка и номер на кнопке (`icon`, `iconNumber`)
  - эхоподавление / шумодав / AGC
  - громкость устройства
  - чувствительность микрофона (если есть вход)
  - вкл/выкл устройства (`enabled`), UI — когда status `ready`
- Действия без persist: тест входа, тест выхода; временные селекты для тестов

---

## DTO

Все поля: `access: user` (на текущий момент).

```ts
type MediaSettingsDto = {
  /** Идентификатор станции (дублирует query/path для ясности контракта) */
  stationId: string

  /**
   * Логический id Goose для завешенных линий.
   * Как в текущем рантайме: стабильный controller id, напр. "goose_L1".
   * null — взять default пульта (первый ready goose).
   */
  preferredGooseId: string | null

  goose: {
    mode: 'stateful' | 'pushToTalk'
    /** Имеет смысл при mode = pushToTalk; значение храним всегда */
    pttScope: 'standard' | 'activePinned'
  }

  /**
   * Overrides по стабильным id устройств контроллера.
   * Ключ = deviceId (напр. "goose_L1", "handset_L1").
   * Записи для отсутствующих сейчас устройств (orphans) — храним:
   * если устройство вернётся, настройки применятся снова.
   */
  devices: MediaDeviceOverrideDto[]

  revision?: number
  updatedAt?: string // ISO-8601
}

type MediaDeviceIcon =
  | 'micSpeaker'
  | 'phone'
  | 'headsetMic'
  | 'workspaces'
  | 'speaker'
  | 'settingsPhone'
  | 'recordVoiceOver'
  | 'mic'
  | 'headphones'
  | 'audioControl'

type MediaDeviceOverrideDto = {
  /** Стабильный id (controller / logical), не browser deviceId */
  deviceId: string

  enabled: boolean

  /** Внешний вид кнопки — как в текущем LogicalMediaDeviceIcon */
  icon: MediaDeviceIcon
  /** Номер на иконке (строка, напр. "1", "2"); "" если без номера */
  iconNumber: string

  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean

  /** 0..100, integer; default 50 */
  volume: number

  /**
   * 0..100, integer; default 50.
   * Для устройств без входа клиент может не показывать UI,
   * но поле можно хранить или игнорировать на apply.
   */
  micSensitivity: number
}
```

---

## Defaults (ориентир)

```json
{
  "stationId": "<from-client>",
  "preferredGooseId": null,
  "goose": {
    "mode": "stateful",
    "pttScope": "standard"
  },
  "devices": []
}
```

Поведение при пустом `devices[]`:

- для каждого runtime-устройства пульт применяет локальные defaults карточки:
  - `enabled: true` (если status позволяет)
  - `icon` / `iconNumber` — как назначил автосбор пульта (по типу/порядку)
  - `echoCancellation: true`
  - `noiseSuppression: true`
  - `autoGainControl: true`
  - `volume: 50`
  - `micSensitivity: 50`

После первого сохранения пользователя в `devices[]` появляются только те id, которые юзер менял **или** полный снимок всех известных — на усмотрение фронта; бэк хранит массив как есть.

Рекомендация фронту: **sparse overrides** (только изменённые / все известные на момент save — один стиль на весь клиент). Для бэка достаточно принимать полный массив раздела.

---

## Правила поведения (контракт)

1. Inventory устройств на бэк не кладём — только `preferredGooseId`, `goose.*`, `devices[]` overrides.
2. `deviceId` — стабильный logical/controller id (`goose_L1`, …), **не** `navigator.mediaDevices` id.
3. Browser-селекты в UI тестов **не** входят в DTO.
4. Orphans в `devices[]` не удаляем автоматически на бэке.
5. При `goose.mode !== 'pushToTalk'` `pttScope` всё равно храним.
6. `volume` / `micSensitivity` ∈ `[0, 100]`, integer; default **50**.
7. `icon` — из фиксированного набора клиента; неизвестное значение → default иконка типа устройства.
8. `iconNumber` — строка (обычно `"1"`…); `""` = без номера.
9. `preferredGooseId`, которого нет на станции: клиент fallback на default goose пульта; при recovery может перезаписать бэк.
10. Привязка записи: пара `(userId, stationId)`.

---

## Маппинг с текущего клиента

| Было | Стало |
|------|--------|
| `localStorage` `dealing-console:goose-settings` → `preferredGooseId` | `preferredGooseId` |
| то же → `gooseMode` | `goose.mode` |
| то же → `goosePttScope` | `goose.pttScope` |
| hardcoded `echoCancellation/noiseSuppression/autoGainControl: true` на карточке | `devices[].*` редактируемые |
| runtime `icon` / `iconNumber` (без persist) | `devices[].icon`, `devices[].iconNumber` |
| — | `devices[].volume` (new) |
| — | `devices[].micSensitivity` (new) |
| — | `devices[].enabled` (new) |

---

## Открытые вопросы к бэкенду

1. Формат `stationId` (hostname vs UUID, кто генерирует).
2. Path: query `stationId` vs path segment.
3. `PUT` полный документ vs `PATCH`.
4. Нужен ли `revision`.
5. Нужен ли отдельный `DELETE` orphans / clear station — пока не требуется.

После ответа можно добавить OpenAPI / curl в этот файл.
