# API routing

## Назначение

Страница фиксирует правила выбора backend base URL для REST endpoints frontend-приложения.

## Текущее понимание

В проекте есть основной backend и дополнительный backend.

Основной backend используется существующими endpoints вроде contacts/configuration и строится через `getAppURL` из `src/shared/url-helper`.

Дополнительный backend используется для части новых endpoints, включая workspace snapshots. Его base URL задается через `VITE_ADDITIONAL_API_URL` (browser/deb и fallback), а frontend-код должен строить такие URL через `getAdditionalApiURL` из `src/shared/url-helper`.

### Electron runtime stand (WUI-5638)

В Electron base URL **не** должны быть единственно bake-in из env на этапе импорта модуля.

- RTU (основной): `getRtuBaseUrl()` из `shared/stand-config` → `getAppURL` / WS приложения
- APS (дополнительный): `getApsBaseUrl()` → `getAdditionalApiURL` / additional WS
- Источник runtime: `userData/config.json` через IPC `standConfig:*` (см. `../electron/stand-config.md`)
- Env `VITE_SERVER_ELECTRON` / `VITE_ADDITIONAL_API_URL` — только fallback, если runtime пустой
- Browser / deb routing и nginx не менялись: same-origin + proxy как ниже

Workspace snapshots API находится на дополнительном backend:

- `GET /api/v1/me/snapshots`;
- `POST /api/v1/me/snapshots`;
- `PUT /api/v1/me/snapshots/{id}`;
- `DELETE /api/v1/me/snapshots/{id}`.

Create body не содержит `snapshot.id`, `widgets[].id` и `widgets[].params`. Backend назначает ids сам. Snapshot widgets не используют `params`: при чтении/обновлении widget содержит `id`, `type`, `position`, при создании — `type`, `position`.

Diagnostics upload пульта находится на дополнительном backend:

- `POST /api/v1/me/diagnostics/upload` — multipart: `file`, `correlationId`, `kind` (`har` | `snapshot` | `archive`); опционально `connectionId`, `hardwareMac`, `hardwareSerial`, `consoleType`, `metadata` (JSON-строка).

Это ответ Console на WS `CollectDiagnosticsRequested`, не пользовательская кнопка в UI. URL строится через `getAdditionalApiURL`. В dev нельзя отдавать этот путь на основной API: иначе upload уйдёт в MOA.

Admin-сторона списка/скачивания (`GET /api/v1/turret/diagnostics`) живёт в dealing-admin и пультом не вызывается.

Fast-dial API панели быстрого вызова находится на дополнительном backend:

- `GET /api/v1/me/fast-dial` — получить сохраненную раскладку ПБВ;
- `POST /api/v1/me/fast-dial/groups` — создать fast-dial group для существующей backend-группы;
- `PUT /api/v1/me/fast-dial/groups/{id}` — заменить список контактов и позиций внутри fast-dial group;
- `DELETE /api/v1/me/fast-dial/groups/{id}` — удалить fast-dial group/layout;
- `PUT /api/v1/me/fast-dial/groups/reorder` — изменить порядок fast-dial groups.

Fast-dial хранит только layout ПБВ. Источником правды по списку групп и принадлежности контактов к группам остается основной backend `/api/user/groups`. Для ПБВ используются только backend-группы с `type: 'user'`.

В fast-dial `contacts[].order` используется как индекс ячейки сетки (`cellIndex`), а не как плотный порядковый номер. Допустимы sparse-значения и пустые ячейки. Лимит frontend-сетки ПБВ — 36 ячеек, индексы `0..35`.

Создание внешнего контакта для ПБВ выполняется на основном backend:

- `POST /api/v1/user/client/contact` — создать новый контакт или добавить существующий контакт в группу.

Для создания внешнего контакта из ПБВ frontend отправляет:

```json
{
  "groupGuid": "active-user-group-guid",
  "name": "79991234567",
  "number": "79991234567",
  "email": ""
}
```

