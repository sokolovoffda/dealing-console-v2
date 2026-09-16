# Вызовы

## Назначение

Страница фиксирует устойчивую доменную модель обычных вызовов в dealing console, прежде всего правила WUI-5081 для новой карточки вызова 3.0.

## Текущее понимание

В версии 3.0 обычные трубочные вызовы управляются через единую карточку вызова. Карточка объединяет старую карточку вызова и старую очередь, работает с телефонными трубками.

Presentational UI карточки (WUI-5631) — `TurretCallCard` из `@rtu-turret-system/turret-lib`. Домен остаётся в dealing: `useCallCardStore` + adapter `useTurretCallCardAdapter` (`store → TurretCallCardProps` / emits → store). Footer трубок вне либы; в карточку передаётся только `handsetSide`.

Отдельно (WUI-5185): тот же UI может открываться в **pinned-presentation** для сессии завешенного слота (`openPinnedPanelSession`) — без bind к трубке; adapter выставляет `capabilities` (pin/handsetSwap/transfer/history: false, queue: true), `transfer: null`, mic-иконки в `queue[].icon`. Трубочный сценарий WUI-5081 при этом не смешивает pinned ID в handset queue.

Карточка открывается снизу над footer. Выбранная левая/правая трубка меняет внутреннюю раскладку карточки и выбор сессий, но не меняет позицию overlay.

## Основные сущности

- `CallCardHandsetId` - идентификатор трубки: `left` или `right`.
- `CallCardSessionViewState` - состояние сессии для карточки: `incoming`, `outgoing`, `active`, `hold`.
- `CallCardTone` - цветовая группа карточки и action-кнопок: `neutcon`, `waitcon`, `callcon`, `warncon`, `negcon`.
- `CallCardSessionControlLayout` - раскладка нижней панели карточки сессии: `outgoing`, `sessionCommon`, будущий `transfer`.
- `selectedSessionId` - выбранная сессия текущей трубки для отображения в карточке.
- `selectedPanelMode` - правая панель карточки: `dialpad`, `history`, `queue`.

## Пользовательские сценарии

- В empty-состоянии карточка показывает выбранную трубку, историю или dialpad.
- Клик по карточке панели быстрого вызова запускает исходящий вызов или открывает существующую сессию с этим абонентом.
- Входящий с карточки ПБВ/AM (shared `ContactCard`, WUI-5596): accept на goose (завешенные) или трубку; без устройства — toast, не только открытие call-card.
- При наличии сессии левая часть карточки показывает состояние вызова, имя, номер, таймер и нижнюю панель действий.
- Правая область для empty-состояния переключается между `history` и `dialpad`.
- Правая область для session-состояния по умолчанию открывает очередь текущей трубки и также позволяет открыть `dialpad`.
- Клик по элементу очереди или переключение стрелками меняет только отображаемую сессию. Это не делает `answer`, `hold`, `unhold` и не меняет активность сессии.

## Правила и ограничения

- Базовый режим карточки вызова работает с трубками (WUI-5081).
- Очередь handset-режима относится к текущей трубке; сессии завешенных линий туда не попадают (`isPinnedPanelSessionId`).
- Pinned-presentation: отдельный режим того же компонента; handset queue/routing не меняются.
- `outgoing` всегда использует `waitcon`.
- `active` всегда использует `callcon`.
- `hold` использует `waitcon`.
- `incoming` использует `warncon` для обычного входящего и `negcon` для важного входящего; для `negcon` текст на карточке должен быть белым.
- Иконки состояния зависят от стороны трубки:
  - исходящий: левая `arrowNorthEastM`, правая `arrowNorthWestM`;
  - входящий: левая `arrowSouthWestM`, правая `arrowSouthWestInvM`;
  - active/hold: левая `phoneCallF`, правая `phoneCallInvF`.
- Нижняя панель:
  - empty: справа `history + dialpad`;
  - outgoing: слева `transfer to other handset`, справа `queue + dialpad`;
  - active/incoming/hold: слева `hold toggle + transfer to other handset`, справа `transfer toggle + queue + dialpad`;
  - transfer mode согласуется отдельно.
- Если пользователь отвечает на входящий вызов, а на этой трубке уже есть активная сессия, текущая активная сессия переводится на hold, принятый входящий становится активным.
- В текущей части WUI-5081 конференции не реализуются и не должны влиять на модель карточки.

## Edge cases

- Если сессия уже существует при клике по ПБВ, нужно открыть существующую карточку этой сессии, а не создавать новый вызов.
- Если доступных трубок нет, footer disabled и карточка вызова не открывается.
- Runtime-сценарий отвала трубки при уже открытой карточке пока не обрабатывается.
- Сценарий `answer to hold` является будущим: принять входящий сразу в hold, не прерывая текущий активный разговор.

## Связанные страницы

- `handsets.md`
- `quick-call-panel.md`
- `statuses.md`
- `../frontend/components.md`
- `../backend-integration/sip-webrtc.md`

## Источники

- `.ai/tasks/WUI-5081/case.md`
- `.ai/tasks/WUI-5081/implementation_plan_4.md`
- `src/features/call-card/model/types.ts`
- `src/features/call-card/model/call-card-session-view.ts`
- `src/features/call-card/model/use-turret-call-card-adapter.ts`
- `src/features/call-card/ui/CallCardWindow.vue`
- Уточнение пользователя от 2026-07-03
- WUI-5185-p2: `openPinnedPanelSession` в `use-call-card-store.ts` (2026-07-18)
- WUI-5631: presentational UI → `TurretCallCard` + adapter (2026-09-10)

## Открытые вопросы

- Полный SIP/WebRTC-контракт для blind transfer и attended transfer требует отдельной проверки.
- Pinned: края очереди в `TurretCallCard` navigator допускают virtual `0` / `total+1` (как handset); store для pinned их не применяет — клик no-op. Нужен ли override `canGo*` в контракте либы.

