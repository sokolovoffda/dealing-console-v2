# WUI-5527 — Settings / Main Settings: дизайн + persist на API

## Исходная задача

Подзадача [WUI-5444](https://jira.satel.org/browse/WUI-5444).  
Jira: [WUI-5527](https://jira.satel.org/browse/WUI-5527) — «Settings / Main Settings. Привести в соответствие с дизайном, реализовать функционал».

Описание в Jira (базовый скоуп Main):
- раздел Main Settings (язык, обучение, PTT, уведомления/рингтоны и связанные main settings);
- **не включает** (по тексту Jira): shell Settings, Media Devices, Forwarding, Contacts Tabs, Prioritization, Line Keys, админ-меню.

Backend (факт из OpenAPI 2026-08-27 + комментарий в тикете):
- `GET`/`PATCH` `/api/v1/me/main-settings` (+ admin mirror `/users/{userId}`, `/import`).
- DTO **плоский** `MainSettings` — см. `.ai/tasks/WUI-5527/api-contract.md`.
- Reset: **PATCH полным default-телом** (отдельный reset endpoint не делаем).
- Просим у Сергея: убрать PTT-поля из Main API; добавить поле режима обучения; уточнить locale / ringtoneGuid / тогглы трубки и `PreferencesReloadRequested`.

## Уточнения пользователя

### Скоуп и shell (2026-08-27)

- В этом кейсе закрываем **дизайн shell** (хедер + две колонки) **и** раздел **Основные настройки** (дизайн + API).
- Другие разделы: **не трогаем** состав меню и их контент (только shell chrome + Main).
- Monopoly-виджет; по умолчанию открываются **Основные настройки**.
- Layout: **слева меню, справа контент**.
- Title хедера: **«Настройки / {название раздела}»**.
- Logout + version внизу сайдбара: **пока оставляем**.
- Active-state пунктов меню: ориентир на макет / WUI Kit (`contextMenuItem`).
- Диагностику с Main **убираем**; доступ из админки к диагностике остаётся.

### Main — UI и поведение (2026-08-27)

- Title хедера подтверждён: **«Настройки / {раздел}»**.
- Блоки **по макету**: обучение (select + «Сбросить прогресс»), локализация, групповые вызовы, уведомления (мелодия + select + таблица/upload).
- **PTT в UI Main не будет** (решение созвона). У бэка запрошено убрать все `pushToTalk*` из Main DTO.
- Громкость входящего и «Сбросить настройки» — **в том же порядке, что сейчас в продукте**.
- Секция **«При снятии трубки»** (два свича: открыть карточку / автоответ) — **дизайнёр подтвердил 2026-08-27 («Ок, добавим»)**; поля `openCallCardOnHandsetPickup`, `autoAnswerOnHandsetPickup` уже были в нашем DTO WUI-5444, у бэка напомнили что их нет в swagger.
- SODS-поля `isDialpadHandsetEnabled` / `isSelectContactCards` / `isCancelForcedAnswerEnabled` — **диспетчерские**, в UI дилинга не показываем.
- `PreferencesReloadRequested` listener — **не в этом кейсе** («потом»).
- «Сбросить настройки»: запрос на бэк, который **проставляет defaults** (не «просто local reset без API»).
- Select «Показывать обучение»: опции ориентир — при первом запуске / всегда / никогда (уточнить тексты у дизайнера); **пока не сохраняем** (позже добавить в модель бэка).
- «Сбросить прогресс»: целевое — сброс прогресса тултипов без reload; **на этом этапе кнопка без callback** (обучение позже).
- Locale (целевое): **source of truth — Main API** (синхронизация между пультами). **Interim до REST:** store + `setLocale()` + `localStorage` ключ `i18n` (отдельно от `auth_user`).
- Ringtone: выбор guid — Main API; CRUD файлов — `/api/prompt` (legacy `lang=ru-RU` hardcode, **без** refetch при смене locale UI).
- Миграции со старых IM `mainSettings` **нет** — defaults с бэка.
- Ошибка PATCH: **optimistic UI + rollback к последнему успешному состоянию + пользовательский feedback (тост/ошибка)** — не молча оставлять рассинхрон.

### Persist и store (согласовано 2026-08-28)

- **`useMainSettingsStore` переписываем с нуля** — legacy IM (debounce/watch/`loadByPreferences`) не тащим.
- **Не debounce PATCH на каждое поле.** Runtime — сразу в store; **на сервер — batch PATCH при уходе** с Main / из Settings + logout (+ `beforeunload` в Electron). Reset — **сразу** PATCH defaults (кнопка **disabled** до REST).
- Interim (до REST): store **in-memory**; UI можно крутить → store; после reload — defaults (ок). Сложные draft-паттерны не нужны.
- Select мелодии входящего: guid в **main store** (in-memory до REST); **IM `ringtones` preferences отключены** (2026-08-28).
- Ringtones upload/list/delete: **старое API сейчас**; `fetchRingtones` — `?lang=ru-RU` как в legacy; **не** перезапрашивать список при смене locale UI.
- REST entity-слой (`main-settings-api`, mapper): **ждём ответ бэка** (PTT, locale, training, handset в swagger).

### Locale и i18n (согласовано 2026-08-28)

- **Reload приложения для смены языка не нужен** — `setLocale()` подгружает JSON и переключает vue-i18n (как `localization-button`).
- **Где хранится locale сейчас:** `localStorage['i18n']` = строка `ru-RU` / `en-GB`; **не** внутри `auth_user`. Main settings historically — IM preferences (`mainSettings`), locale туда не входил.
- **localStorage для несекретных данных (locale) — ок** как interim/cache; минус — нет синхронизации между машинами (решает Main API на REST-шаге).
- WUI common-library: внутренние строки без props — через `handleLocaleChange` / `include` или props с `t('…')`; расширение `include` — tech debt, не блокер; reload не требуется.

### Store rewrite (согласовано 2026-08-28)

- State: все поля Main UI + `incomingRingtoneGuid`; PTT **не в Main store** — позже отдельные настройки конференций.
- `applyLocale(locale)` → patch store + `setLocale()` + `localStorage 'i18n'`.
- Side-effect автозаписи конференций при `isAutomaticallyConferenceRecordEnabled` — **сохраняем**.
- Preferences hub: `loadByPreferences` для `mainSettings` — отключить; `App.vue` `flushPendingSave` для main-settings — no-op до REST.

### Figma (актуальный файл)

- Файл: https://www.figma.com/design/XaA5Eer86NRcOaUbsJIanv/
- Shell: node `1196-57844`
- Main content: node `1232-55381`
- Full screen: node `1248-65454`

## Ограничения

- Media / Forwarding / Prioritization / Line Keys / Contact tabs / Indication — **не в скоупе** реализации контента.
- Админ-PIN / unlock — не в скоупе.
- Training select persist и реальный reset прогресса — отложены.
- WebRTC/SIP автотестами не покрываем.
- IndexedDB для настроек не используем.

## Текущее состояние кода (2026-08-28)

- Shell + Main UI по Figma — **готовы** (scroll/layout исправлен).
- `MainSettings.vue` — wired к store + ringtones CRUD (**шаг 2.3**).
- `useMainSettingsStore` — переписан (шаг 2.1); REST persist — шаг 2.5.
- `useRingtonesStore` + `/api/prompt*` — CRUD в Main подключён.

## Связь с WUI-5219 (ringtones, 2026-08-28)

Jira: [WUI-5219](https://jira.satel.org/browse/WUI-5219) — сброс/пропажа мелодии после обновления 2.8.19 → 2.8.20.

**Два сценария у клиента:**

| | Файл в «Загруженные аудиофайлы» | Селектор | Причина |
|---|---|---|---|
| **A — сброс выбора** | есть | «По умолчанию» | IM Preferences `ringtones` |
| **B — пропал файл** | нет | — | Файл не в prompt API (SSH ≠ UI upload) |

**Фиксы из `bugfix/WUI-5219` (commit `8d32d1ab`, уже в текущей ветке):**

- `POST /api/prompt` — передаётся актуальный **`categoryGuid`**
- **`ensureAudioCategoryReady()`** — валидация categoryGuid из prefs перед upload (stale guid с другого контура)
- **`isSameGuid`** — сравнение guid/owner с/без дефисов при фильтрации списка
- Убран ручной `Content-Type: multipart/form-data` в axios

**WUI-5527 step 2.3 — дополнения поверх WUI-5219:**

- Watch удаления мелодии: `findRingtoneByGuid` + `isSameGuid` (не `Map.has`)
- Выбор мелодии: main store in-memory; воспроизведение входящего — `incomingRingtoneGuid` + `ringtonesList` (без IM prefs)
- После reload select сбрасывается до REST Main API — **ок**
- Пустая таблица: слот `#emptyData` с `t('NoData')`

**IM `ringtones` key (legacy):** хранил выбранную мелодию + categoryGuid; загрузка/сохранение **отключена**. Файлы — только `/api/prompt*`.

**Источники:** Jira WUI-5219; `bugfix/WUI-5219` в `projects-other-branches/dealing-console-ui`; код `use-ringtones-store.ts`, `RingtoneUpload.vue`.

## Порядок реализации (2026-08-28)

1. ~~Дизайн shell~~ — готово (`implementation_plan_1`, шаг 1).
2. ~~Дизайн Main UI~~ — готово (`implementation_plan_1`, шаг 2).
3. **Rewrite store + wiring + ringtones CRUD** — `implementation_plan_2.md` (шаги 1–3).
4. REST entity + persist — `implementation_plan_2.md` (шаги 4–6), **после ответа бэка**.

См. **`implementation_plan_2.md`**.

## Порядок реализации (2026-08-27, архив)

1. Дизайн shell виджета настроек.
2. Дизайн Main на **статичных defaults** (без REST).
3. Затем API (контракт → entity → store), после ответа бэка.

См. `implementation_plan_1.md`.

## Запросы к бэку (отправлены 2026-08-27, ждём ответ)

1. Убрать все `pushToTalk*` из Main (PTT в UI основных не будет — решение созвона).
2. Добавить режим «Показывать обучение»: `first-launch` / `always` / `never`.
3. В swagger нет, но в DTO скидывали: `locale`, `incomingRingtoneGuid`, `openCallCardOnHandsetPickup`, `autoAnswerOnHandsetPickup` — добавить/вернуть.
4. Reset = PATCH полным default body — ок?

## Открытые (не блокер старта UI)

- Ответ бэка по пунктам выше.
- Макет секции трубки после дорисовки дизайнером.
- Listener `PreferencesReloadRequested` — позже.

## Связанные материалы

- Jira: https://jira.satel.org/browse/WUI-5527
- Parent: https://jira.satel.org/browse/WUI-5444
- `.ai/tasks/WUI-5444/backend-main-settings-model.md`
- `.ai/tasks/WUI-5444/backend-settings-dto.md`
- Код: `SettingsPage.vue`, `MainSettings.vue`, `entities/main-settings`
