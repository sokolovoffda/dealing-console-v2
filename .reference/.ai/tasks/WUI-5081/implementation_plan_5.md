# Кейс: WUI-5081 - карточка вызова 3.0

## Описание текущей части кейса

Предыдущая часть закрыла основные состояния карточки вызова, очередь текущей трубки, навигацию по очереди, синхронизацию footer и ограничение одной active-сессии на трубку. Следующая часть добавляет только слепой перевод из новой карточки вызова. Полноценный перевод с сопровождением, merge-консультации и конференции в эту часть не входят.

Слепой перевод доступен из active- или hold-сессии. При включении режима перевода кнопкой `phoneTransferM` фиксируется source-сессия. Далее пользователь выбирает target либо набором номера в dialpad, либо кликом по item очереди текущей трубки. В режиме перевода dialpad вводит номер цели, а не отправляет DTMF. Target может быть просто номером без нашей локальной сессии; отдельная сессия с target в этом сценарии не создается. На успешном переводе source уходит из карточки; на ошибке ошибка логируется в консоль, режим перевода и введенный target остаются открытыми.

## Контекст предыдущих частей

- `implementation_plan_3.md` - функционал пустой карточки: dialpad, история, вызов из ПБВ, физический ввод, per-handset mute/volume.
- `implementation_plan_4.md` - состояния сессии, очередь текущей трубки, virtual empty-slot, footer sync, одна active-сессия на трубку.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/handsets.md`
- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/domain/statuses.md`
- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/backend-integration/sip-webrtc.md`
- `.ai/knowledge/wiki/frontend/components.md`

# План реализации: слепой перевод из карточки вызова

## Шаг 1: Модель режима перевода в call-card store

- **Описание:** Добавить runtime-состояние transfer mode в `use-call-card-store`: source `sessionId`, target number, optional target `sessionId`, признак active transfer mode для выбранной трубки. Source фиксируется при клике `phoneTransferM`, если выбранная сессия active или hold. Повторный клик `phoneTransferM` отменяет transfer mode. Закрытие карточки крестиком и завершение/потеря source-сессии сбрасывают transfer mode. При включении режима открыть queue текущей трубки, чтобы пользователь мог выбрать target из очереди; dialpad остается доступен через существующую кнопку.
- **Файлы для изменений:**
  - `src/features/call-card/model/types.ts`
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/call-card-session-view.ts`
  - `src/features/call-card/ui/CallCardSessionState.vue`
- **Ожидаемый результат:** Карточка умеет входить и выходить из transfer mode, хранит source отдельно от выбранного target и не меняет source при клике по очереди в режиме перевода.
- **Проверка:** Ручная проверка: active call -> `phoneTransferM` включает режим и открывает queue; повторный клик выключает; закрытие карточки сбрасывает режим; завершение source сбрасывает режим.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Dialpad для ввода target и transfer-кнопки

