# Main Settings — модель для backend (WUI-5444 / WUI-5527)

Статус: **согласовано с фронтом 2026-08-26** (раздел Main).  
Назначение: persist настроек страницы «Основные настройки» per user (логин).

**Access:** все поля ниже сейчас `access: user`. Admin-поля могут появиться позже в **этом же** ресурсе. Общее правило: `settings-access.md`.

---

## Вне скоупа этой модели

| Тема | Комментарий |
|------|-------------|
| Задние клавиши (`volume` / `backlight`) | Пока не берём |
| Диагностика / логи | Отдельная админ-вкладка, не Main |
| Сброс обучения (tour) | Только local action на клиенте |
| CRUD файлов рингтонов | Существующий RTU `/prompt` |
| Reset всех/раздела настроек | Пока не фиксируем endpoint |
| IndexedDB / localStorage для этих полей | Не используем |

---

## Привязка и API

- **Scope:** настройки пользователя по логину (`me`), не device/station.
- **Первый логин / нет записи:** бэкенд отдаёт defaults (не 404 с пустым телом).
- **Методы:** на усмотрение бэкенда (`GET` + полный `PUT`, или `PATCH`). Фронт ожидает возможность прочитать целиком и сохранить целиком раздел.
- **Конфликты:** опционально `revision` (int) или `updatedAt` (ISO). Бэкенд может убрать, если не нужно.

Предлагаемый путь (можно изменить):

```text
GET  /api/v1/me/settings/main
PUT  /api/v1/me/settings/main
```

---

## UI на странице Main (что видит пользователь)

1. **Обучение** — сбросить прогресс *(не в DTO)*
2. **Язык клиента** → `locale`
3. **Автоматически записывать групповые вызовы** → `isAutomaticallyConferenceRecordEnabled`
4. **При снятии трубки**
   - открывать карточку вызова → `openCallCardOnHandsetPickup`  
     *(глобально; точечный force-open группы/контакта — в Prioritization)*
   - автоматически принимать вызов → `autoAnswerOnHandsetPickup`
5. **PTT в конференциях** → `pushToTalk.*`
6. **Уведомления**
   - проигрывать мелодию входящего → `notifications.isIncomingCallSoundEnabled`
   - выбрать рингтон → `notifications.incomingRingtoneGuid`
   - громкость → `notifications.incomingCallVolume`
   - таблица / загрузка рингтонов *(не в DTO, `/prompt`)*
7. **Сброс настроек** — кнопка есть в UI; контракт reset **пока не описываем**

---

## DTO

Все поля: `access: user` (на текущий момент).

```ts
type MainSettingsDto = {
  /** Как в текущем i18n клиента */
  locale: 'ru-RU' | 'en-GB' | 'zh-CN' | 'zh-TW'

  isAutomaticallyConferenceRecordEnabled: boolean

  /** Независимы: оба могут быть true / false */
  openCallCardOnHandsetPickup: boolean
  autoAnswerOnHandsetPickup: boolean

  pushToTalk: {
    /** Общий переключатель PTT в конференциях */
    enabled: boolean
    /** Hold → mic оператора (себя) */
    forOperator: boolean
    /** Hold → mic участника в списке */
    forParticipants: boolean
    /** Hold на плитке конфы в завешенных */
    forPinnedTiles: boolean
    /** Hold на плитке конфы в очереди */
    forQueueTiles: boolean
  }

  notifications: {
    isIncomingCallSoundEnabled: boolean
    /** 0..100, integer; сохраняем даже если звук выключен */
    incomingCallVolume: number
    /**
     * Выбранный пользовательский/системный рингтон.
     * null — системный default клиента.
     * Список файлов и upload/delete — не здесь (RTU /prompt).
     */
    incomingRingtoneGuid: string | null
  }

  /** Опционально; бэкенд может не отдавать */
  revision?: number
  updatedAt?: string // ISO-8601
}
```

---

## Defaults (ориентир с текущего клиента)

Бэкенд может скорректировать, но фронт сейчас стартует примерно так:

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

Примечание: тогглы трубки — **новые** поля (в старом dealing prefs их не было). Значения `false`/`false` как безопасный default; можно согласовать иначе.

---

## Правила поведения (контракт)

1. `openCallCardOnHandsetPickup` и `autoAnswerOnHandsetPickup` независимы.
   `openCallCardOnHandsetPickup` — global default; force-open для группы/контакта живёт в Prioritization (группа > контакт > Main).
2. При `pushToTalk.enabled === false` вложенные флаги **храним** как есть; UI на клиенте их дизейблит, значения не затираем.
3. При `notifications.isIncomingCallSoundEnabled === false` `incomingCallVolume` и `incomingRingtoneGuid` **храним**.
4. `incomingCallVolume` ∈ `[0, 100]`, integer.
5. Невалидный / неизвестный `incomingRingtoneGuid` на клиенте: fallback на default + можно логировать; бэкенд может валидировать против prompt API или принимать opaque string.
6. Смена `locale`: применение без reload желательно, но не требование API.

---

## Маппинг со старого dealing prefs (для миграции / понимания)

| Было (IM prefs `mainSettings` / local) | Стало |
|----------------------------------------|--------|
| `isAutomaticallyConferenceRecordEnabled` | то же |
| `pushToTalkIsEnabled` | `pushToTalk.enabled` |
| `pushToTalkForOperator` | `pushToTalk.forOperator` |
| `pushToTalkForParticipants` | `pushToTalk.forParticipants` |
| `pushToTalkForPinnedTiles` | `pushToTalk.forPinnedTiles` |
| `pushToTalkForQueueTiles` | `pushToTalk.forQueueTiles` |
| `isIncomingCallSoundEnabled` | `notifications.isIncomingCallSoundEnabled` |
| `incomingCallVolume` | `notifications.incomingCallVolume` |
| ringtone selection (prefs ringtones) | `notifications.incomingRingtoneGuid` |
| locale (`localStorage`) | `locale` |
| — | `openCallCardOnHandsetPickup` (new) |
| — | `autoAnswerOnHandsetPickup` (new) |

Миграцию со старых prefs можно делать на клиенте один раз или не делать (чистый старт с defaults) — на усмотрение реализации фронта; для бэка достаточно уметь хранить новую модель.

---

## Открытые вопросы к бэкенду

1. Точный path и `PUT` vs `PATCH`.
2. Нужен ли `revision` / optimistic concurrency.
3. Defaults для двух новых тогглов трубки (`false`/`false` ок?).
4. Валидация `incomingRingtoneGuid` на бэке или opaque.

После ответа можно зафиксировать OpenAPI / пример curl в этом же файле.