`groupGuid` на frontend-уровне остается опциональным для переиспользования общей `ChangeContactsModal`, но при открытии из ПБВ он всегда передается из активной группы. Если `groupGuid` не передан, старые сценарии модалки временно используют IndexedDB fallback до отдельного перевода на API.

Несмотря на префикс `/api/v1`, endpoint `/api/v1/user/client/contact` относится к основному backend. Его нельзя проксировать на `VITE_ADDITIONAL_API_URL`; в dev proxy он должен идти на `VITE_API_DEV_SERVER`.

Backend DTO контакта должен возвращать `contactType`. Для внешних контактов frontend считает контакт внешним по `contactType: 'externalContact'`; старый fallback `!imLogin && !internalNumber` остается только для совместимости с DTO без `contactType`.

В dev proxy нельзя маршрутизировать весь `/api/v1` на дополнительный backend: префикс `/api/v1` есть и у старого, и у нового backend. На `VITE_ADDITIONAL_API_URL` должны идти только конкретные новые префиксы, например `/api/v1/me/fast-dial`, `/api/v1/me/snapshots`, `/api/v1/me/diagnostics`, `/api/v1/me/goose-settings` и `/api/v1/me/media-device-overrides`. Остальные `/api` и `/api/v1` endpoint'ы должны попадать на основной `VITE_API_DEV_SERVER`.

## Правила и ограничения

- Backend URL не хардкодить в `vite.config.ts` и API methods; значения должны находиться в env-файлах.
- Для основного backend использовать `getAppURL`.
- Для endpoints дополнительного backend использовать `getAdditionalApiURL`.
- В Electron после настройки стенда `getAppURL`/`getAdditionalApiURL` читают runtime stand-config; не кэшировать абсолютные auth URL на уровне модуля.
- В dev/browser запросы к дополнительному backend должны идти same-origin, чтобы не ловить CORS preflight без bearer.
- Vite proxy направляет `/api/v1/me/fast-dial/*`, `/api/v1/me/snapshots/*`, `/api/v1/me/pinned-calls/*`, `/api/v1/me/main-settings/*`, `/api/v1/me/goose-settings/*`, `/api/v1/me/media-device-overrides/*`, `/api/v1/me/activity-monitor/*` и `/api/v1/me/diagnostics/*` на `VITE_ADDITIONAL_API_URL`.
- Vite proxy направляет остальные `/api/*`, включая старые `/api/v1/*`, на основной `VITE_API_DEV_SERVER`.
- Listen/TLS console-сайта задаются через `include /etc/rtu-turret-admin/nginx/{listen,ssl}.conf`. Эти файлы создаёт `rtu-turret-admin` или stub в `preinst`/`postinst` console-пакета (`listen 3333`). Без stub `nginx -t` падает с `open() listen.conf failed`.
- Deb nginx (`extra/etc/nginx/sites-available/rtu-turret-console-dealing`) повторяет Vite-разделение:
  - `/api/v1/me/{fast-dial,snapshots,pinned-calls,main-settings,goose-settings,media-device-overrides,activity-monitor,diagnostics}` и `/ws/` → `127.0.0.1:3000` (turret-admin);
  - остальной `/api/` включая `/api/user/login` → `127.0.0.1:6001` (RTU WebAPI);
  - `/sip` → `127.0.0.1:5059`, `/im` → `127.0.0.1:8145`, `/prompt/` и `/selector/` → `127.0.0.1:8441` (как корневой `nginx.conf`).
  Нельзя отдавать эти пути в `location /` (SPA): SIP/IM тогда получают `index.html`. Нельзя проксировать весь `/api/` на turret-admin.