- **Описание:** Обновить `CallCardDialpadPanel.vue`, чтобы в transfer mode dialpad работал с target buffer, а не с обычным dial buffer и не с DTMF. Справа от dialpad в transfer mode показать две кнопки: слепой перевод и перевод с сопровождением. Кнопка слепого перевода использует обычную иконку звонка и текущий цвет call-кнопки, активна только при наличии target number. Кнопка перевода с сопровождением использует `mergeM`, цвет иконки `comp/btn/brandcon/num/icon/def`, фон `btn-brandcon-num-bg`, но всегда disabled и без обработчика.
- **Файлы для изменений:**
  - `src/features/call-card/ui/CallCardDialpadPanel.vue`
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/types.ts`
  - `src/shared/ui/my-btn/**` только если текущий `MyBtn` не позволит аккуратно прокинуть нужный visual state
- **Ожидаемый результат:** В active-сессии без transfer mode dialpad продолжает работать как DTMF. В transfer mode ввод цифр меняет target number, кнопка blind transfer активируется после ввода номера, consultation-кнопка видна, но disabled.
- **Проверка:** Ручная проверка: active -> dialpad без transfer отправляет DTMF; active -> transfer -> dialpad вводит target; consultation-кнопка не кликается.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Выбор target из очереди текущей трубки

- **Описание:** Изменить обработку клика по `CallCardQueuePanel`: в обычном режиме клик по item продолжает выбирать отображаемую сессию, как сейчас. В transfer mode клик по item выбирает target перевода, подставляет номер цели в transfer target buffer и переключает правую панель на dialpad. Source-сессию нельзя выбрать как target: такой item нужно игнорировать или disabled, без смены source и без выхода из transfer mode.
- **Файлы для изменений:**
  - `src/features/call-card/ui/CallCardQueuePanel.vue`
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/call-card-session-view.ts` при необходимости получить number/name target из session view
- **Ожидаемый результат:** В transfer mode очередь работает как список целей перевода. Клик по target открывает dialpad с подставленным номером, source-карточка остается той же active-сессией.
- **Проверка:** Ручная проверка: active source -> transfer -> queue item другой сессии -> dialpad с номером target; source не меняется. Клик по source item не выбирает его как target.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Выполнение слепого перевода

- **Описание:** Добавить действие blind transfer в store. Для target number из dialpad вызвать `sourceSession.refer({ targetNumber })`. Для target-сессии из очереди использовать `sourceSession.refer({ toSession })`, если session API позволяет выполнить перевод на существующую сессию с завершением обеих наших сессий на успехе; если target-сессия недоступна к моменту клика, fallback - перевод по сохраненному номеру. На успехе завершение source/target остается на стороне `refer` API; карточка сбрасывает transfer mode. На ошибке логировать ошибку в консоль и оставить transfer mode открытым с текущим target.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/features/call-card/model/call-card-actions.ts` при необходимости вынести тонкую обертку над `session.refer`
  - `src/features/call-card/ui/CallCardDialpadPanel.vue`
- **Ожидаемый результат:** Слепой перевод с введенным номером и с target из очереди вызывает `refer` выбранной source-сессии. Успешный перевод убирает source из карточки через текущий session lifecycle, ошибка не закрывает режим перевода.
- **Проверка:** Ручная проверка: active call -> transfer -> ввод номера -> blind transfer; active call -> transfer -> target из очереди -> blind transfer. Проверить успешный сценарий и сценарий ошибки/недоступной цели через console log.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Границы, сборка и подготовка к wiki/test после transfer

- **Описание:** Пройти ручные сценарии blind transfer и проверить, что не сломались текущие сценарии карточки: DTMF без transfer mode, queue selection без transfer mode, close/reset, footer sync, active/hold. Зафиксировать, что consultation transfer, merge-консультации, конференции и автотесты остаются за рамками этой части. После реализации blind transfer отдельно согласовать обновление wiki и финальные тесты.
- **Файлы для изменений:**
  - `.ai/tasks/WUI-5081/case.md` только при появлении новых уточнений
  - `.ai/knowledge/wiki/**` не обновлять в этом шаге, если пользователь отдельно не подтвердит wiki-этап
- **Ожидаемый результат:** Blind transfer готов к ручной проверке; scope следующего этапа понятен: wiki и тесты после завершения transfer-правок.
- **Проверка:** Ручная проверка сценариев. `npm run build` / `npm run test` запускать только после отдельного согласия пользователя.
- **Коммит после шага:** Нет
- **Нужно ли обновить project wiki:** Нет, wiki обновить отдельным следующим этапом после transfer

## Вне рамок этого плана

- Полноценный перевод с сопровождением.
- Merge-консультации и consultation-session lifecycle.
- Конференции и любые сценарии conference transfer.
- `answer to hold`.
- Полное удаление legacy `call-manager` / `call-queue`.
- Автотесты до отдельного согласования финального тестового шага.
