# Кейс: WUI-5084 — New Media Devices Stores

## Описание текущей части кейса

Нужно довести новые `devices-store-new` и `devices-sessions-store-new` до рабочего состояния, переключить приложение со старых стор на новые, сохранить текущие сценарии вызовов/контроллера и удалить старые сторы. Backend в этой части не трогаем, IndexedDB не переносим.

Целевая модель: пользователь работает не с отдельными input/output/module, а с готовыми logical devices. Goose и Handset определяются приложением по доступным browser media endpoints и известному контракту labels `Module_*`; внешние пользовательские устройства отображаются как доступные audio endpoints. Controller modules не являются состоянием device store, controller events резолвятся точечно в controller/session layer.

## Контекст предыдущих частей

- `implementation_plan_1.md` — создан базовый `devices-store-new`: типы browser audio endpoints, фильтрация `enumerateDevices()`, `init()`/`dispose()` и public API. `devices-sessions-store-new` создан как пустая заготовка.

## Связанные страницы проектной памяти

- Связанные страницы не найдены.

# План реализации: финализация и переключение media device stores

## Шаг 1: Зафиксировать модель logical devices поверх browser endpoints

- **Описание:** Расширить `devices-store-new` типами logical device/profile и resolver-логикой. Разделить raw browser endpoints (`audioInputs`, `audioOutputs`) и пользовательские устройства (`devices`, `gooseDevices`, `handsetDevices`, `queueDevices`). Заложить поля настроек: `echoCancellation`, `noiseSuppression`, `autoGainControl`, `icon`, `iconNumber`, `order`, `mode`, `pttScope`. Не подключать backend, IndexedDB и controller modules.
- **Файлы для изменений:**
  - `src/shared/composables/state/devices-store-new/types.ts`
  - `src/shared/composables/state/devices-store-new/use-devices-store.ts`
  - `src/shared/composables/state/devices-store-new/index.ts`
  - при необходимости новый локальный helper в `src/shared/composables/state/devices-store-new/`
- **Ожидаемый результат:** Новый device store возвращает готовые logical devices для UI/call flows, но сохраняет доступ к raw audio endpoints.
- **Проверка:** `npm run ts:check`, точечный ESLint по новым файлам.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Автоматически собирать Goose, Handset и внешние устройства

- **Описание:** Реализовать построение списка logical devices из двух источников: `command_exec.modules` от controller и browser endpoints из `enumerateDevices()`. Controller modules использовать как источник типа, доступности и hardware identity (`goose_L1`, `handset_L2`, `audiolabel`, `features`, `sources`, `sinks`). Browser endpoints использовать как источник реальных `deviceId` для `getUserMedia` и вывода звука. Связку делать через `audiolabel`/`sources`/`sinks` и label endpoint. Handset должен иметь связанную пару input/output; Goose — input и свои настройки PTT. Внешние USB/headset устройства, не связанные с controller module, не склеивать насильно: показывать как отдельные доступные input/output endpoints или простые custom devices по текущей модели. Не возвращать IndexedDB и старую controller-managed profile синхронизацию.
- **Файлы для изменений:**
  - `src/shared/composables/state/devices-store-new/use-devices-store.ts`
  - `src/shared/composables/state/devices-store-new/types.ts`
  - `src/shared/composables/state/devices-store-new/index.ts`
- **Ожидаемый результат:** Store строит список готовых устройств из controller modules и browser endpoints: Goose, Handset, внешние/прочие endpoints, без `default` и echo-cancelled вариантов. При controller event по `goose_L1`/`handset_L2` последующие шаги смогут найти logical device в store по hardware id/module.
- **Проверка:** `npm run ts:check`, точечный ESLint, ручной моковый прогон через временный локальный запуск без сохранения bootstrap-файлов.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Реализовать новый devices-sessions-store-new

- **Описание:** Реализовать новый runtime-store для связи сессий с logical devices из `devices-store-new`. Не копировать старую модель механически: сохранить суть сценариев и упростить код под новую модель. Store должен отвечать за binding/unbinding сессий, выбор ключа устройства для runtime (`module` / `controllerDeviceId` / `id`), переключение audio input через `getUserMedia` + `replaceTrack`, cleanup stream, hold других сессий на том же устройстве, Handset runtime state, Handset mute state, Goose PTT state, проверку глобального состояния микрофона Goose и обновление активных сессий при изменении logical device. Store не должен строить устройства, хранить controller modules, работать с IndexedDB или зависеть от legacy `MediaDevice`.
- **Файлы для изменений:**
  - `src/shared/composables/state/devices-sessions-store-new/use-devices-sessions-store.ts`
  - `src/shared/composables/state/devices-sessions-store-new/index.ts`
  - при необходимости локальные типы/helper-файлы внутри `devices-sessions-store-new`
- **Ожидаемый результат:** Новый sessions store работает только с новой моделью `LogicalMediaDevice`, покрывает ключевые сценарии binding/replaceTrack/handset/goose runtime state и готов к последующему переключению call-flow и controller handlers. Старые сторы остаются до следующих шагов, но новая реализация не проектируется под их внутренние типы.
- **Проверка:** `npm run ts:check`, точечный ESLint.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Подключить новые сторы в public API без подмены legacy-имен

- **Описание:** Подключить `devices-store-new` и `devices-sessions-store-new` через public API под явными временными именами `useDevicesStoreNew` и `useDevicesSessionsStoreNew`. Не подменять `useDevicesStore` и `useDevicesSessionsStore` до миграции потребителей, потому что текущие участки приложения еще ожидают legacy API (`mediaDevices`, `whenReady`, `pinnedDeviceId`, `setModuleInterfaces`, `updateMediaDevice`, `deleteMediaDevice`, `handsetActionHandler`). Новые участки миграции должны импортировать новые сторы из `@/shared/composables`, а финальная подмена старых имен будет сделана после шагов переключения потребителей.
- **Файлы для изменений:**
  - `src/shared/composables/index.ts`
  - при необходимости `src/shared/composables/state/devices-store-new/index.ts`
  - при необходимости `src/shared/composables/state/devices-sessions-store-new/index.ts`
