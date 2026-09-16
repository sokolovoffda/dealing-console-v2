# Кейс: qa-predemo — Footer audio / ПБВ на panel store

## Описание текущей части кейса

При исходящем вызове из ПБВ (panel store) mute Goose и playback на Main не работают: audio-path смотрит в legacy `usePinnedCallsStore`, а сессия живёт только в `usePinnedCallsPanelStore`.

## Контекст предыдущих частей

- `walkthrough_plan_1.md` — проходка QA
- Footer mic/volume уже завязаны на Goose + `preferredPinnedOutputId`, но через legacy pinned

## Связанные страницы проектной памяти

- Связанные страницы не найдены.

# План реализации: audio-path на panel store

## Шаг 1: Переключить mute/playback/volume на panel store

- **Описание:** Добавить в panel store `globalVolumeMultiplier`, `getSlotBySessionId`, `applyGooseMicToPanelSessions`; переключить facade / goose / eventListener / footer volume / ringtone / useWebRTC. Legacy store файлы не удалять.
- **Файлы для изменений:**
  - `src/entities/pinned-calls/model/use-pinned-calls-panel-store.ts`
  - `src/entities/call-session/lib/useSessionFacade.ts`
  - `src/entities/call-session/lib/useSessionEventListener.ts`
  - `src/shared/controller/event-handlers/gooseEventHandler.ts`
  - `src/shared/jssip/useWebRTC.ts`
  - `src/features/app-audio-controls/ui/GlobalAppVolumeControl.vue`
  - `src/features/global-ringtone/model/useGlobalRingtoneSettingsSync.ts`
  - `src/features/app-audio-controls/test/GlobalAppVolumeControl.test.ts`
- **Ожидаемый результат:** Исходящий из ПБВ: звук на Main, goose mute реально глушит WebRTC, LED/UI sync без изменений.
- **Проверка:** unit-тесты volume; ручной сценарий A→B из ПБВ
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