- Дополнительный backend использует тот же bearer token, что и остальные axios-запросы.
- Для удаления widget отдельного endpoint нет: frontend пересобирает `widgets` и сохраняет snapshot через `PUT`; если удалён последний widget, удаляет snapshot через `DELETE`.
- Для fast-dial `PUT /api/v1/me/fast-dial/groups/{id}` имеет replace-семантику по `contacts`: frontend отправляет полный список позиций группы.
- Если fast-dial layout группы становится пустым, frontend удаляет fast-dial group через `DELETE /api/v1/me/fast-dial/groups/{id}`.
- Fast-dial group не создается при простой загрузке ПБВ без сохраненного layout; создание происходит при первом изменении раскладки.
- Созданный через `POST /api/v1/user/client/contact` внешний контакт должен использовать backend `guid` для дальнейшего сохранения позиции в fast-dial.
- После создания внешнего контакта через backend API UI должен работать с backend DTO, а не с IndexedDB-заглушкой, иначе fast-dial сохранит позицию по несуществующему на backend guid.

Main settings API находится на дополнительном backend:

- `GET /api/v1/me/main-settings` — загрузка настроек пользователя;
- `PATCH /api/v1/me/main-settings` — partial update только изменённых UI-полей; reset — PATCH телом defaults.

Media Devices API (WUI-5528) находится на дополнительном backend:

- `GET/PUT /api/v1/me/goose-settings` — goose preferred/mode/PTT scope (per user);
- `GET/PATCH /api/v1/me/media-device-overrides/{hardwareSerial}` — overrides карточек (`logicalKey`, enabled, volume, AEC).

URL строится через `getAdditionalApiURL`. Контракт: `.ai/tasks/WUI-5528/api-contract.md`.

Ringtone CRUD остаётся на основном backend `/api/prompt*`. `incomingRingtoneGuid: null` в API = системная мелодия; в store — пустая строка.

Runtime wiring (WUI-5527):

- `openCallCardOnHandsetPickup` / `autoAnswerOnHandsetPickup` — `handsetEventHandler` на `PICKUP` (кроме bind активной завешенной линии, WUI-4647);
- `isIncomingCallSoundEnabled`, volume, guid — session facade / global ringtone;
- `isAutomaticallyConferenceRecordEnabled` — watch в store + conference create;
- `showTraining` / reset progress — persist only, tooltips wiring отложены.

## Связанные страницы

- `../frontend/architecture.md`
- `../frontend/stores.md`
- `turret-aps-ws.md`

## Источники

- `vite.config.ts`
- `extra/etc/nginx/sites-available/rtu-turret-console-dealing`
- `src/shared/url-helper/index.ts`
- `src/shared/stand-config/stand-config-runtime.ts`
- `electron/stand-config.mjs`
- `.ai/tasks/WUI-5638/case.md`
- Уточнение пользователя от 2026-09-14 (Electron runtime stand)
- `src/features/diagnostics/api/use-diagnostics-upload-api.ts`
- `src/entities/workspace/api/use-workspace-api.ts`
- `src/entities/fast-dial/api/use-fast-dial-api.ts`
- `src/entities/fast-dial/model/normalizers.ts`
- `src/entities/contact/api/use-contact-api.ts`
- `src/entities/contact/utils.ts`
- `src/entities/contact/model/use-contact-store.ts`
- `src/entities/contact/model/use-contact-cached-store.ts`
- `src/entities/main-settings/api/main-settings-api.ts`
- `src/entities/main-settings/model/main-settings-store.ts`
- `.ai/tasks/WUI-5528/api-contract.md`
- Уточнение пользователя от 2026-09-15 (WUI-5528: goose-settings + media-device-overrides → additional backend)
- `src/shared/controller/event-handlers/handsetEventHandler.ts`
- `src/shared/ui/modals/change-contacts-keyboard/ChangeContactsModal.vue`
- `src/widgets/quick-call-panel/ui/QuickCallPanel.vue`
- Уточнение пользователя от 2026-06-09
- Уточнение пользователя от 2026-06-16
- Уточнение пользователя от 2026-06-17
- Уточнение пользователя от 2026-08-13 (WUI-5032: `/api/v1/me/diagnostics` → additional backend)
- Уточнение пользователя от 2026-08-24 (deb nginx: `/api/user/login` → RTU WebAPI `:6001`)
- `.ai/tasks/WUI-5032/implementation_plan_2.md`

## Открытые вопросы

- Нужны ли отдельные значения `VITE_ADDITIONAL_API_URL` для stage/production окружений.
