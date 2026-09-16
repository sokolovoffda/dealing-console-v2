# Кейс: WUI-5081 - Карточка вызова 3.0

## Описание текущей части кейса

Актуализированная первая часть WUI-5081 после подготовки footer в WUI-5053 и появления новой device-модели из WUI-5084.

Нужно реализовать базовую карточку вызова для двух телефонных трубок: связь с кнопками footer, открытие через top dropdown, выбранная runtime-трубка, пустое состояние с набором номера/историей, состояние с вызовом, очередь текущей трубки, DTMF, базовые действия с сессией, перенос вызова между трубками и интеграция клика ПБВ. Backend не маршрутизирует входящие по трубкам, поэтому на первом этапе frontend кладет новые входящие в очередь выбранной доступной трубки.

Transfer через `phoneTransferM` входит в общий кейс, но выносится в отдельную следующую часть. В этой части не реализуются blind/attended transfer, merge консультации и transfer-to-favorites.

## Контекст предыдущих частей

- `implementation_plan_1.md` - устаревший план первой итерации на старом `devices-store`, созданный до мержа WUI-5084. Не перезаписывается, остается историческим документом.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/handsets.md`
- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/domain/statuses.md`
- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/backend-integration/sip-webrtc.md`
- `.ai/knowledge/wiki/frontend/components.md`

# План реализации: базовая карточка вызова трубок

## Архитектурная разбивка

- Основной новый FSD-слайс: `src/features/call-card`.
- Модель: Pinia/composable state карточки, runtime selection трубки, routing входящих, UI mode, dial buffer, per-handset mute/volume, selectors для footer/card/queue.
- UI: окно карточки и его внутренние части: основная информация, action buttons, dialpad/history/queue panels, handset controls adapter.
- Интеграция:
  - `src/widgets/app-footer` - использует feature public API для footer-кнопок и dropdown-host.
  - `src/widgets/quick-call-panel` - использует feature public API для открытия существующей сессии или запуска нового вызова.
  - `src/widgets/call-manager` / `src/widgets/call-queue` - полностью поглощаются новой карточкой. Для обычных трубочных вызовов не остается отдельной legacy state machine и отдельной legacy очереди.
  - `src/shared/controller/event-handlers/handsetEventHandler.ts` - аккуратная адаптация существующего legacy-обработчика физической трубки к новой модели карточки. Сейчас этот файл уже импортирует `widgets/call-manager`; в рамках шага нужно не расширять нарушение, а заменить старую зависимость на новый минимальный public API карточки.

## Шаг 1: Модель карточки и selectors трубок

- **Описание:** Создать `features/call-card` с публичным API. Модель должна хранить:
  - `isOpen`;
  - выбранную трубку `left/right` runtime-only;
  - выбранную сессию по трубкам;
  - UI mode правой панели: `dialpad`, `history`, `queue`, `none`;
  - dial buffer отдельно для левой и правой трубки;
  - mute/volume отдельно для левой и правой трубки;
  - локальное назначение ringing-сессий на трубку, потому что backend этого не знает.
  
  Selectors должны строить два handset slot по `useDevicesStore().handsetDevices`, где left/right берутся по порядку, а доступность определяется `status === 'ready'`. Если выбранная трубка недоступна, но есть другая доступная, модель выбирает доступную. Если доступных нет, действия карточки и footer disabled.
- **Файлы для изменений:**
  - `src/features/call-card/model/types.ts`
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/call-card-session-selectors.ts`
  - `src/features/call-card/index.ts`
- **Ожидаемый результат:** Есть единая модель карточки, которая умеет определить доступные трубки, выбранную трубку, текущую сессию трубки и disabled-состояние без изменения существующего UI.
- **Проверка:** `npm run ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Routing входящих и очередь текущей трубки

- **Описание:** Добавить в модель карточки routing watcher для `useSessionStore().queueSessions`: новые неприкрепленные ringing-сессии, не являющиеся завешенными, получают локальное назначение на выбранную доступную трубку. Не вызывать `bindSessionToDevice` для еще не отвеченного входящего только ради UI-очереди, чтобы не трогать media device до `answer`.
  
  Добавить selectors:
  - `getSessionsByHandsetId(handsetId)` - сессии текущей трубки по `currentDevice` или локальному routing assignment;
  - `selectedHandsetQueue` - одна лента без группировки по статусам;
  - `selectedSession` - выбранная сессия или дефолтная сессия трубки;
  - `primarySessionForFooter` - сессия, определяющая визуал footer.
  
  Дефолт выбора: если есть active/progress - показать его; если active нет и есть incoming - показать incoming; иначе показать hold/первую доступную в ленте. После сброса active показывать следующую сессию без автоматического unhold.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/call-card-session-selectors.ts`
  - `src/features/call-card/model/call-card-session-routing.ts`
