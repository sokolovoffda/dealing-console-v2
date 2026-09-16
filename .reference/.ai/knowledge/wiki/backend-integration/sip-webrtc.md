# SIP / WebRTC

## Назначение

Страница фиксирует интеграционные правила SIP/WebRTC, которые важны для UI-логики звонков, BLF/presence и статусов абонентов.

## Текущее понимание

SIP инициализируется на уровне application layout через `useWebRTC().initSIP(...)`. После регистрации SIP (`onRegisteredSIP`) можно создавать presence-подписки через `subscribeSIP(internalNumber, expires)`.

`subscribeSIP` создает JsSIP presence subscriber, парсит `notify` через `notifyBodyParser`, затем обновляет `useContactStatusState`:

- `updateRemote(notifyBody)` — обновляет `contactStatuses[internalNumber]`;
- `updateLine(notifyBody)` — обновляет линии звонков;
- `paintGooseButtons(notifyBody)` — обновляет индикацию controller buttons.

Панель быстрого вызова **не** батчит SIP/BLF presence для своих контактов: подписки вынесены на Activity Monitor (оптимизация).

Activity Monitor подписывает абонентов верхней сетки через widget-level `useActivityMonitorBlfSubscription`: после резолва контактов берёт `internalNumber`, ждёт `onRegisteredSIP` и вызывает `subscribeSIP(internalNumber, 5 * 60)` батчами.

## Правила и ограничения

- Подписку на presence нужно делать только после `onRegisteredSIP === true`.
- `subscribeSIP` уже защищает от дублей через внутренний `activeSubscribers`.
- Для Activity Monitor используется батчевая подписка:
  - batch size: `16`;
  - delay: `1000 ms`;
  - expires: `5 * 60` секунд.
  - только пока открыт AM (`ActivityMonitorPanel` mounted).
- Панель быстрого вызова не запускает batch `subscribeSIP` для контактов групп.
- Подписка Activity Monitor не живет в entity store: это widget-level composable.

## Edge cases

- Если SIP разрегистрирован, подписка не выполняется.
- Если во время батчевой подписки начался новый run, старый run не должен подписывать устаревшие контакты.
- Ошибка `subscribeSIP` для одного номера логируется и не должна ломать весь список карточек.

## Связанные страницы

- `../domain/activity-monitor.md`
- `../domain/quick-call-panel.md`
- `../domain/statuses.md`

## Источники

- `src/shared/jssip/useWebRTC.ts`
- `src/shared/jssip/notify-body-parser.ts`
- `src/entities/contact/model/use-contact-status-state.ts`
- `src/widgets/activity-monitor/model/use-activity-monitor-blf-subscription.ts`
- `src/widgets/pinned-calls/ui/PinnedCallsCards.vue` (референс batch)
- Уточнение пользователя от 2026-08-26 (BLF только на AM; ПБВ без batch-subscribe)

## Открытые вопросы

- Нужно ли добавить explicit unsubscribe при уходе с Activity Monitor, или достаточно `expires` + отмена текущего batch run.
