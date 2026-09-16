# WUI-5528 — Settings / Media Devices: дизайн + persist на API

## Исходная задача

Подзадача [WUI-5444](https://jira.satel.org/browse/WUI-5444).  
Jira: [WUI-5528](https://jira.satel.org/browse/WUI-5528) — «Settings / Media Devices. Привести в соответствие с дизайном, реализовать функционал».

Скоуп (Jira):
- раздел **Media Devices** (Goose-блок + карточки устройств);
- **не включает:** Main Settings, Forwarding, Prioritization, Line Keys, shell, админ-меню.

Референс: [WUI-5527](https://jira.satel.org/browse/WUI-5527) — готово в develop.

Figma (раздел «Медиа устройства», 2026-08-31):  
https://www.figma.com/design/JTPlAtfAfY1mawkWPsejsY/%D0%9C%D0%B0%D0%BA%D0%B5%D1%82%D1%8B.-%D0%94%D0%B8%D0%BB%D0%B8%D0%BD%D0%B3%D0%BE%D0%B2%D1%8B%D0%B9-%D0%BF%D1%83%D0%BB%D1%8C%D1%82-v3.0?node-id=1196-53362

## Уточнения пользователя

### Старт и порядок (2026-09-01, подтверждено 2026-09-02)

- Shell (5527) **не трогаем**.
- **Сначала UI** по макету (in-memory / runtime `devices-store`), **API и REST — в конце**, отдельный `implementation_plan_2` после готового UI и ответа бэка.
- На UI-этапе **не подключаем** goose/overrides REST, **не снимаем** `localStorage`, **не делаем** save-on-leave для media.
- **Save-on-leave:** да — batch save при уходе из Media / Settings, rollback + toast (как Main).
- **Persist goose:** при подключении REST — **только с API**, `localStorage` `dealing-console:goose-settings` **убрать**.
- **Заголовки секций:** правим общий компонент `SettingsCblockTitle` (не только Media).

### Figma review (2026-09-02, selection в Figma MCP Bridge)

Макет: `Макеты. Дилинговый пульт v3.0 (Copy)` → frame `mediaDevices`.

**Структура страницы (cblock-секции):**

| # | Заголовок cblock | Содержимое в макете |
|---|------------------|---------------------|
| 1 | «Медиа устройства» | Один select «Устройство для закрепленной линии» |
| 2 | «Медиа устройство №1» (Goose) | enabled switch, read-only поля (тип, имя, номер, аудио-вход), select «Режим работы», status, module, VAD-индикатор, switches AEC/noise/AGC |
| 3 | «Медиа устройство №2» (Телефон) | enabled, read-only поля, аудио-выход + volume 60%, status, module, switches AEC/noise/AGC |

**Поля карточки устройства (по макету):**

- Switch «Устройство подключено» (`enabled`).
- Read-only: «Тип устройства», «Название устройства», «Номер», «Аудио-вход» / «Аудио-выход» (+ volume для выхода).
- «Статус» (badge: «Устройство готово» / «Устройство не готово»), «Модуль» (hub).
- Полоска VAD / activity (indicator strip) + кнопки теста (в макете как `btn` рядом с полями).
- Switches: «Эхоподавление», «Шумоподавление», «Автоматическая регулировка усиления».

**Ошибка дизайнера в первом блоке (cblock 1):**

В макете показан **только один** select «Устройство для закрепленной линии».  
**В реализации сохраняем все selects Goose**, как в текущем продукте:

1. Предпочитаемое goose-устройство (закреплённая линия).
2. Режим работы (stateful / PTT).
3. Область PTT — **условно**, при режиме PTT.

То есть блок Goose **не упрощаем** до одного select из макета; вёрстка — wrkspc/cblock как у Main, состав полей — продуктовый.

**Selects в макете:** `cmbBoxBig48` (≈15 на странице) — для UI использовать `wui-select` / `app-select` height 48, как Main Settings.

### Scope карточек v1 (2026-09-01)

- **Без** выбора иконки / `iconNumber` (picker не подключаем).
- **Без** слайдера чувствительности микрофона.
- При **проверке микрофона** — только **VAD / activity** (визуализация активности), как сейчас через `CanvasDevices`.
- Остальное по модели (если есть в макете): volume, enabled, echo/noise/AGC — уточнять по Figma на UI-шаге.

### AEC / noise / AGC и Main (2026-09-03)

- Switches AEC / noise / AGC — **только если `device.hasInput`** (под сеткой полей, не колонкой).
- Для output-only (speakers / Main) — **не показывать**.
- Отдельный вывод / оформление карточки **Main** — **следующий шаг** (после текущего UI карточки).

### Main — основной динамик пульта (2026-09-03)

**Продукт:** Main = динамик hub пульта (`controller` module `hub`, `audiolabel: Main`), не раздел Main Settings.

**Сейчас:**
- `hub` **не** попадает в `devices` (`resolveControllerModuleType` знает только goose/handset).
- Runtime: `preferredPinnedOutputId` ищет browser output с label `Main`.
- Громкость футера: `usePinnedCallsPanelStore.globalVolumeMultiplier` (`GlobalAppVolumeControl`).

**Целевая карточка в Media Devices:**
- Внешне как goose-карточка (те же readonly-поля / сетка), но:
  - **без** AEC / noise / AGC;
  - **без** аудио-входа и VAD;
  - **только** аудио-выход + регулировка громкости (+ play-тест, как у handset output).
- Уровень громкости **синхронизирован с футером** (`globalVolumeMultiplier`), не отдельный in-memory volume карточки handset.
- Не дублировать leftover browser `Main` input/output, когда hub уже в списке.
- Switch «Устройство подключено» для Main — **нет** (устройство всегда активно).
- Имя/заголовок: **«Основной динамик»** (i18n на UI-шаге).
- В списке Media Devices Main **всегда внизу**.
- Mock select audio endpoints для Main **разрешён** (как у остальных controller-устройств при `isMockControllerModules`).

### API (2026-09-01, обновлено 2026-09-15)

- **Источник:** `src/__mocks_/openapi.json` → сводка: `.ai/tasks/WUI-5528/api-contract.md`.
- **Нет** `/settings/media?stationId=` — вместо этого:
  - `GET/PUT /api/v1/me/goose-settings` (per user);
  - `GET/PATCH /api/v1/me/media-device-overrides/{hardwareSerial}` (**есть в OpenAPI с 2026-09-15**);
  - `GET /api/v1/me/turret-media-devices/{hardwareSerial}?consoleType=dealing` (snapshot, side-channel).
- **`stationId` не нужен.** `hardwareSerial` — path для overrides (и snapshot).
- Deprecated: `media-devices-configs/*` — не использовать.

### Решения для запроса бэку (2026-09-02, статус 2026-09-15)

| # | Решение |
|---|---------|
| 1. Scope overrides | **user + hardwareSerial** — **подтверждено OpenAPI** |
| 2. Ключ устройства | **`logicalKey` only** (`goose_L1`, …) — контракт с железом пульта; uuid не используем |
| 3. Поток данных | Список UI = **локальная сборка**; snapshot — side-channel; user edits → **PATCH** overrides |
| 4. AEC | **Редактируемые + persist** (`echoCancellation` / `noiseSuppression` / `autoGainControl`) |
| 5. Save | Dirty / synced; leave → flush пула (main + goose + overrides); fail → rollback + toast |
| 6. Поля overrides | `volume` 0–100, `enabled`, AEC-триада; без micSensitivity/icon в v1 |
| 7. Scope goose vs overrides | **Закрыто (модель C):** goose **per user**, overrides **user + serial** |
| 8. Не в v1 | PreferencesReloadRequested, micSensitivity, icon, deprecated KV, uuid как ключ overrides; миграция overrides между serial |

### Часть 2 — API (старт 2026-09-15)

- Ветка: `feature/WUI-5528-p2`.
- UI-часть (план 1 + Main card в плане 2) считается базой; дальше — REST hydrate/persist.
- Новый OpenAPI закрыл endpoint overrides и Q2 (scope).

### Q1 Main volume — решение (2026-09-15)

- **Да, сохраняем** volume Main в `media-device-overrides` (`logicalKey` hub/main).
- Main = обычный logical media device: громкость из **футера/хедера** и из **Settings-карточки** — один runtime (`globalVolumeMultiplier`), оба UI только пишут в него.
- **Persist Main volume — один путь, не два:**
  - любой change `globalVolumeMultiplier` (Settings **или** footer) → **один** debounced PATCH overrides (только Main volume);
  - **не** класть Main volume отдельно в leave-dirty pool «как остальные поля карточек», иначе будет второй запрос на leave;
  - на leave: если debounce ещё pending → `flushNow()` того же scheduler’а (дождаться/отправить один PATCH), не дублировать.
- Остальные overrides (handset/goose `enabled`/AEC/volume и т.д.) + goose-settings — по-прежнему **save-on-leave**.
- Итог: крутишь в Settings → runtime sync с футером → **один** debounced PATCH (или flush на leave, если ушёл раньше debounce). Крутишь в футере → тот же scheduler.

### Критические сценарии persist (согласовано 2026-09-03)

- **Ошибка PATCH на leave** → rollback + toast (паттерн Main); пул flush’ей на leave.
- **Бэк есть / локально 0 устройств** → empty-state; orphans в store; бэк не чистим.
- **Появились новые устройства** → defaults; merge по `logicalKey`; orphans без железа не рисуем.
- **Смена serial / другой пульт** → запросы с serial **текущего** пульта; новый bucket; без миграции.
- **Orphan logicalKey** → запись на бэке без локального устройства: не UI, не delete.
- **Main volume** → UI = footer runtime (`globalVolumeMultiplier`); hydrate с бэка только если Main есть и сматчили. Persist Main на бэк — **закрыто (Q1, 2026-09-15)**.

Текст для обсуждения: `.ai/tasks/WUI-5528/discussion-media-persist-model.md`.

### Часть 3 — runtime wire overrides (2026-09-15)

Ветка та же: `feature/WUI-5528-p2`. Persist (plan3) готов; overrides почти не влияют на поведение пульта (кроме Main volume).

**Факт:** AEC / noise / AGC / `enabled` / volume handset|goose пишутся в overrides store + API, но **не мержатся** в `LogicalMediaDevice`. Сессии читают поля устройства → сейчас всегда дефолты (`true` / устройство «включено»).

#### Решения (уточнение пользователя 2026-09-15)

**A. Прокидывание в runtime**

- Overrides (`enabled`, volume, `echoCancellation`, `noiseSuppression`, `autoGainControl`) → поля `LogicalMediaDevice` сразу при hydrate и при правке в Settings.
- Тогда существующие answer/call/handset paths, которые уже читают `device.echoCancellation` и т.д., получают пользовательские значения на **следующем** getUserMedia.

**B. Смена AEC-триады (и аналогично volume устройства, если трогаем mid-session constraints)**

- Если на устройстве есть активные сессии → **не применять** изменение; **toast / просьба завершить сессии** на этом устройстве, затем менять настройку.
- Без сессий на устройстве → применять сразу в runtime (+ dirty persist как сейчас).

**C. `enabled` (soft-disable) — сразу в runtime**

- Выключено = устройство выведено из работы пульта (не физический unplug).
- **Main:** switch по-прежнему нет (всегда on).
- **Трубки footer:**
  - OFF + нет активности → disabled, без подсветки.
  - OFF + активность (ringing/call) → подсветка статуса **как сейчас**; клик = select + **открыть карточку (просмотр)**; Answer / снятие трубки / принять → **toast**.
  - Клик ≠ принять: open/select отдельно от accept.
  - Обе OFF → футер **не пустой**, обе disabled (с правилами выше при активности).
  - Только одна ON → она **автоматически selected** (допилить, если left OFF остаётся selected).
- **Goose / pinned:** выключить goose при активных pinned на нём → **запрет + нотификация**. Попытка принять/позвонить на выключенный goose → toast; активность в завешенных **видна**.
- **ПБВ:** активность линии видна; взять вызов при lockdown / без устройства → toast.
- **Lockdown (все usable OFF):** SIP/индикация живут; звонки **не дропаем**; видны в UI; медиа-действия (answer/bind/PTT/off-hook) → toast с понятной причиной (включить устройство в Media Devices). Просмотр карточки — можно.
- Актив на трубке при попытке OFF → **перенос** (если есть куда) **или блок + предупреждение**; default реализации: блок+toast, если некуда перенести; авто-перенос без спроса — не делаем (диалог переноса — по возможности в этом же плане или follow-up, зафиксировать в плане).

**D. Не в этом куске**

- `PreferencesReloadRequested`, Line Keys, snapshot как источник списка, hard LED-off на контроллере (можно follow-up).

### Не в скоупе v1

- **`PreferencesReloadRequested`** — **не делаем** (подтверждено 2026-09-01).

## Пояснения (из обсуждения)

### hardwareSerial (не stationId)

Для **GET списка устройств** в path: `hardwareSerial` контроллера (уже приходит из controller WS).  
Goose settings — **per user**, serial не нужен.

### PreferencesReloadRequested — что это

Когда **админ** меняет настройки пользователя в Dealing Admin, сервер шлёт WS-событие «перезагрузи настройки». Console должен сделать GET и обновить UI без relogin.  
В 5527 listener **не делали** — в 5528 тоже **откладываем**.

## Backend (комментарий Сергея, 2026-08-26)

- `GET/PUT /api/v1/me/goose-settings` — `preferredGooseModuleId`, `mode`, `pttScope`, `schemaVersion: 1`.
- Список устройств: `GET …/turret-media-devices/{hardwareSerial}` (+ WS `MediaDevicesReported`).
- Deprecated: `media-devices-configs/*` (KV).

## Текущее состояние кода (2026-09-15, plan4 done)

| Область | Состояние |
|---------|-----------|
| Shell Settings | Готов (5527) |
| Goose persist | REST hydrate + save-on-leave / logout (plan3) |
| Overrides persist | REST hydrate + dirty PATCH; Main volume debounce (plan3) |
| Overrides → runtime | **Готово** — merge в `LogicalMediaDevice` (plan4) |
| `enabled` / футер / lockdown / ПБВ | **Готово** (plan4 steps 3–5) |
| AEC guard при сессиях | **Готово** (plan4 step 2) |
| Line key bindings | Вне 5528 |
| Диалог переноса с трубки при OFF | Follow-up (v1 = блок+toast) |
| `PreferencesReloadRequested` | Вне скоупа |

## Ограничения

- Shell, Main — не в скоупе.
- Line Keys — WUI-5531.
- WebRTC/SIP — ручное тестирование.

## Связанные материалы

- `.ai/tasks/WUI-5528/discussion-media-persist-model.md` — **текст для обсуждения с бэком/продуктом (2026-09-03)**
- `.ai/tasks/WUI-5528/figma-review.md` — разбор выделенного макета (2026-09-02)
- `.ai/tasks/WUI-5528/media-devices-api-explained.md` — **подробно: как сейчас, что не так, запрос бэку**
- `.ai/tasks/WUI-5528/api-contract.md` — краткий контракт для интеграции
- `src/pages/main/ui/settings-page/ui/SettingsCblockTitle.vue`
- `src/entities/media-devices-settings/*`
