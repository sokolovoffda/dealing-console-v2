# WUI-5444 — Settings: redesign + persist на backend

## Исходная задача

Перенести настройки пульта с IM preferences / localStorage на новый backend. Сначала согласовать модели по разделам, затем отдать контракт бэкенду.

Родитель: [WUI-5444](https://jira.satel.org/browse/WUI-5444).  
Подзадачи: WUI-5527 Main, WUI-5528 Media, WUI-5529 Forwarding, WUI-5530 Prioritization, WUI-5531 Line Keys.

## Уточнения пользователя

### Main Settings (2026-08-26)

- IndexedDB для настроек не используем (выпиливаем).
- Пользовательские настройки Main уходим с localStorage на backend (per login).
- **Не берём сейчас:** задние клавиши (`backButtonRole`), диагностика на этой странице.
- На странице Main: обучение (local action), язык, запись групповых, 2 тоггла трубки, PTT (nested), уведомления/рингтон/громкость, кнопка reset (поведение reset пока не фиксируем).
- API shape (GET/PUT vs PATCH, reset endpoint) — на усмотрение бэкенда.
- Defaults при первом логине — отдаёт бэк.
- Locale — как сейчас в клиенте: `ru-RU` | `en-GB` | `zh-CN` | `zh-TW`.
- `openCallCardOnHandsetPickup` — **глобальное** правило открытия карточки при снятии трубки.
  Точечный force-open для группы/контакта — в Prioritization (`forceOpenCallCard`), precedence: группа > контакт > это поле Main.
  См. `backend-prioritization-settings-model.md`.
- Тогглы «открыть карточку» и «автоответ» при снятии трубки — независимы, оба могут быть `true`.
- PTT — nested-объект, не плоский список.
- При `pushToTalk.enabled = false` подрежимы храним, UI — disabled.
- В DTO рингтона — только guid выбора; CRUD файлов остаётся на `/prompt`.
- Громкость `0..100` integer; при выключенном звуке volume всё равно сохраняем.
- Смена locale: желательно без reload, но сейчас reload ок — не блокер для модели.
- Reset настроек — отдельно обсудим, в модель пока не включаем контракт reset.
- `revision` / `updatedAt` — можно добавить; бэкенд может убрать.

### Media Settings (2026-08-26)

- В модель: Goose-блок (`preferredGooseId`, `mode`, `pttScope`) + per-device overrides (icon, iconNumber, echo/noise/AGC, volume, micSensitivity, enabled).
- Inventory устройств на бэк не кладём; карточки автосборные с пульта.
- Селекты browser in/out для тестов — не persist.
- Привязка: **user + station**; при ошибках — defaults пульта и затирание битого на бэке.
- Ключ устройства: стабильный controller/logical id (напр. `goose_L1`), не browser deviceId.
- Volume / micSensitivity: `0..100`, default `50`.
- Orphans в overrides храним — при возврате устройства настройки снова применяются.
- Отдельный ресурс `.../settings/media`; defaults отдаёт бэк.

### Admin vs user access (2026-08-26)

- Как в диспетчере: после PIN Settings расширяется (доп. поля в разделах + целые admin-вкладки).
- Один DTO/ресурс на раздел; поля/секции помечаем `access: user | admin`.
- Сейчас в Main/Media admin-полей нет, но могут появиться позже в том же ресурсе.
- Целевое: write admin-частей только с admin-сессией после PIN; детали unlock отдельно.
- См. `.ai/tasks/WUI-5444/settings-access.md`.

### Forwarding Settings (2026-08-26)

- Оставляем существующий `/api/Forwarding` (+ subscriber-service, Scenario, timetable-template), не новый settings-path.
- Раздел целиком `access: admin`.
- Conditions: unconditional / noAnswer / unreachable / busy.
- `schedule` — как в UI-типе; `isDefault` — как сейчас.
- Сервисы не сужаем до Forward: каталог из `/api/subscriber-service`.
- Привязка: per subscriber/login.
- Favorites `callDiversion` → `guid` правила; отдельный lightweight list не делаем — тот же GET Forwarding.
- См. `.ai/tasks/WUI-5444/backend-forwarding-settings-model.md`.

### Prioritization Settings (2026-08-26)

- Модель как в диспетчере: группы + отдельный список contact-overrides (бывший customize).
- Раздел `access: admin`; новый API per user; defaults могут быть пустыми.
- Global open-card — в Main; здесь только `forceOpenCallCard` (форсировать true).
- Precedence: **группа > контакт > Main**.
- Цвет и рингтон — на группе и на контакте; группа перетирает.
- Контакт максимум в одной группе.
- Appearance пока базовый (цвет + blinking/frequency), без матрицы статусов; полная индикация — open.
- API: предпочтительно отдельный CRUD групп/контактов (детали бэку).
- См. `.ai/tasks/WUI-5444/backend-prioritization-settings-model.md`.

### Hardware / Line Keys Settings (2026-08-26)

- Раздел физ. клавиш (Goose + телефон + задел); **v1** — только line-key bindings.
- Access пока `user`; persist **user + station**.
- `keyId` / `moduleId` как в рантайме; types: `standard` + `pinned-group` (расширяемо).
- Группа: стабильный **`groupId`** вместо `groupIndex` (у групп завешенных сейчас index — нужна миграция к id).
- Non-line (mic/back) пока не в DTO; orphans храним, пульт отсекает.
- Defaults пустые; клиент автоинит пустые standard при появлении модуля.
- API на усмотрение бэка.
- См. `.ai/tasks/WUI-5444/backend-keys-settings-model.md`.

## Ограничения

- Main: persist per user (логин).
- Media / Keys: persist per user + station.
- Локально остаются только действия без persist продукта: сброс обучения; файлы рингтонов через существующий prompt API; тестовые media-селекты.
- Модели обсуждаем по разделам: Main → Media → Forwarding → Prioritization → Line Keys.

## Связанные материалы

- `.ai/tasks/WUI-5444/settings-access.md` — правило user/admin access
- `.ai/tasks/WUI-5444/backend-main-settings-model.md` — согласованная модель Main для бэка
- `.ai/tasks/WUI-5444/backend-media-settings-model.md` — согласованная модель Media для бэка
- `.ai/tasks/WUI-5444/backend-forwarding-settings-model.md` — Forwarding / `/api/Forwarding`
- `.ai/tasks/WUI-5444/backend-prioritization-settings-model.md` — Prioritization
- `.ai/tasks/WUI-5444/backend-keys-settings-model.md` — Hardware / Line Keys
- `.ai/tasks/WUI-5444/backend-settings-dto.md` — сводка DTO + endpoints для бэка
- Notes: Settings sync / 3.0 plan (cursor-skills/todo/NOTES.md)
