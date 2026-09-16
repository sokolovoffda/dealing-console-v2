# Устройства

## Назначение

Страница фиксирует итоговую модель media devices для пульта 3.0: пользователь работает не с отдельными browser input/output и не с controller modules напрямую, а с готовыми logical devices.

## Текущее понимание

В приложении есть два разных уровня устройств:

- Browser audio endpoints: сырые `MediaDeviceInfo` из `navigator.mediaDevices.enumerateDevices()`.
- Controller modules: аппаратные модули, которые приходят от контроллера в `command_exec.modules`.
- Logical media devices: готовые устройства приложения, построенные поверх controller modules и browser endpoints.

`devices-store` хранит каталог logical devices и raw audio endpoints. Controller modules используются как входные данные для построения logical devices, но не становятся отдельной пользовательской моделью.

`devices-sessions-store` хранит runtime-связь между SIP/WebRTC-сессиями и logical devices. Он не строит устройства, не хранит controller modules и не работает с IndexedDB.

## Основные сущности

- `AudioMediaDevice` - доступный audio input/output браузера после фильтрации `default` и `echo cancelled`.
- `ControllerMediaModule` - модуль контроллера с `id`, `position`, `type`, `audiolabel`, `sources`, `sinks`, `features`.
- `LogicalMediaDevice` - устройство, видимое приложению: Goose, Handset, **Main (hub)**, отдельный browser input/output или другое future/custom device.
- `LogicalMediaDevice.status`:
  - `ready` - все обязательные browser endpoint id найдены;
  - `partial` - найдена только часть обязательных endpoints;
  - `missing` - controller module есть, но нужные browser endpoints отсутствуют.

## Правила и ограничения

- Goose и Handset строятся из controller modules и сопоставляются с browser endpoints по `audiolabel` / `sources` / `sinks` и label endpoint.
- Goose требует audio input. Audio output для Goose не обязателен.
- Handset требует связанную пару audio input + audio output.
- **Main** строится из controller module `hub` (`id`/`name` hub, `audiolabel: Main`). В Settings-модели это **output-only** (`hasInput: false`, `hasOutput: true`), даже если hub.features сообщает `audio_in`. Browser endpoints с label `Main` (input и output) помечаются занятыми, чтобы не дублировать leftover browser-карточки. В списке devices Main **всегда последний**.
- Runtime playback завешенных / footer master volume использует browser output `Main` через `preferredPinnedOutputId` (и `globalVolumeMultiplier` в panel store); logical Main device должен резолвить тот же `outputId`.
- Громкость карточки Main в Media Devices **синхронизирована** с футером через `globalVolumeMultiplier` / `changeGlobalVolumeMultiplier` (как `GlobalAppVolumeControl`). Switch «Устройство подключено» на Main **не показывается**.
- Persist Media (WUI-5528): список карточек = локальная сборка `devices-store`; user overrides — `useMediaDeviceOverridesStore` (`GET/PATCH …/media-device-overrides/{hardwareSerial}`), merge по `logicalKey` (= `device.id`, Main = `hub`). Orphans (override без локального устройства) храним, не рисуем. Hydrate: при наличии `hub` в ответе volume накатывается на `globalVolumeMultiplier`.
- Overrides → runtime: `enabled`, `volume`, AEC-триада пишутся в `LogicalMediaDevice` (карта `userMediaOverrides` переживает rebuild). Сессии читают эти поля на следующем getUserMedia.
- **Soft-disable `enabled`:** `ready*` / `readyPreferredGoose` / `isUsableForMediaDevice` учитывают `enabled`; медиа-действия без usable device → toast `MediaDeviceUnavailableForCall`; выключение устройства с привязанными сессиями → запрет + toast. Lockdown (все OFF): звонки не дропаем, accept/dial/PTT → toast; просмотр карточки / ПБВ activity — можно.
- **AEC guard:** смена echo/noise/AGC (и non-Main volume) при bound sessions → блок + toast; без сессий — сразу в runtime + dirty persist.
- **Main volume persist — один путь:** любое изменение `globalVolumeMultiplier` (Settings или footer) → debounced PATCH только `hub.volume`; на leave Settings — `flushPendingMainVolumePersist()` затем PATCH остальных dirty с `excludeMainVolume`. Leave-пул: main-settings + goose + overrides.
- `hardwareSerial` для overrides берётся из `useTurretAdminWs().hardwareSerial` (controller identity).
- Browser endpoints, которые не связались с controller module, остаются отдельными ready logical devices.
- Пользователь должен видеть готовые logical devices, а не отдельно выбирать module, input и output.
- Устройства со статусом `missing` или `partial` можно показывать в диагностике/settings, но они не должны автоматически выбираться для call flows.
- Для pinned calls runtime goose — `readyPreferredGoose` (настройка Media Devices: `preferredGooseId`, fallback на первый ready goose).
- Смена `preferredGooseId` во время активных завешенных: `rebindPanelSessionsToPreferredGoose()` перепривязывает panel-сессии со старого goose на новый (сессии на handset не трогаем).
- Состояние Goose microphone в `devices-sessions-store` является глобальным переключателем слышимости для pinned calls, но line-level `micState` у завешенной линии сохраняется отдельно (кроме PTT `activePinned`, где transmission идёт только через speak — см. `speakers-ptt.md`).
- `gooseMode` / `goosePttScope` применяются ко всем goose-устройствам одинаково; `preferredGooseId` выбирает, какой goose использовать для pinned/footer.
- IndexedDB и legacy profile sync для устройств в новой модели не используются.

