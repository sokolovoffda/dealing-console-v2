# WUI-5527 — контракт Main Settings API

Источник: ответ бэкенда + OpenAPI Dealing Admin API, 2026-08-31.

## Endpoints

```text
GET   /api/v1/me/main-settings   → MainSettings
PATCH /api/v1/me/main-settings   ← MainSettingsPatchBody (все поля optional)
      → MainSettings
```

Admin mirror: `/api/v1/users/{userId}/main-settings`.

`PUT /import` — полная замена (не используем в dealing UI).

## MainSettings (GET / PATCH response)

```json
{
  "isIncomingCallSoundEnabled": true,
  "isAutomaticallyConferenceRecordEnabled": true,
  "isDialpadHandsetEnabled": true,
  "isSelectContactCards": true,
  "isCancelForcedAnswerEnabled": true,
  "incomingCallVolume": 100,
  "locale": "ru-RU",
  "showTraining": "first-launch",
  "incomingRingtoneGuid": "string",
  "openCallCardOnHandsetPickup": true,
  "autoAnswerOnHandsetPickup": true
}
```

| Поле | UI dealing | Примечание |
|------|------------|------------|
| `isIncomingCallSoundEnabled` | да | |
| `isAutomaticallyConferenceRecordEnabled` | да | |
| `incomingCallVolume` | да | default 100 |
| `locale` | да | `ru-RU`, `en-GB`, … |
| `showTraining` | да | `first-launch` \| `always` \| `never` |
| `incomingRingtoneGuid` | да | CRUD файлов — `/api/prompt*` |
| `openCallCardOnHandsetPickup` | да | |
| `autoAnswerOnHandsetPickup` | да | |
| `isDialpadHandsetEnabled` | **нет** | SODS legacy, храним в store с GET |
| `isSelectContactCards` | **нет** | SODS legacy |
| `isCancelForcedAnswerEnabled` | **нет** | SODS legacy |

PTT-полей в DTO нет — ок.

## PATCH strategy (2026-08-31)

**Обычное сохранение:** partial PATCH — только изменённые **UI-поля** (`getDirtyMainSettingsUiPatch`).

- GET → `applyFromApi` → store + `syncedSettings`
- пользователь меняет настройки
- уход с экрана / logout → `PATCH` body = diff UI-полей
- SODS-поля **не шлём**, если пользователь их не менял → на сервере остаются как были

**Сброс настроек (кнопка):** PATCH только UI-defaults (те же ключи, что в UI), SODS не трогаем.

PUT для partial update не нужен — PATCH по контракту для частичного обновления.

## Frontend mapping

Store `MainSettings` = API DTO 1:1 (без отдельного mapper-слоя).

Файлы:
- `entities/main-settings/types/index.ts`
- `entities/main-settings/api/main-settings-api.ts`
- `entities/main-settings/lib/get-dirty-main-settings-patch.ts`