- **Ожидаемый результат:** Входящие вызовы попадают в очередь выбранной доступной трубки на frontend-уровне, а очередь карточки больше не трактуется как глобальная очередь.
- **Проверка:** `npm run ts:check`; ручная проверка через mocked/реальную incoming-сессию: incoming появляется у выбранной трубки, невыбранная трубка не становится выбранной.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Footer-кнопки трубок и dropdown-host

- **Описание:** Перевести текущие `FooterHandsetControls.vue` / `FooterHandsetButton.vue` со статических данных на selectors новой модели. Кнопки:
  - показывают left/right;
  - отражают `Свободна`, имя/номер и статус primary session;
  - disabled, если slot отсутствует или device не `ready`;
  - клик по доступной невыбранной трубке выбирает трубку и открывает карточку;
  - клик по уже выбранной трубке ничего не делает.
  
  Обернуть центральный блок footer в `wui-dropdown v-model top` без `close-on-click-outside`; содержимое dropdown - будущая карточка. Карточка должна быть центрирована относительно блока трубок, а не относительно конкретной кнопки.
- **Файлы для изменений:**
  - `src/widgets/app-footer/ui/FooterHandsetControls.vue`
  - `src/widgets/app-footer/ui/FooterHandsetButton.vue`
  - `src/widgets/app-footer/ui/AppFooter.vue`
  - `src/features/call-card/ui/CallCardDropdownHost.vue`
  - `src/features/call-card/index.ts`
- **Ожидаемый результат:** Footer управляет selected handset и открытием карточки через controlled dropdown. Click outside и `Esc` не закрывают карточку; скрытие только по крестику карточки.
- **Проверка:** `npm run ts:check`; ручная проверка двух/одной/нулевой доступной трубки.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Базовое окно карточки и пустое состояние

- **Описание:** Реализовать основное окно карточки без SIP transfer:
  - карточка живет над footer, ровно по центру;
  - крестик скрывает окно без сброса обычного состояния;
  - пустая трубка показывает название трубки, статус `Свободна`, volume/mute controls, dialpad/history toggle;
  - по умолчанию в пустой карточке открыт dialpad;
  - dial buffer хранится отдельно по трубкам;
  - история показывает последние 10 вызовов из `useCallHistoryStore`, клик подставляет номер и имя, но не звонит;
  - call button запускает вызов только при наличии доступной трубки и номера.
  
  UI controls делать через `wui-btn`; для клавиатуры использовать `WuiNumPad` или локальный тонкий wrapper над ним, если потребуется поле номера/дополнительные кнопки.
- **Файлы для изменений:**
  - `src/features/call-card/ui/CallCardWindow.vue`
  - `src/features/call-card/ui/CallCardEmptyState.vue`
  - `src/features/call-card/ui/CallCardDialpadPanel.vue`
  - `src/features/call-card/ui/CallCardHistoryPanel.vue`
  - `src/features/call-card/ui/CallCardAudioControls.vue`
  - `src/features/call-card/model/call-card-history.ts`
  - `src/features/call-card/index.ts`
- **Ожидаемый результат:** Карточка открывается из footer, показывает пустое состояние выбранной трубки, умеет набирать номер с UI и подставлять историю без старого `InitialCard`.
- **Проверка:** `npm run ts:check`; ручная проверка empty left/right, сохранения dial buffer после закрытия/открытия, истории.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Интеграция исходящего вызова и ПБВ