## Ответственность stores

`devices-store`:

- загружает browser audio endpoints;
- принимает controller modules;
- строит `devices`, `gooseDevices`, `handsetDevices`, `queueDevices`;
- строит ready-списки: `readyDevices`, `readyGooseDevices`, `readyHandsetDevices`, `readyQueueDevices`;
- дает поиск logical device по `id` и `module`.

`devices-sessions-store`:

- bind/unbind session к logical device;
- выбирает runtime key устройства через `module`, `controllerDeviceId` или `id`;
- меняет audio input в WebRTC session через `getUserMedia` + `replaceTrack`;
- хранит handset state, handset mute state и Goose PTT state;
- применяет глобальное состояние Goose mic к pinned calls.

Controller layer:

- передает `command_exec.modules` в `devices-store.setControllerModules`;
- резолвит hardware events по `module` / `controllerDeviceId` / `id`;
- не восстанавливает legacy controller-managed profile sync.

## Пользовательские сценарии

- В настройках пользователь видит список готовых logical devices и их состояние.
- При привязке вызова к устройству приложение использует только `ready` logical devices.
- Для завешенных вызовов приложение использует `readyPreferredGoose` (выбор на Media Devices).
- Если controller module есть, но соответствующий browser endpoint отсутствует, устройство остается в списке как `missing` и не выбирается автоматически.

## Edge cases

- `enumerateDevices()` может прийти раньше или позже `command_exec.modules`; `devices-store` пересобирает logical devices при изменении любого источника.
- Если устройство меняет endpoint id при `devicechange`, sessions store обновляет активные сессии на том же logical device.
- Если endpoint отсутствует на dev PC без реального пульта, controller device может стать `missing`; это ожидаемое состояние.

## Связанные страницы

- `../domain/speakers-ptt.md`
- `../frontend/stores.md`
- `../backend-integration/controller-ws.md`
- `../backend-integration/goose-settings-api.md`
- `../backend-integration/media-device-overrides-api.md`
- `pinned-calls.md`

## Источники

- `src/shared/composables/state/devices-store/use-devices-store.ts`
- `src/shared/composables/state/devices-store/types.ts`
- `src/shared/composables/state/devices-sessions-store/use-devices-sessions-store.ts`
- `src/entities/call-session/model/use-pinned-calls-store.ts`
- `src/shared/controller/commandExecHandler.ts`
- Уточнения пользователя по WUI-5084 от 2026-06-24
- `src/entities/media-devices-settings/model/use-media-device-overrides-store.ts`
- `src/shared/turret-admin-ws/useTurretAdminWs.ts` (`hardwareSerial`)
- `src/shared/composables/state/devices-store/media-device-usability.ts`
- `src/entities/media-devices-settings/lib/apply-override-to-logical-device.ts`
- Уточнение пользователя от 2026-09-15 (Main volume в overrides; merge по logicalKey; soft-disable / lockdown / AEC guard)

## Открытые вопросы

- Какой backend-контракт будет хранить выбор Goose для конкретной группы завешенных.
- Диалог переноса вызова с трубки при OFF vs блок+toast — см. `../product/open-questions.md` (WUI-5528 follow-up).
