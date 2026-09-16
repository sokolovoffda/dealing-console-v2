# Hardware / Line Keys Settings — модель для backend (WUI-5444 / WUI-5531)

Статус: **согласовано с фронтом 2026-08-26**.  
Назначение: настройки **физических клавиш** пульта.  
**v1:** только **line keys** (текущая логика биндингов). Остальные клавиши (mic, back, …) — задел в доке, в DTO пока не обязательны.

**Access:** раздел `access: user` (пока). Общее правило: `settings-access.md`.

---

## Ключевые решения

| Тема | Решение |
|------|---------|
| Скоуп UI | Раздел шире «гуся»: Goose + телефон + позже другие физ. клавиши |
| v1 persist | Только **line-key bindings** (как prefs `bindings`) |
| Non-line (mic / back / …) | **Пока не моделируем** (вариант B); документ расширяемый |
| Привязка | **user + station** (комплектация 1…N модулей разная) |
| `keyId` | Как сейчас в рантайме, напр. `goose_L1:key_1` |
| Типы binding | `standard` \| `pinned-group` (+ запас под новые type) |
| Группа | Стабильный **`groupId`**, не `groupIndex` |
| Orphans | Храним; пульт отсекает, если модуля/клавиши нет |
| Defaults | Пусто / клиент сам создаёт пустые `standard` при появлении модуля |
| API shape | На усмотрение бэка |

---

## Что сейчас в клиенте (для миграции)

Prefs key `bindings`:

```ts
// было
type = 'standard' | 'pinned-group'
standard: { type: 'standard', pServed: string | null }
pinned-group: { type: 'pinned-group', groupIndex: number | null }
// ключ Map = id кнопки контроллера
```

UI: блоки по Goose-модулям (`KeyBlock №N`).

---

## DTO v1 (line keys)

```ts
type LineKeyBindingType = 'standard' | 'pinned-group' // расширяемо позже

type LineKeyBindingDto =
  | {
      type: 'standard'
      /** null = клавиша без контакта */
      pServed: string | null
    }
  | {
      type: 'pinned-group'
      /**
       * Стабильный id группы завешенных контактов.
       * (Замена текущего groupIndex; если у групп ещё нет id — ввести на клиенте/бэке.)
       */
      groupId: string | null
    }

type HardwareKeyBindingEntryDto = {
  /** Стабильный id клавиши, напр. "goose_L1:key_1" */
  keyId: string
  /** Модуль/устройство, напр. "goose_L1" */
  moduleId: string
  /** В v1 всегда line; запас под mic | back | other */
  keyKind: 'line'
  binding: LineKeyBindingDto
}

type HardwareKeysSettingsDto = {
  stationId: string
  /** Overrides/bindings; inventory клавиш на бэк не кладём */
  keys: HardwareKeyBindingEntryDto[]
  revision?: number
  updatedAt?: string
}
```

Все поля: `access: user`.

---

## Предлагаемые endpoints (бэк может изменить)

```text
GET  /api/v1/me/settings/keys?stationId={stationId}
PUT  /api/v1/me/settings/keys?stationId={stationId}

# или точечно:
PUT  /api/v1/me/settings/keys/{keyId}?stationId={stationId}
DELETE /api/v1/me/settings/keys/{keyId}?stationId={stationId}
```

---

## Defaults

```json
{
  "stationId": "<from-client>",
  "keys": []
}
```

Поведение клиента (как сейчас):

- при появлении Goose-модуля на станции — для line-клавиш без записи создать локально `standard` + `pServed: null`;
- при save — уходит на бэк;
- `key_speak` и прочие non-line в v1 **не** сохраняем.

---

## Правила

1. Inventory клавиш / модулей на бэк не кладём — только `keys[]` bindings.
2. Orphans (модуль сняли) **храним**; UI/runtime игнорирует неизвестные `keyId`.
3. Один `groupId` не должен быть привязан к двум line-клавишам одновременно (как сейчас с `groupIndex`) — валидация на клиенте; бэк может дублировать check.
4. Новые `type` binding добавляются без смены path ресурса (discriminated union).
5. Non-line клавиши позже: новые `keyKind` + опциональный `config` / `behavior` — отдельное согласование.

---

## Задел на будущее (не в v1 DTO)

Из NOTES 18.08 — в одном разделе потенциально:

| keyKind | Примеры | Статус |
|---------|---------|--------|
| `line` | клавиши линий Goose | **v1** |
| `mic` | speak Goose, mic на трубке | TBD поведение |
| `back` | задние клавиши (volume/backlight) | TBD (раньше выносили из Main) |
| `other` | прочее железо | TBD |

Программные кнопки футера диспетчера — **не берём**.

---

## Маппинг

| Было (prefs `bindings`) | Стало |
|-------------------------|--------|
| map key | `keyId` |
| module из ключа | `moduleId` |
| `standard` + `pServed` | то же |
| `pinned-group` + `groupIndex` | `pinned-group` + **`groupId`** |
| — | `keyKind: 'line'` |
| — | `stationId` |

---

## Открытые вопросы

1. Источник стабильного `groupId` для групп завешенных (сейчас index) — завести id в модели групп.
2. Нужна ли позже привязка line keys к Prioritization-группам (другие сущности) — сейчас только pinned contact groups.
3. Когда появятся mic/back — отдельный апдейт этого файла.

После появления `groupId` в домене групп — можно сузить формулировку в DTO.