- **Описание:** Добавить действия запуска вызова из карточки и ПБВ:
  - вызов из dialpad идет с выбранной доступной трубки; если выбранная недоступна, но есть другая доступная, использовать доступную;
  - перед новым исходящим активный вызов на этой трубке уходит на hold и не возвращается active автоматически при ошибке/сбросе нового вызова;
  - клик по ПБВ в обычном режиме сначала ищет нашу существующую сессию с абонентом; если сессия есть, открыть карточку этой сессии;
  - если сессии нет, сразу стартовать исходящий вызов на выбранной/доступной трубке и открыть карточку;
  - если абонент в завешенных, специальный сценарий пока не обрабатывать.
  
  Существующее поведение ПБВ `session.terminate()` по клику на контакт с self-сессией должно быть заменено на открытие карточки.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/call-card-actions.ts`
  - `src/widgets/quick-call-panel/ui/QuickCallContactCard.vue`
  - `src/widgets/quick-call-panel/model/use-contact-card-status/use-contact-card-status.ts` - только если нужен selector существующей self-сессии без дублирования
- **Ожидаемый результат:** ПБВ открывает новую карточку и больше не завершает существующую сессию по клику. Новый исходящий вызов привязывается к выбранной/доступной трубке.
- **Проверка:** `npm run ts:check`; ручная проверка ПБВ: новый вызов, существующая outgoing/active/hold/ringing self-сессия, недоступная выбранная трубка с доступной второй трубкой.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 6: Состояние карточки с вызовом и основные действия

- **Описание:** Реализовать состояние карточки для выбранной сессии:
  - имя, номер, таймер;
  - визуальные статусы: outgoing/incoming нормальный, incoming high placeholder под будущий priority, active green, hold orange/yellow, free neutral;
  - кнопки: answer/call, hangup, hold/unhold, move to other handset, queue toggle, dialpad/DTMF toggle;
  - hangup завершает только выбранную сессию;
  - unhold выбранной held-сессии холдит другой active на этой же трубке;
  - move to other handset переносит выбранную сессию на другую доступную трубку, active на целевой трубке уходит на hold, перенесенная сессия сохраняет свое состояние с исходной трубки: active остается active, hold остается hold.
  
  Если текущая сессия завершилась, карточка показывает следующую сессию этой трубки или пустое состояние, без автоматического unhold.
- **Файлы для изменений:**
  - `src/features/call-card/ui/CallCardActiveState.vue`
  - `src/features/call-card/ui/CallCardSessionInfo.vue`
  - `src/features/call-card/ui/CallCardActionBar.vue`
  - `src/features/call-card/model/call-card-tone.ts`
  - `src/features/call-card/model/call-card-actions.ts`
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/shared/composables/state/devices-sessions-store/use-devices-sessions-store.ts` - только если нужен небольшой public helper для sessions-on-device без изменения текущего контракта
- **Ожидаемый результат:** Карточка полноценно управляет выбранной сессией на трубке без старых карточек `ContactCallCard` / `IncomingCallCard`.
- **Проверка:** `npm run ts:check`; ручная SIP/WebRTC проверка answer, hangup, hold/unhold, перенос между трубками.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 7: Очередь одной трубки и переключение сессий

- **Описание:** Реализовать правую панель очереди внутри карточки:
  - одна лента сессий текущей трубки без группировки;
  - не показывать завешенные сессии;
  - клик по элементу очереди выбирает сессию и открывает ее в основной части карточки;
  - стрелки под информацией абонента листают сессии этой же трубки, но сами не выполняют transfer/answer/unhold;
  - если в режиме обычной карточки выбран ringing-вызов, action button отвечает на него на выбранной трубке.
  
  Старый `widgets/call-queue` должен быть заменен новой очередью карточки. Он не должен оставаться самостоятельной очередью и не должен переключать `CallManagerState`.
- **Файлы для изменений:**
  - `src/features/call-card/ui/CallCardQueuePanel.vue`
  - `src/features/call-card/ui/CallCardQueueItem.vue`
  - `src/features/call-card/model/call-card-queue.ts`
  - `src/widgets/call-queue/ui/CallQueue.vue`
  - `src/widgets/call-queue/ui/CallQueueItem.vue`
  - `src/pages/main/ui/workspace/workspace-widgets/WorkspaceCallQueueWidget.vue`
- **Ожидаемый результат:** В карточке есть очередь текущей трубки, а старый queue widget не возвращает пользователя в старую state machine.
- **Проверка:** `npm run ts:check`; ручная проверка нескольких сессий на одной трубке, входящего на выбранной трубке, выбора из очереди и стрелок.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 8: DTMF, физическая трубка, mute и volume

