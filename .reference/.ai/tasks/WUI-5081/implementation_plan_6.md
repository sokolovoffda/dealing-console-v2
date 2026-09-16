# Кейс: WUI-5081 - карточка вызова 3.0

## Описание текущей части кейса

Функциональная часть новой карточки вызова закрыта до уровня ручной проверки: empty state, состояния сессий, очередь текущей трубки, footer sync, DTMF, физический ввод, перенос между трубками, hold и blind transfer. Следующая часть не добавляет новую доменную функциональность, а приводит `call-card` store в более поддерживаемое состояние перед дальнейшим развитием карточки.

Цель refactor/review: уменьшить ширину публичного API store, разделить ответственность файла и убрать повторяющуюся техническую логику без изменения поведения UI и сценариев звонков.

## Контекст предыдущих частей

- `implementation_plan_3.md` - функционал пустой карточки: dialpad, история, вызов из ПБВ, физический ввод, per-handset mute/volume.
- `implementation_plan_4.md` - состояния сессии, очередь текущей трубки, virtual empty-slot, footer sync, одна active-сессия на трубку.
- `implementation_plan_5.md` - blind transfer из карточки вызова.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/handsets.md`
- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/domain/statuses.md`
- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/backend-integration/sip-webrtc.md`
- `.ai/knowledge/wiki/frontend/components.md`

# План реализации: review/refactor call-card store

## Шаг 1: Аудит публичного API store и карта usage

- **Описание:** Разобрать текущий `use-call-card-store.ts` по категориям: доменные actions, публичные computed для UI, внутренние selectors/helpers, presentation/view-model, text editing, side effects. Проверить все usages store в `features/call-card`, `widgets/app-footer`, `widgets/quick-call-panel`, controller handlers и тестах. Зафиксировать, какие методы точно остаются публичными, какие можно спрятать сразу, какие требуют transitional-wrapper.
- **Файлы для изменений:**
  - `.ai/tasks/WUI-5081/implementation_plan_6.md` при необходимости уточнить шаги после аудита
  - кодовые файлы не менять на этом шаге, если аудит покажет риск неожиданных зависимостей
- **Ожидаемый результат:** Есть короткая карта API: что является доменом, что является внутренней реализацией, что является presentation и что дублируется.
- **Проверка:** Ручная проверка по `rg`: нет неучтенных внешних usages критичных методов.
- **Коммит после шага:** Да, если будут внесены правки в план/документацию; иначе нет
- **Нужно ли обновить project wiki:** Нет

### Результат аудита шага 1

Источник аудита: `src/features/call-card/model/use-call-card-store.ts`, usages через `rg` по `features/call-card`, `widgets/app-footer`, `widgets/quick-call-panel`, `shared/controller`, тестовым mocks.

#### Доменные actions, которые оправданно остаются отдельными

- `open` - открыть карточку для текущей доступной трубки.
- `hide` - скрыть карточку; комментарий нужно уточнить, потому что сейчас при скрытии сбрасывается transfer mode.
- `openHandset` - открыть карточку конкретной трубки.
- `openHandsetByDevice` - открыть карточку трубки по физическому device; используется controller handler.
- `openSession` - открыть конкретную сессию на конкретной трубке.
- `openSessionInPreferredHandset` - открыть существующую сессию из ПБВ.
- `callSelectedDialNumber` - звонок из dialpad выбранной трубки.
- `callNumberFromSelectedHandset` - звонок из ПБВ через выбранную/доступную трубку.
- `callDialNumberFromHandsetDevice` - звонок с физической трубки по ее dial buffer.
- `insertDialTextFromHandsetDevice` - физический ввод цифр на трубке.
- `answerSelectedSession` - ответ на выбранный входящий.
- `toggleSelectedSessionHold` - hold/unhold выбранной сессии.
- `transferSelectedSessionToOtherHandset` - перенос выбранной сессии на другую трубку.
- `toggleSelectedTransferMode` - включить/выключить transfer mode выбранной source-сессии.
- `executeSelectedBlindTransfer` - выполнить blind transfer выбранной source-сессии.
- `setSelectedPanelMode` - UI-сценарий переключения правой панели карточки.
- `setSelectedHandsetSessionId` - UI-сценарий выбора item очереди.
- `selectPreviousSelectedQueuePosition` / `selectNextSelectedQueuePosition` - UI-сценарий стрелок очереди.

#### UI-facing computed/state, которые сейчас реально используются компонентами

- `isOpen` - dropdown host и footer.
- `hasAvailableHandset` - ПБВ.
- `handsetSlots` - footer список трубок.
- `footerHandsetViewByHandsetId` - footer view-model.
- `selectedHandsetId`, `selectedHandsetSlot` - session/empty/footer UI.
- `availableHandsetSlots` - проверка доступности переноса на другую трубку.
- `selectedSession`, `selectedSessionView` - session/dialpad/queue UI.
- `selectedHandsetQueue` - queue panel.
- `selectedPanelMode` - layout, empty/session controls.
- `selectedDialBuffer`, `selectedDialContactName` - empty/dialpad UI.
- `selectedTransferTargetNumber`, `selectedTransferState`, `isSelectedTransferModeActive` - transfer UI.
- `selectedVolume`, `isSelectedMuted` - audio controls.
- `selectedQueuePosition`, `selectedQueueTotal`, `canSelectPreviousQueuePosition`, `canSelectNextQueuePosition` - queue navigator.
- `hasSelectedVirtualQueuePosition` - empty state при выбранной virtual queue position.

#### Presentation/view-model, которую стоит вынести из store

- `getFooterIndicatorPriority`
- `getFooterIndicatorSession`
- `resolveFooterIconName`
- `createFreeFooterHandsetView`
- `getFooterSessionForHandset`
- `getFooterHandsetView`
- `footerHandsetViewByHandsetId`

Эта логика готовит footer presentation и не является core state store. Ее нужно вынести в `call-card-footer-view.ts` на шаге 5.

#### Text editing, который стоит вынести в pure helper

- `clampDialPosition`
- `setDialSelection`
- `insertDialText`
- `backspaceDialBuffer`
- `clearDialBuffer`
- `setTransferTargetSelection`
- `insertTransferTargetText`
- `clearTransferTarget`

Логика `dialBuffer` и `transferState.targetNumber` почти одинаковая: value, selectionStart, selectionEnd, insert, backspace, clear. Ее нужно вынести в `call-card-text-editor.ts` на шаге 2.

#### Повтор исходящего вызова

Повторяется последовательность в:

- `callSelectedDialNumber`
- `callNumberFromSelectedHandset`
- `callDialNumberFromHandsetDevice`

Общая часть: взять `knownSessionIds`, вызвать `startCallCardOutgoingCall`, очистить dial buffer, выставить pending outgoing session selection, открыть queue. Это нужно объединить на шаге 3.

#### Кандидаты на скрытие из public API

Эти методы/computed сейчас не найдены в usages за пределами store и выглядят как внутренние детали:

- `activeSessionByHandsetId`
- `appendDialDigit`
- `appendSelectedDialDigit`
- `backspaceDialBuffer`
- `backspaceSelectedDialBuffer`
- `cancelAllTransferModes`
- `cancelSelectedTransferMode`
- `cancelTransferMode`
- `clearDialBuffer`
- `clearQueueVirtualPosition`
- `clearRoutedSessionHandsetId`
- `clearSelectedDialBuffer`
- `clearSelectedTransferTarget`
- `clearTransferTarget`
- `getActiveSessionByHandsetId`
- `getHandsetSlotById`
- `getQueuePositionByHandsetId`
- `getSelectedSessionByHandsetId`
- `getSessionsByHandsetId`
- `getTransferSourceSessionByHandsetId`
- `isTransferModeActiveByHandsetId`
- `handsetState`
- `insertDialText`
- `insertTransferTargetText`
- `primarySessionForFooter`
- `primarySessionForFooterByHandsetId`
- `requestedHandsetId`
- `routeIncomingSessions`
- `routedSessionHandsetIds`
- `selectHandset`
- `selectNextQueuePosition`
- `selectPreviousQueuePosition`
- `selectQueuePosition`
- `selectSelectedQueuePosition`
- `selectedHandsetState`
- `selectedQueueVirtualPosition`
- `selectedSessionByHandsetId`
- `selectedTransferSourceSession`
- `selectedTransferTargetName`
- `sessionQueueByHandsetId`
- `setDialBuffer`
- `setDialContactName`
- `setDialSelection`
- `setDialTarget`
- `setHandsetMuted`
- `setHandsetVolume`
- `setPanelMode`
- `setRoutedSessionHandsetId`
- `setSelectedSessionId`
- `setTransferTarget`
- `setTransferTargetSelection`
- `setTransferTargetSession`
- `startSelectedTransferMode`
- `startTransferMode`

Перед удалением из return нужно повторно проверить тестовые mocks и возможные lazy/usages, но по текущему `rg` эти сущности не требуются внешнему UI.

#### Public API, который лучше оставить на первом проходе

- `setSelectedDialBuffer`, `setSelectedDialContactName`, `setSelectedDialSelection`, `insertSelectedDialText`, `setSelectedDialTarget` - используются dialpad/history UI; можно унифицировать позже через optional `handsetId`, но менять нужно осторожно.
- `setSelectedTransferTarget`, `setSelectedTransferTargetSelection`, `insertSelectedTransferTargetText`, `setSelectedTransferTargetSession` - используются transfer UI; после text helper можно упростить, но пока оставить.
- `setSelectedHandsetMuted`, `setSelectedHandsetVolume` - используются audio controls; низкоуровневые `setHandsetMuted`/`setHandsetVolume` можно сделать внутренними.

#### Риски для следующих шагов

- Тестовые mocks могут ожидать старый широкий return, даже если production UI уже не использует методы. При сужении API нужно обновить mocks точечно.
- `handsetState` нельзя отдавать наружу как mutable state; если где-то понадобится доступ к состоянию, лучше добавить computed/view-model.
- Удаление routing setters из public API безопасно только если не появится внешний сценарий ручной привязки сессии к трубке.
- Переименование `isSelectedQueueVirtualEmpty` в `hasSelectedVirtualQueuePosition` затронет empty state и возможно тестовые snapshots/mocks.

## Шаг 2: Вынести text editing в pure helper

- **Описание:** Вынести повторяющуюся логику редактирования текста из store в `call-card-text-editor.ts`: clamp позиции, установка selection, insert, backspace, clear. Helper должен быть чистым: без Pinia, Vue, session API и side effects. Store должен только брать состояние нужной трубки и применять результат helper к `dialBuffer` или `transferState.targetNumber`.
- **Файлы для изменений:**
  - `src/features/call-card/model/call-card-text-editor.ts`
  - `src/features/call-card/model/use-call-card-store.ts`
  - тесты helper добавить только после отдельного согласования тестового шага
- **Ожидаемый результат:** Логика `dial buffer` и `transfer target` использует один общий механизм редактирования текста; поведение курсора, выделения, backspace и clear не меняется.
- **Проверка:** Ручная проверка: ввод цифр в empty dialpad, вставка по курсору, выделение и замена, backspace, ввод target в transfer mode.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

### Результат шага 6

- `isSelectedQueueVirtualEmpty` переименован в `hasSelectedVirtualQueuePosition`, потому что computed означает выбранную virtual queue position при непустой очереди, а не пустую очередь.
- Комментарий `hide` уточнен: метод скрывает карточку и сбрасывает временный transfer mode.
- Дополнительного стилистического refactor не делалось, чтобы не смешивать cleanup с изменением поведения.

## Шаг 3: Объединить сценарий старта исходящего вызова

- **Описание:** Найти повторение в `callSelectedDialNumber`, `callNumberFromSelectedHandset`, `callDialNumberFromHandsetDevice` и похожих методах. Вынести общий внутренний сценарий `startOutgoingCallFromHandset`: получить handset slot, сохранить known session ids, вызвать `startCallCardOutgoingCall`, очистить dial buffer, поставить pending outgoing selection, открыть queue. Публичные методы оставить тонкими сценарными wrappers. Отдельно проверить `payload.name` в `callNumberFromSelectedHandset`: либо применить его к dial target до старта вызова, если это нужно UI, либо убрать из внутренней логики, если фактически не используется.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - связанные consumers только если изменится сигнатура wrapper
- **Ожидаемый результат:** Общая логика исходящего вызова описана один раз; внешнее поведение вызова из empty dialpad, ПБВ и физической трубки не меняется.
- **Проверка:** Ручная проверка: вызов из empty dialpad, вызов из ПБВ, физический набор + вызов с трубки, выбор новой outgoing-сессии в очереди.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Сузить public API и убрать лишние selected-wrapper там, где безопасно

- **Описание:** Ввести локальный `resolveHandsetId(handsetId?)`, где это действительно упрощает API. Перевести простые пары `setSomething(handsetId, value)` / `setSelectedSomething(value)` на один метод с optional `handsetId`, если usages позволяют сделать это без ухудшения читаемости. Не объединять важные доменные сценарии ради сокращения количества функций. Убрать из return внутренние helpers/selectors, которые не используются компонентами. Особое внимание: `handsetState`, `get...ByHandsetId`, `set...ByHandsetId`, routing setters, `cancelAllTransferModes`, transfer target helpers.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/ui/**`
  - `src/widgets/app-footer/**`
  - `src/widgets/quick-call-panel/**`
  - связанные тестовые mocks, если они импортируют store API
