# Кейс: WUI-5527 — Main Settings: store + ringtones + REST (позже)

## Описание текущей части кейса

UI shell и Main Settings по макету **готовы**.  
Следующий этап: store, wiring UI, CRUD рингтонов на старом API.  
REST `GET/PATCH /api/v1/me/main-settings` — **в конце**, после ответа бэка.

## Контекст

- `implementation_plan_1.md` — шаги 1.1–1.2 (shell + Main UI) выполнены.
- Детали: `.ai/tasks/WUI-5527/case.md`, `api-contract.md`

## Модель persist (2026-08-28)

| Слой | Когда | Что |
|------|--------|-----|
| Runtime (store) | сразу | switches, volume, locale → `setLocale`, автозапись конф. |
| `localStorage['i18n']` | `applyLocale` | interim cache до REST |
| PATCH Main API | уход с Main/Settings, logout, beforeunload | batch dirty полей |
| Reset | по кнопке (после REST) | PATCH default body |
| Ringtones CRUD | сразу | `/api/prompt*`, `lang=ru-RU`; без refetch при смене locale UI |

Interim до REST: store in-memory; после reload — defaults.

---

# План: store → wiring → ringtones → REST

## Шаг 2.1: Переписать `useMainSettingsStore` и типы ✅

- Store с нуля: без IM debounce/watch/`loadByPreferences`.
- State: поля Main UI + `incomingRingtoneGuid`. PTT **не** в store.
- API: `settings`, `syncedSettings`, `isDirty`, `patchSettings`, `applyLocale`, `resetToDefaults`, `saveIfDirty` (no-op), `init`.
- Side-effect автозаписи конференций — оставить.
- Preferences hub: `init()` вместо `loadByPreferences`; `flushPendingSave` — no-op до REST.
- **Файлы:** `entities/main-settings/*`, `use-preference.ts`
- **Проверка:** `npm run test`, `ts:check`

## Шаг 2.2: Wiring `MainSettings.vue` → store ✅

- `storeToRefs(settings)` вместо локальных `ref`.
- Locale → `applyLocale` (без reload).
- Рингтон select → `incomingRingtoneGuid` (без `onSelectRingtone`).
- «Сбросить настройки» — disabled + tooltip.
- «Сбросить прогресс» — без callback.
- **Файлы:** `MainSettings.vue`, i18n `ResetSettingsUnavailable`
- **Проверка:** ручной просмотр Main

## Шаг 2.3: Ringtones CRUD (старое API) ✅

- `ringtonesStore.loadStore()` при входе в Main.
- `RingtonesTable`: store, delete, player.
- `RingtoneUpload`: `saveNewRingtone` (`lang: 'ru-RU'`).
- Progress bar из `usedSpace`.
- Select входящего **не** связывать с `customRingtone` / IM prefs.
- **Не** refetch ringtones при смене locale UI.
- **Файлы:** `MainSettings.vue`, `RingtonesTable.vue`, `RingtoneUpload.vue`
- **Проверка:** ручной upload + delete + usedSpace

## Шаг 2.4 (после бэка): REST entity-слой ✅

- Store = API DTO 1:1 (`showTraining`, SODS pass-through, volume default 100).
- `main-settings-api.ts`, `getDirtyMainSettingsUiPatch` (PATCH только UI-diff).
- **Проверка:** unit tests, `ts:check`

## Шаг 2.5: Store → REST persist ✅

- Boot: GET → store → `applyLocale`.
- Save-on-leave: `saveIfDirty()` — batch PATCH dirty; rollback + toast.
- Reset → PATCH UI-defaults; enable кнопку сброса.
- Убрать IM `mainSettings` из preferences hub.
- **Wiki:** `im-preferences.md`
- **Проверка:** GET→UI→уход→PATCH→reload

## Шаг 2.6: Стабилизация ✅

- Тесты: `main-settings-api`, init fallback, handset pickup wiring (`handsetEventHandler.test.ts`).
- WUI `include`: ключи Main Settings / ringtones table в `handleLocaleChange`.
- Handset toggles wired; reset settings — confirm modal.
- PTT — отдельные настройки конференций (не в Main store).
- **Wiki:** `api-routing.md` (Main settings API + runtime wiring).
- **Проверка:** `npm run test` (main-settings + handset), `lint`, `ts:check`.

---

**Статус:** plan 2 завершён (шаги 2.1–2.6).