- **Ожидаемый результат:** Новые сторы доступны из public API через явные имена `useDevicesStoreNew` и `useDevicesSessionsStoreNew`; старые публичные имена продолжают указывать на legacy-сторы до завершения миграции потребителей.
- **Проверка:** `npm run ts:check`, точечный ESLint.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Переключить инициализацию приложения и settings UI

- **Описание:** Проверить и довести инициализацию нового device store в старте приложения: browser endpoints должны загружаться через `init()`, controller modules — приходить из `command_exec.modules`, а итоговые logical devices должны пересобираться независимо от порядка этих событий. Минимально адаптировать media devices settings UI, чтобы он не ломался на новой модели. Не делать полноценный новый UI настройки устройств, если текущий сценарий больше не нужен.
- **Файлы для изменений:**
  - `src/app/App.vue` или текущая точка инициализации
  - `src/features/media-devices/**`
  - `src/entities/media-devices-settings/**`
  - `src/pages/main/ui/settings-page/**`
- **Ожидаемый результат:** Приложение загружает новые устройства; settings-страницы не падают и отображают применимую часть новой модели.
- **Проверка:** `npm run ts:check`, точечный ESLint, ручная проверка settings UI.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 6: Переключить call flows и pinned calls на новые сторы

- **Описание:** Адаптировать места, где сессии и вызовы выбирают/привязывают устройства: `useWebRTC`, session store/facade, incoming/initial/conference cards, pinned calls. Использовать только готовые logical devices, предпочтительно `ready*` computed-списки, чтобы `missing`/`partial` устройства не выбирались автоматически. Временно использовать первый доступный ready-Goose для pinned-групп, без переноса старого `pinnedDeviceId`/IndexedDB.
- **Файлы для изменений:**
  - `src/shared/jssip/useWebRTC.ts`
  - `src/entities/call-session/**`
  - `src/features/pinned-calls/**`
  - `src/widgets/call-manager/**`
  - `src/features/create-conference-from-tet-a-tet/**`
  - `src/features/start-conference-with-muted-participants/**`
- **Ожидаемый результат:** Основные call flows используют logical devices из новых стор, сохраняют binding, answer/call, replaceTrack и поведение завершенных линий.
- **Проверка:** `npm run ts:check`, точечный ESLint, ручная проверка входящего/исходящего вызова, конференции и завершенных линий.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 7: Переключить controller handlers на новые сторы

- **Описание:** Перевести `gooseEventHandler.ts`, `handsetEventHandler.ts`, `useController.ts`, `commandExecHandler.ts` и связанные места на новую модель. Убрать legacy-запись controller modules через `setModuleInterfaces` и старую controller-managed синхронизацию; оставить передачу `command_exec.modules` в новый device store только как lightweight input для построения logical devices. Сохранить подсветку, pickup/hangup, handset buttons, Goose/PTT через поиск logical device по `module` / `controllerDeviceId` / `id`.
- **Файлы для изменений:**
  - `src/shared/controller/useController.ts`
  - `src/shared/controller/commandExecHandler.ts`
  - `src/shared/controller/event-handlers/gooseEventHandler.ts`
  - `src/shared/controller/event-handlers/handsetEventHandler.ts`
  - связанные тесты при необходимости
- **Ожидаемый результат:** Аппаратные сценарии работают через новые сторы. Controller modules используются только как входные данные каталога logical devices, без IndexedDB, legacy profile sync и старой модели `MediaDevice`.
- **Проверка:** `npm run ts:check`, точечный ESLint, ручная проверка Goose/PTT, handset pickup/hangup, подсветки.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 8: Удалить legacy stores и переименовать новые в финальные имена

- **Описание:** После полного переключения удалить старые `devices-store` и `devices-sessions-store`. Новые сторы переименовать/экспортировать как основные `devices-store` и `devices-sessions-store`, убрать временный суффикс `-new`, привести public API к финальному виду.
- **Файлы для изменений:**
  - `src/shared/composables/state/devices-store/**`
  - `src/shared/composables/state/devices-sessions-store/**`
  - `src/shared/composables/state/devices-store-new/**`
  - `src/shared/composables/state/devices-sessions-store-new/**`
  - `src/shared/composables/index.ts`
- **Ожидаемый результат:** В проекте остается одна новая реализация device/session stores без legacy IndexedDB/controller-module синхронизации.
- **Проверка:** `npm run ts:check`, `npm run lint`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 9: Финальные тесты и регрессионная проверка

- **Описание:** Добавить или обновить необходимые тесты по итоговому контракту: построение logical devices из controller modules + browser endpoints, корректные `ready`/`partial`/`missing` статусы, binding сессий, PTT/handset state, pinned fallback на первый ready-Goose. Обновить старые моки стор в тестах после удаления legacy API.
- **Файлы для изменений:**
  - тесты рядом с измененными модулями
  - существующие тестовые моки `useDevicesStore` / `useDevicesSessionsStore`
- **Ожидаемый результат:** Ключевая логика новой модели покрыта тестами; старые тесты не завязаны на удаленный legacy API.
- **Проверка:** `npm run ts:check`, `npm run test`, при необходимости `npm run lint`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: зафиксировать итоговую модель устройств и разделение responsibilities после стабилизации.