- **Ожидаемый результат:** Store наружу отдает только API, реально нужный UI и интеграциям. Внутреннее mutable состояние и низкоуровневые helpers не торчат наружу без причины.
- **Проверка:** Ручная проверка usages через `rg`; ручная проверка основных сценариев карточки после правки.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Вынести footer view-model из store

- **Описание:** Вынести presentation-логику footer из store в `call-card-footer-view.ts`: выбор индикаторной сессии, priority, иконка, свободное состояние, view-model для handset button. Store должен собирать входные данные и получать готовую view-model, но не держать всю presentation-логику внутри себя.
- **Файлы для изменений:**
  - `src/features/call-card/model/call-card-footer-view.ts`
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/widgets/app-footer/ui/FooterHandsetControls.vue`
  - `src/widgets/app-footer/test/**` при необходимости обновить mocks
- **Ожидаемый результат:** Footer sync визуально работает как раньше, но логика подготовки footer model отделена от core store.
- **Проверка:** Ручная проверка footer: free, outgoing, incoming, active, hold, selected/not selected, карточка открыта/закрыта.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 6: Naming, комментарии и финальное уплотнение store

- **Описание:** Проверить названия computed/actions и комментарии после рефакторинга. Переименовать неоднозначные имена, например `isSelectedQueueVirtualEmpty`, если фактическая логика означает selected virtual queue position. Исправить комментарии, которые больше не соответствуют поведению, например скрытие карточки со сбросом transfer mode. Не делать стилистический refactor ради refactor.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/types.ts` при необходимости
  - consumers переименованных методов/computed
- **Ожидаемый результат:** Публичные имена и комментарии соответствуют фактическому поведению, store легче читать перед дальнейшей разработкой.
- **Проверка:** Ручная проверка usages через `rg`; ручная проверка основных сценариев карточки.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 7: Финальная проверка и тестовый план

- **Описание:** Составить короткий список ручных сценариев и предложить минимальные автотесты для pure helper `call-card-text-editor`. Запуск build/test и написание тестов выполнять только после отдельного согласия пользователя, потому что тесты в проекте являются завершающей частью кейса.
- **Файлы для изменений:**
  - тестовые файлы только после отдельного согласия
  - `.ai/tasks/WUI-5081/case.md` только если появятся новые уточнения
  - `.ai/knowledge/wiki/**` только если пользователь отдельно подтвердит wiki-этап
- **Ожидаемый результат:** Refactor завершен, поведение карточки не изменено, есть согласованный список проверок перед финальным merge/review.
- **Проверка:** Ручная проверка сценариев. `npm run build`, `npm run test`, `npm run lint` запускать только после отдельного согласия пользователя.
- **Коммит после шага:** Нет, если это только проверка; Да, если будут добавлены тесты или документация
- **Нужно ли обновить project wiki:** Нет, wiki обновить отдельным этапом после стабилизации refactor

### Результат шага 7

Запуск build/test/lint не выполнялся, потому что по правилам проекта это делается только после отдельного согласия пользователя.

#### Ручной чек-лист перед коммитом/refactor review

- Empty state:
  - открыть карточку левой/правой трубки из footer;
  - набрать номер через virtual dialpad;
  - выбрать номер из history и убедиться, что он только подставился;
  - стартовать исходящий вызов из empty state.
- Физическая трубка:
  - поднять левую/правую трубку и проверить открытие соответствующей карточки;
  - ввести цифры контроллером в empty state;
  - при active-сессии отправить DTMF.
- Сессии:
  - outgoing выбирается после старта из dialpad/ПБВ;
  - incoming можно принять и отклонить;
  - active можно завершить;
  - active можно поставить на hold и снять с hold.
- Очередь:
  - клик по item выбирает сессию без answer/hold/unhold;
  - стрелки меняют выбранную сессию;
  - virtual empty-slot показывает queue справа и позволяет набрать новый вызов.
- Footer:
  - selected handset окрашен по выбранной/индикаторной сессии;
  - not selected handset показывает статусной иконкой состояние своей очереди;
  - free handset остается нейтральным.
- Transfer:
  - включить/выключить transfer mode из active source;
  - включить transfer mode из hold source;
  - blind transfer на введенный номер;
  - blind transfer на target из очереди;
  - ошибка transfer оставляет режим открытым.

#### Минимальные будущие автотесты после согласования

- `call-card-text-editor.ts`:
  - `insertText` вставляет текст по курсору;
  - `insertText` заменяет выделенный диапазон;
  - `backspaceText` удаляет символ перед курсором;
  - `backspaceText` удаляет выделение;
  - `backspaceText` в позиции `0` не меняет value;
  - `clearText` очищает value и selection;
  - `setTextSelection` clamp-ит selection в границы value.
- `call-card-footer-view.ts`:
  - high incoming имеет больший приоритет, чем regular incoming/outgoing/active/hold;
  - free view возвращает корректные иконки для левой/правой трубки;
  - session view разворачивает иконки для правой трубки.

## Доменные actions, которые нельзя механически схлопывать

- `open`
- `openHandset`
- `openSession`
- `openSessionInPreferredHandset`
- `answerSelectedSession`
- `toggleSelectedSessionHold`
- `transferSelectedSessionToOtherHandset`
- `toggleSelectedTransferMode`
- `executeSelectedBlindTransfer`
- `setPanelMode` / переключение правой панели
- routing входящих сессий по трубкам
- enforcement правила одной active-сессии на трубку

## Вне рамок этого плана

- Новая функциональность карточки вызова.
- Изменение UI-макетов.
- Полноценный attended transfer.
- Конференции.
- Переписывание legacy `call-manager` / `call-queue`.
- Большой rewrite store на несколько composable без доказанной пользы.
- Автотесты и запуск build/test без отдельного согласия пользователя.
