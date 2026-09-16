# Кейс: WUI-5528 — Media Devices (API / persist)

## Описание текущей части кейса

Подключить REST для раздела Media Devices по актуальному OpenAPI (`src/__mocks_/openapi.json`, сверка 2026-09-15):

1. Goose settings — `GET/PUT /api/v1/me/goose-settings` (убрать `localStorage`).
2. Overrides карточек — `GET/PATCH /api/v1/me/media-device-overrides/{hardwareSerial}`.
3. Save-on-leave: пул flush с Main (dirty → API, fail → rollback + toast).

Список карточек UI по-прежнему из **локальной сборки** `devices-store`. Snapshot `turret-media-devices` в v1 Settings **не подключаем** как источник списка.

**Q1 (закрыто 2026-09-15):** Main volume **persist в overrides**. Footer/header и Settings-карточка — один runtime; смена вне Settings → отдельный debounced PATCH (шаг 5/6).

## Контекст предыдущих частей

- `implementation_plan_1.md` — UI layout, Goose panel, MediaDeviceItem (in-memory).
- `implementation_plan_2.md` — карточка Main / hub + sync volume с footer.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/backend-integration/goose-settings-api.md`
- `.ai/knowledge/wiki/backend-integration/api-routing.md`
- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/domain/speakers-ptt.md`
- `.ai/knowledge/wiki/product/open-questions.md`

---

# План реализации: Media Devices API

## Шаг 1: Proxy + актуальный api-contract

- **Описание:** В `vite.config.ts` добавить proxy на additional backend для `/api/v1/me/goose-settings` и `/api/v1/me/media-device-overrides` (паттерн как `main-settings`). Сверить/держать `.ai/tasks/WUI-5528/api-contract.md` в актуальном виде (уже обновлён 2026-09-15). При необходимости коротко упомянуть пути в `api-routing.md` wiki — только если шаг согласован как wiki-апдейт.
- **Файлы:** `vite.config.ts`; при апруве wiki — `.ai/knowledge/wiki/backend-integration/api-routing.md`
- **Ожидаемый результат:** dev-запросы на goose/overrides уходят на APS, не на основной RTU.
- **Проверка:** `npm run` / ручной Network на GET goose-settings (или unit на конфиг proxy при наличии).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да (коротко: пути в `api-routing.md`), если согласуем в этом шаге

## Шаг 2: API-слой goose-settings

- **Описание:** В `entities/media-devices-settings` (или согласованном FSD-месте) добавить types + `goose-settings-api` через `getAdditionalApiURL`: `fetchGooseSettings`, `putGooseSettings`. Маппинг runtime ↔ DTO (`preferredGooseId` ↔ `preferredGooseModuleId`). Public API через `index.ts`. Паттерн как `entities/main-settings/api`.
- **Файлы:** `src/entities/media-devices-settings/api/*`, `types/*`, `lib/*mapper*`, `index.ts`, unit-тест api/mapper
- **Ожидаемый результат:** изолированный клиент goose REST без wire в UI.
- **Проверка:** unit-тесты api/mapper (AAA).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: API-слой media-device-overrides

- **Описание:** Types + api: `fetchMediaDeviceOverrides(hardwareSerial)`, `patchMediaDeviceOverrides(hardwareSerial, body)`. DTO по OpenAPI (`logicalKey`, `enabled`, `volume`, AEC-триада). PATCH body — только dirty devices с `logicalKey`.
- **Файлы:** те же entity api/types/lib + тесты
- **Ожидаемый результат:** клиент overrides готов; без store/UI.
- **Проверка:** unit-тесты.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Hydrate goose + снять localStorage

- **Описание:** Загрузка goose-settings с API (момент: старт приложения / рядом с main-settings load — уточнить по существующему bootstrap). Применить в `devices-store`. Удалить persist в `localStorage` (`dealing-console:goose-settings`) и связанные тесты. Dirty/synced модель для goose (working copy vs last synced) для последующего leave-flush.
- **Файлы:** `use-devices-store.ts` (+test), media-devices store/composable, место bootstrap load
- **Ожидаемый результат:** goose settings живут с бэка; reload страницы восстанавливает без localStorage.
- **Проверка:** unit + ручной GET→UI selects.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `speakers-ptt.md` / `goose-settings-api.md` — persist с localStorage → REST

## Шаг 5: Store overrides + merge в карточки (+ Main)

- **Описание:** Store/slice overrides: GET по текущему `hardwareSerial`, map по `logicalKey`, merge с локальными devices (`enabled`, `volume`, AEC). Orphans хранить, не рисовать. Редактирование карточки → dirty working copy; runtime сразу. **Main (`hub`):** volume ↔ `globalVolumeMultiplier` (footer/header); hydrate volume с бэка при наличии устройства. Правки Main из Settings попадают в общий dirty overrides (уйдут на leave).
- **Файлы:** media-devices-settings model/store, `MediaDeviceItem.vue` / page wiring, tests
- **Ожидаемый результат:** карточки + Main показывают/меняют overrides; leave ещё не обязателен на этом шаге.
- **Проверка:** unit merge + ручной UI с mock serial; Settings Main ↔ footer sync.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `devices.md` — merge overrides + Main volume

## Шаг 6: Save-on-leave + единый debounced persist Main volume

- **Описание:**
  1. **Main volume — один scheduler:** watch/setter на `globalVolumeMultiplier` → debounced PATCH overrides (`logicalKey` hub + `volume`). Источник UI (Settings или footer/header) **не важен** — оба только меняют runtime.
  2. Main volume **не** входит во второй leave-PATCH «как dirty карточка», иначе двойной запрос. На leave: `flushPendingMainVolumePersist()` (сбросить debounce и отправить, если есть pending).
  3. Leave-пул остального: `main-settings.saveIfDirty()` + goose PUT если dirty + overrides PATCH для **не-Main** dirty devices (enabled/AEC/volume handset/goose и т.д.). Fail → rollback + toast.
- **Файлы:** `SettingsPage.vue`, overrides store, footer volume wiring / pinned-calls panel, i18n
- **Ожидаемый результат:** крутилка в Settings или в футере → максимум один PATCH volume Main за жест; leave не дублирует.
- **Проверка:** Network: change в Settings → 1 PATCH после debounce; сразу leave до debounce → 1 PATCH на leave, без второго; change в футере → 1 PATCH; unit на scheduler/dirty exclude Main volume.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `devices.md` — single persist path for Main volume

## Шаг 7 (опционально / по согласованию): финальные тесты и wiki cleanup

- **Описание:** Добить coverage api/store/leave; закрыть Q1 в `open-questions.md` после решения; обновить wiki draft `goose-settings-api.md` со статусом Implemented (без line-key bindings — они вне 5528).
- **Файлы:** tests, `.ai/knowledge/wiki/**`
- **Ожидаемый результат:** стабильный контракт зафиксирован в wiki.
- **Проверка:** `npm run test` (точечно) / lint затронутых файлов.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да

---

## Вне скоупа этого плана

- `PreferencesReloadRequested` listener.
- Line key bindings API.
- GET snapshot как источник UI-списка.
- Deprecated `media-devices-configs`.
- Миграция overrides между разными `hardwareSerial`.
