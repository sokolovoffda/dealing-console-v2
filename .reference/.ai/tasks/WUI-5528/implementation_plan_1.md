# Кейс: WUI-5528 — Media Devices (UI first)

## Описание текущей части кейса

Переверстать раздел «Медиаустройства» по Figma на **статичных defaults** (runtime `devices-store` + локальные defaults для editable полей).  

**API / REST — только после UI** (`implementation_plan_2`, отдельное одобрение): goose GET/PUT, overrides GET/PATCH, WS snapshot, save-on-leave, снятие `localStorage`.

## Контекст

- WUI-5527: shell + Main готовы.
- Уточнения: `.ai/tasks/WUI-5528/case.md`.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/domain/speakers-ptt.md`
- `.ai/knowledge/wiki/frontend/components.md`

---

# План реализации: UI first

## Шаг 1: `SettingsCblockTitle` + базовая структура Media page

- **Описание:** Подправить общий `SettingsCblockTitle` под макет (типографика/отступы/border — по Figma и Main). Перестроить `MediaDevicePage`: убрать legacy header и `bg-black-*`, layout как у `MainSettings` (секции с `settings-cblock-title`, wrkspc-токены, scroll внутри content area shell).
- **Файлы:** `SettingsCblockTitle.vue`, `MediaDevicePage.vue`, при необходимости i18n.
- **Ожидаемый результат:** страница визуально в одной системе с Main; блоки «Управление микрофоном» и список устройств разделены cblock-заголовками.
- **Проверка:** ручной просмотр `/main/monopoly/settings` → Media Devices vs Figma + Main Settings.
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 2: Goose panel по макету

- **Описание:** Переверстать `GooseMediaSettingsPanel`: wrkspc-токены, cblock «Медиа устройства», сетка/лейблы/select как в Main (`cmbBoxBig48` → `wui-select` h-48). **Все 3 select сохраняем** (preferred goose, режим работы, PTT scope при PTT) — в макете cblock 1 ошибочно только один select; см. `case.md` § Figma review. Логика через `useGooseMediaSettings` без изменений persist (пока localStorage).
- **Файлы:** `GooseMediaSettingsPanel.vue`, при необходимости `use-goose-media-settings.ts`.
- **Ожидаемый результат:** блок Goose визуально готов; selects работают как сейчас.
- **Проверка:** ручной просмотр при наличии goose-модуля (mock/real controller).
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 3: Карточка устройства по макету (без icon / mic sensitivity)

- **Описание:** Переверстать `MediaDeviceItem`:
  - read-only: имя, тип, модуль, status badge, labels in/out (как сейчас из runtime);
  - editable на defaults/in-memory: volume, enabled (если в макете), echo/noise/AGC switches;
  - **без** icon picker и **без** mic sensitivity;
  - тест микрофона: `wui-btn` + `CanvasDevices` (VAD activity);
  - тест выхода: `wui-btn` + ringtone;
  - убрать native `<button>`.
  Persist overrides — заглушка в composable/store slice (in-memory), без API.
- **Файлы:** `MediaDeviceItem.vue`, при необходимости types/helpers в `entities/media-devices-settings`, тесты `MediaDeviceItem.test.ts`.
- **Ожидаемый результат:** карточки по макету; тест mic показывает activity; изменения живут до reload.
- **Проверка:** UI-review + ручной тест in/out на mock controller.
- **Коммит после шага:** Да
- **Wiki:** Нет

---

## Следующий plan (после UI, отдельное одобрение)

- REST goose: `GET/PUT /api/v1/me/goose-settings` (см. `api-contract.md`)
- GET profile: `/api/v1/me/turret-media-devices/{hardwareSerial}`
- Убрать `localStorage` goose из `devices-store`
- Overrides карточек — **ждём endpoint** или in-memory
- Save-on-leave в `SettingsPage`
- Unit-тесты API/mapper