- **Описание:** Подключить UI и физические события трубки:
  - UI dialpad во время active-сессии отправляет DTMF;
  - если active-сессии нет, UI/физический набор редактирует dial buffer текущей трубки;
  - при поднятии физической трубки открыть карточку этой трубки;
  - при физическом наборе на свободной трубке открыть init/empty-карточку;
  - answer на физической трубке: если есть dial buffer - исходящий вызов; иначе выбранный incoming; иначе high priority placeholder; иначе первый incoming в очереди трубки;
  - decline/hangup на физической трубке завершает active выбранной сессии только при явном decline; постановка трубки на станцию переводит active-вызов этой трубки на hold, не завершает все сессии;
  - mute через UI и физическую кнопку меняет состояние этой трубки и применяется ко всем сессиям трубки через текущий `toggleMuteAllSessionsOnDevice`;
  - volume хранится отдельно по трубкам и применяется к текущей/последующим сессиям трубки через `setAudioPlayerVolume`.
  
  Transfer-ветки старого `useReferCallState` в физическом обработчике не развивать в этой части.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/call-card-actions.ts`
  - `src/features/call-card/ui/CallCardDialpadPanel.vue`
  - `src/features/call-card/ui/CallCardAudioControls.vue`
  - `src/shared/controller/useHandsetPickupHangupHandler.ts`
  - `src/shared/controller/event-handlers/handsetEventHandler.ts`
  - `src/shared/composables/state/devices-sessions-store/use-devices-sessions-store.ts` - при необходимости helper для handset mute state
- **Ожидаемый результат:** UI и физическая трубка используют одну модель карточки: открытие, набор, DTMF, answer, hold-on-station, mute/volume по трубке.
- **Проверка:** `npm run ts:check`; ручная проверка физической трубки: pickup, digits, answer, decline, station hangup, mute.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 9: Полное поглощение старых call-manager и call-queue

- **Описание:** Убрать старую реализацию управления обычными трубочными вызовами:
  - `CallManager.vue` должен быть заменен новой карточкой или удален из основного workspace flow;
  - `CallQueue.vue` должен быть заменен новой очередью карточки или удален из основного workspace flow;
  - `useSessionStore.addSession/removeSession` и `useRTCSessionFacade.answer/terminate` не должны самопроизвольно открывать старые contact-call/incoming-card для обычных трубочных вызовов;
  - `useCallManagerState` не должен оставаться source of truth для обычных трубочных вызовов;
  - старая отдельная очередь не должна оставаться вторым способом выбора/управления вызовом;
  - legacy-сценарии pinned/conference/contact view, которые пока завязаны на `useCallManagerState`, нужно явно развести с новой карточкой или вынести из основного сценария WUI-5081, не сохраняя совместимую реализацию обычных вызовов;
  - `features/refer-call` оставить только как legacy до отдельной transfer-части, если новая карточка его не использует.
  
  Если удаление файлов старых card-компонентов в этом шаге создает лишний риск для unrelated conference/pinned кода, файлы можно физически оставить, но они не должны подключаться к обычным трубочным вызовам и не должны быть параллельной совместимой реализацией.
- **Файлы для изменений:**
  - `src/widgets/call-manager/ui/CallManager.vue`
  - `src/widgets/call-manager/model/use-call-manager-state.ts`
  - `src/entities/call-session/model/useSessionStore.ts`
  - `src/entities/call-session/lib/useSessionFacade.ts`
  - `src/entities/call-session/lib/use-select-handler.ts` - только если он открывает старые карточки для сценариев, входящих в WUI-5081
  - `src/features/refer-call/model/useReferCallState.ts` - только для изоляции legacy, без реализации нового transfer
- **Ожидаемый результат:** Новая карточка является единственной реализацией управления обычными трубочными вызовами и единственным UI для их очереди. Старая логика не перетирает выбранную сессию новой карточки.
- **Проверка:** `npm run ts:check`; ручная проверка обычного исходящего/входящего, ПБВ и базовых pinned/conference smoke-сценариев, если доступны.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 10: Финальные тесты и проектная память

- **Описание:** После стабилизации базового контракта добавить/обновить тесты по согласованию:
  - модель выбора трубок и disabled-состояния;
  - routing входящих на выбранную доступную трубку;
  - selectors очереди трубки;
  - footer click behavior;
  - ПБВ: существующая self-сессия открывает карточку, новый контакт запускает вызов;
  - dialpad/history smoke;
  - old call-manager tests удалить/переписать только для сценариев, которые реально заменены.
  
  Обновить project wiki как долгоживущее знание о модели карточки вызова и трубок.
- **Файлы для изменений:**
  - `src/features/call-card/test/**`
  - `src/widgets/app-footer/test/FooterHandsetControls.test.ts`
  - `src/widgets/app-footer/test/FooterHandsetButton.test.ts`
  - `src/widgets/quick-call-panel/test/QuickCallContactCard.test.ts`
  - `src/widgets/call-manager/test/**` - по необходимости
  - `.ai/knowledge/wiki/domain/calls.md`
  - `.ai/knowledge/wiki/domain/handsets.md`
  - `.ai/knowledge/wiki/index.md`
  - `.ai/knowledge/wiki/log.md`
- **Ожидаемый результат:** Базовая карточка WUI-5081 покрыта тестами, устаревшие ожидания старого call-manager не конфликтуют, wiki содержит актуальную модель.
- **Проверка:** `npm run ts:check`, `npm run test`, при необходимости `npm run lint`; SIP/WebRTC и физические кнопки - ручная проверка.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `domain/calls.md`, `domain/handsets.md`, `index.md`, `log.md`

## Открытые вопросы для следующей части transfer

- Какие финальные иконки использовать для blind transfer, consultation call, cancel consultation и merge.
- Должен ли consultation target из очереди быть нашей существующей сессией с `unhold` или всегда новым SIP-вызовом, если target номер совпадает с существующей сессией на другой трубке.
- Что показывать в карточке source-вызова во время активной consultation-сессии, если пользователь возвращается стрелками к source.
- Нужен ли отдельный visual state для ошибки transfer, или в первой transfer-итерации достаточно console/error notification.
