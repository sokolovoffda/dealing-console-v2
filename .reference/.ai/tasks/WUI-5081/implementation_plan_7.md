# Кейс: WUI-5081 — Transfer с консультацией (attended merge)

## Описание текущей части кейса
Реализовать в карточке вызова `call-card` сценарий transfer с консультацией:
- при активированном `phoneTransferM` сначала выбирается target (как сейчас для blind),
- затем стартуется consultation-call к B (отдельная SIP-сессия),
- во время consultation правый `dialpad` работает как DTMF для consultation-сессии,
- слева вместо стрелок/навигации очереди показывается merge-target (переводимый абонент A),
- доступна только `cancel consultation` (terminate consultation) и `merge` (после CONNECTED),
- после merge обе сессии завершаются (как в legacy), а карточка показывает следующую сессию по правилу “первая в очереди/та же логика выбора”.

## Контекст предыдущих частей
- `implementation_plan_5.md` — blind transfer из карточки вызова.
- `implementation_plan_6.md` — стабилизация/уплотнение `call-card` store (refactor без изменения поведения до transfer).

## Связанные страницы проектной памяти
- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/domain/handsets.md`
- `.ai/knowledge/wiki/backend-integration/sip-webrtc.md`

# План реализации: consultation transfer + attended merge

## Шаг 1: Модель consultation-stage в `call-card` store
- **Описание:** 
  - В `use-call-card-store.ts` добавить consultation-stage (минимально необходимое состояние) и вычисляемые селекторы:
    - consultation-сессия (B) должна находиться по соответствию `referCallId === sourceSessionId` исходной сессии A.
    - `isConsultationActive` / `isConsultationConnected` (merge доступен только при CONNECTED).
    - “сессия для hold/unhold” и “сессия для DTMF” должны переключаться на consultation-сессию, когда она активна.
  - Адаптировать действия:
    - `toggleSelectedSessionHold` (и связанные UI-условия) должны управлять consultation-сессией во время consultation, а не source-сессией.
    - DTMF отправка должна идти в consultation-сессию.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - возможно: `src/features/call-card/model/types.ts` (расширение `CallCardTransferState` при необходимости)
  - возможно: `src/features/call-card/model/use-call-card-store` потребует мелких точечных правок типизации/компоновки return
- **Ожидаемый результат:** Store умеет однозначно отличать blind-vs-consultation UI-states и маршрутизировать hold/unhold и DTMF на правильную сессию.
- **Проверка:** 
  - `npm run ts:check`
  - ручной smoke: включить `phoneTransferM` без запуска consultation и убедиться, что blind-путь не сломался (UI может быть временно не полностью переключенным).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Запуск consultation-call (SIP REFER header) + hold source A
- **Описание:**
  - Реализовать action “start consultation”:
    - source A переводится на hold сразу при старте consultation.
    - старт consultation-call к targetNumber через `switchToCall` с `extraHeaders: ['Refer-Call:<sourceSessionId>']` (как в legacy).
    - правый panel переводится в `dialpad` (чтобы консультационный dialpad сразу был в режиме DTMF).
- **Файлы для изменений:**
  - `src/features/call-card/model/call-card-actions.ts` (расширить `startCallCardOutgoingCall`/или создать локальный вызов `switchToCall` с `extraHeaders`)
  - `src/features/call-card/model/use-call-card-store.ts` (новый action: старт consultation)
  - возможно: `src/features/call-card/model/types.ts`
- **Ожидаемый результат:** После клика consultation-start появляется consultation-сессия (B) с `referCallId=sourceSessionId`.
- **Проверка:**
  - `npm run ts:check`
  - ручной сценарий: source A → transfer → consultation → убедиться что звонок к B реально стартует; A на hold.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Cancel consultation (terminate consultation only) и возврат в UI “A на hold”
- **Описание:**
  - Реализовать action “cancel consultation”:
    - terminate consultation-сессии (B).
    - выключить transfer-mode (сброс `transferState`), но **не** трогать hold на A (A остаётся на hold).
    - вернуть правую панель в `queue`.
  - Добавить watch/cleanup на случай “консультация не дозвонилась”:
    - если consultation-сессия исчезла/закончилась без merge, UI должен вернуться к карточке A как в шаге выше.
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
- **Ожидаемый результат:** Abort/неуспех consultation всегда возвращает пользователя к стандартной карточке A, A остаётся на hold.
- **Проверка:**
  - `npm run ts:check`
  - ручной сценарий: consultation (B) → отмена до CONNECTED / не дозвонился → убедиться, что UI вернулся к A на hold.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Merge consultation (attended merge) и корректный выход из consultation
- **Описание:**
  - Реализовать action “merge”:
    - merge выполняется `consultationSession.refer({ toSession: sourceSession })` (из consultation в source).
    - merge доступен только при CONNECTED consultation-сессии.
    - на SUCCESS выключить transfer-mode; дальнейшая логика выбора “следующей сессии” оставляется как в текущей карточке/очереди (в частности “первая в очереди”).
    - на FAIL оставить consultation активной (transfer-mode не сбрасывать преждевременно).
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
- **Ожидаемый результат:** После merge A и consultation завершаются (как в legacy), UI корректно показывает следующую сессию в очереди.
- **Проверка:**
  - `npm run ts:check`
  - ручной сценарий: consultation → дождаться CONNECTED → merge → убедиться что обе сессии завершились и UI переключился на “первую в очереди”.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: UI — перестановка кнопок и замена навигации очереди на merge-target
- **Описание:**
  - `CallCardDialpadPanel.vue`:
    - swap расположение кнопок: сверху consultation (зелёная), снизу blind (синяя).
    - при активной consultation: сверху merge (синяя) включена только при CONNECTED, снизу cancel (красная) доступна всегда после старта consultation.
    - переключить поведение dialpad на DTMF для consultation-сессии (и отключить редактирование targetNumber).
  - `CallCardSessionState.vue`:
    - во время consultation скрыть `call-card-queue-navigator` и вместо стрелок показать merge-target (A) с иконкой `phoneTransferM` рядом с `name` (как в твоих скринах).
    - ensure кнопка hold/unhold управляет consultation-сессией (не source).
    - queue справа должна быть активна после cancel/неуспеха (см. шаги 3/4).
    - если на другой трубке уже активен другой transfer/consultation flow, перенос consultation-сессии на эту трубку не выполняется: кнопка остаётся кликабельной, но по клику показывается notification об отказе вместо фактического переноса.
  - Проверить, что `CallCardQueuePanel`/стрелки очереди не используются в consultation-режиме (т.к. вместо них показан merge-target).
- **Файлы для изменений:**
  - `src/features/call-card/ui/CallCardDialpadPanel.vue`
  - `src/features/call-card/ui/CallCardSessionState.vue`
- **Ожидаемый результат:** UI соответствует финальному поведению, согласованному тобой: blind как раньше, consultation = DTMF + cancel/merge + merge-target вместо стрелок.
- **Проверка:**
  - `npm run ts:check`
  - ручная проверка 3 сценариев:
    1) consultation не дозвонилась → назад к A на hold + queue справа
    2) consultation CONNECTED → merge → выход и показ “первой в очереди”
    3) blind transfer не сломался после перестановки кнопок
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 6: Багфиксы + финальная правка по макету строки (по согласованию)
- **Описание:**
  - Исправить баг: в режиме `transfer` если ввести свой номер и нажать `blind transfer`, происходит что-то непонятное — вместо этого должна быть нотификация “нельзя перевести на самого себя” и операция не должна выполняться.
  - Исправить баг: в режиме consultation если нажать на свой номер, сейчас только в консоли видим “Нельзя вызывать самого себя” и ничего не происходит — нужно показать user-facing notification.
  - Исправить баг: при перебросе consultation на другую трубку она начинает отображаться как обычная сессия (consultation-mode должен сохраняться).
  - Исправить мини-баг: на правой трубке иконка трубки лезет на текст (наложение в строке/лейауте карточки).
  - Сделать все мелкие UI-несоответствия, которые вскрылись после шагов 4–5, и минимально поправить поведение/отображение только в объеме багов этого шага (не ломая blind transfer).
  - В конце шага выполнить правку стиля строки переводимого абонента (merge-target) по макету (в т.ч. выравнивания/отступы/размер иконки рядом с `phoneTransferM`).
  - Запустить `npm run ts:check` / `npm run lint`; при необходимости добавить/обновить unit/component тесты (Vitest + Vue Test Utils) для guard/отображения consultation-mode и проверки UI-структуры merge-target (без WebRTC/SIP).
- **Файлы для изменений:**
  - `src/features/call-card/model/use-call-card-store.ts`
  - `src/shared/jssip/useWebRTC.ts`
  - `src/features/call-card/ui/CallCardSessionState.vue`
  - возможно: точечно `src/features/call-card/ui/*` (наложение/стили)
- **Ожидаемый результат:** При попытке перевода на себя показывается notification и операция не выполняется; consultation-mode сохраняется при перебросе; отсутствуют наложения иконки на текст; финальная строка merge-target соответствует макету.
- **Проверка:** ручная проверка 4 сценариев:
  - transfer с вводом своего номера + `blind transfer`: показывается notification “нельзя перевести на самого себя” и нет некорректного поведения;
  - transfer с вводом своего номера + `consultation`: показывается notification (не только console.warn);
  - consultation переброшена на другую трубку: не превращается в обычную сессию;
  - визуально: на правой трубке нет налезания иконки, а строка merge-target выглядит как в макете.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

