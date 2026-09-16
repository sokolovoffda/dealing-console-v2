# Forwarding Settings — модель для backend (WUI-5444 / WUI-5529)

Статус: **согласовано с фронтом 2026-08-26** (раздел Incoming Call Processing / Forwarding).  
Назначение: правила обработки входящего вызова. **Не новый prefs-DTO** — оставляем существующий RTU-контракт `/api/Forwarding` (+ справочники).

Связь: Favorites `callDiversion` (WUI-5445) ссылается на **`guid`** правила из этого API.

**Access:** раздел целиком `access: admin` (после PIN). Общее правило: `settings-access.md`.

---

## Решение по API

| Вопрос | Решение |
|--------|---------|
| Path | Оставляем **`/api/Forwarding`** как на текущем RTU |
| Привязка | Per subscriber / login (как сейчас), не station |
| Conditions | Все: `unconditional`, `noAnswer`, `unreachable`, `busy` |
| `schedule` | Как в UI-типе клиента (есть в модели), не урезать до curl без schedule |
| `isDefault` / default-правила | Оставляем поведение как сейчас |
| Отдельный lightweight list для Favorites | **Не нужен** (см. ниже) |

---

## Endpoints (текущий контракт)

```text
GET    /api/Forwarding?condition={condition}
POST   /api/Forwarding
PUT    /api/Forwarding
DELETE /api/Forwarding/{guid}

GET    /api/subscriber-service
GET    /api/Scenario
GET    /api/timetable-template
```

`condition` для GET: `unconditional` | `noAnswer` | `unreachable` | `busy`  
(на клиенте ещё агрегат `all` — собирается на фронте из всех condition-запросов).

---

## DTO правила (как в UI)

Ориентир: `src/entities/forwarding-settings/types.ts` + curl Сергея 2026-08-24.

```ts
type ForwardingCondition =
  | 'unconditional'
  | 'noAnswer'
  | 'unreachable'
  | 'busy'

type ForwardingRuleDto = {
  guid: string
  enabled: boolean
  priority: number
  isDefault?: boolean

  condition: ForwardingCondition
  /** Для noAnswer — таймаут (строка, как сейчас в клиенте) */
  timeout?: string

  aNumber: string
  forwardNumber: string

  service: {
    key: string   // guid/id сервиса из /api/subscriber-service
    value: string // человекочитаемое / enum-имя сервиса
  }

  scenario: {
    key: string | null
    value: string | null
  }

  /**
   * Расписание — как в UI (PermanentSchedule + special items).
   * В минимальном curl может отсутствовать; для полного контракта Settings — есть.
   */
  schedule: {
    permanentSchedule: unknown // PermanentSchedule из UI kit / RTU
    specialScheduleItems: unknown[] // ScheduleItem[]
  }
}
```

Пример минимального PUT (из NOTES, без schedule — допустим для простых default-правил):

```json
{
  "guid": "b55013be-2677-11ec-93e2-005056a4cdce",
  "isDefault": true,
  "condition": "unconditional",
  "enabled": true,
  "priority": 200,
  "service": {
    "key": "968984a9-05a5-11e8-85b5-420b635e21c2",
    "value": "Forward"
  },
  "scenario": { "key": null, "value": null },
  "timeout": "0",
  "aNumber": ".*",
  "forwardNumber": "1742"
}
```

---

## Про «сервисы» (п.5)

В колонке **Сервис** пользователь выбирает не только «Переадресация».

- Список приходит из **`GET /api/subscriber-service`** (что разрешено абоненту на станции).
- В UI-типе встречаются в т.ч.: Forward, DoNotDisturb, VoiceMailForwarding, FollowMe, IVR, BlackWhiteList, …
- `service.key` / `service.value` уходят в тело правила; сценарии — из **`GET /api/Scenario`** в зависимости от выбранного сервиса.

**Решение:** не сужать контракт до одного `Forward`. Каталог сервисов и сценариев — как сейчас через справочники; в правило пишется выбранная пара `service` (+ `scenario` при необходимости).

---

## UI на странице (admin)

Таблица правил:

1. Вкл. (`enabled`)
2. Приоритет (up/down)
3. Сервис (`service`)
4. Условие (`condition` + `timeout` для noAnswer)
5. A-номер (`aNumber`)
6. Номер переадресации (`forwardNumber`) — для сервисов, где применимо
7. Расписание (`schedule`) — как в UI
8. Сохранить / удалить
9. Добавить правило

Справочники грузятся отдельно (services, scenarios, timetable templates).

---

## Связь с Favorites (WUI-5445) — п.8 «как лучше»

**Рекомендация: отдельный lightweight API не делать.**

Почему:

- Favorites `callDiversion` нужен стабильный **`guid`** правила — он уже есть в `/api/Forwarding`.
- Пикер на клиенте может взять `GET /api/Forwarding?condition=…` (или все condition) и показать короткий список из тех же полей: `guid`, `enabled`, `condition`, `forwardNumber`, `service.value`, `isDefault`.
- Дублирующий endpoint (`/api/Forwarding/summary`) имеет смысл только если полный payload станет тяжёлым — сейчас нет признаков.

Контракт для Favorites:

```ts
// payload кнопки callDiversion
type CallDiversionFavoritePayload = {
  forwardingRuleGuid: string // === ForwardingRuleDto.guid
}
```

Инварианты:

1. `guid` стабилен при edit (PUT того же guid).
2. Удаление правила → Favorites с этим guid становится битым (UI: показать ошибку / предложить перевыбрать).
3. Toggle diversion на Favorites = включить/выключить правило (`enabled`) через тот же Forwarding API (или отдельная семантика — уточнить при реализации Favorites; для Settings достаточно CRUD правил).

---

## Что не входит

| Тема | Комментарий |
|------|-------------|
| Новая обёртка `/api/v1/me/settings/forwarding` | Не делаем, оставляем `/api/Forwarding` |
| Terminals settings | Скорее не будет (NOTES) |
| Реализация Favorites UI | WUI-5445, не этот файл |
| Admin PIN unlock endpoint | Отдельно (settings-access / WUI-4281) |

---

## Открытые вопросы к бэкенду

1. Точная JSON-схема `schedule` (совместимость с timetable-template) — подтвердить по OpenAPI RTU / dealing-admin.
2. Обязательность `schedule` на PUT (сейчас curl без него проходит).
3. Семантика Favorites toggle: только `enabled` на правиле или отдельный action — при реализации WUI-5445.

После ответа можно добавить OpenAPI / полные примеры schedule.
