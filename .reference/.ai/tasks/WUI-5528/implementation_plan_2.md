# Кейс: WUI-5528 — Media Devices (Main speaker card)

## Описание текущей части кейса

Добавить в Media Devices карточку **Main** — основной динамик пульта (controller `hub` / audiolabel `Main`).

Карточка визуально как goose (сетка полей), но:
- без AEC / noise / AGC;
- без аудио-входа и VAD;
- только аудио-выход + громкость (+ play);
- громкость **синхронизирована с футером** (`globalVolumeMultiplier`).

Шаг 3 UI карточки handset/goose (план 1) считать базой; этот план — следующий UI-кусок до REST.

## Контекст предыдущих частей

- `implementation_plan_1.md` — SettingsCblockTitle, Media page layout, Goose panel, MediaDeviceItem (сетка, VAD, volume%, AEC при hasInput).

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/domain/speakers-ptt.md`
- `.ai/knowledge/wiki/frontend/components.md`

---

# План реализации: Main speaker в Media Devices

## Шаг 1: Hub → logical device Main в `devices-store`

- **Описание:** В `resolveControllerModuleType` / `buildLogicalDevices` учитывать module `hub` (id/name) как logical device основного динамика. Маппить browser output по label `Main` (sinks/audiolabel). Для Settings-модели: `hasOutput: true`, **`hasInput: false`** (даже если hub.features.audio_in), чтобы UI не показывал mic/VAD/AEC. Пометить использованные Main audio deviceIds, чтобы не плодить duplicate browser-карточки. Сохранить/не сломать `preferredPinnedOutputId`.
- **Файлы:** `use-devices-store.ts`, `use-devices-store.test.ts`, при необходимости `types.ts` (если нужен явный type; иначе `OUTPUT` + `id: hub`).
- **Ожидаемый результат:** в `devices` есть устройство Main/hub; browser Main не дублируется; goose/handset без регрессии.
- **Проверка:** unit-тесты store + ручной список на mock controller.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `devices.md` — hub/Main как logical output

## Шаг 2: Volume Main ↔ footer `globalVolumeMultiplier`

- **Описание:** В `MediaDeviceItem` для устройства Main/hub слайдер громкости читать/писать `usePinnedCallsPanelStore.globalVolumeMultiplier` (как `GlobalAppVolumeControl`), а не локальный `volumePercent`. Handset/прочие output — без изменений (in-memory до overrides API). Play-тест выхода — на `device.outputId` Main.
- **Файлы:** `MediaDeviceItem.vue`, `MediaDeviceItem.test.ts`
- **Ожидаемый результат:** крутишь Settings Main → меняется footer volume и наоборот.
- **Проверка:** unit-тест + ручной sync Settings ↔ footer.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (или коротко в devices.md)

## Шаг 3: UI/i18n карточки Main (при необходимости)

- **Описание:** Заголовок cblock / тип устройства / имя по согласованию (i18n). Уточнить switch «Устройство подключено» — показать или скрыть для Main. Добить вёрстку под «как goose, но только output».
- **Файлы:** `MediaDevicePage.vue` / `MediaDeviceItem.vue`, locales
- **Ожидаемый результат:** карточка Main читается как основной динамик; без AEC/VAD/input.
- **Проверка:** ручной UI-review.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
