# Статусы абонентов

## Назначение

Страница фиксирует текущее понимание статусов абонентов, которые используются UI-компонентами для отображения доступности и состояний звонка.

## Текущее понимание

Для базового online/offline карточки контакта (`features/contact-card`) используется SIP/BLF статус из `useContactStatusState().contactStatuses`.

Правило presence:

- `contactStatuses[internalNumber]?.registered === true` -> `online`;
- отсутствующий статус, отсутствующий `internalNumber` или `registered !== true` -> `offline`.

Presence намеренно остается отдельной базовой моделью доступности. Поверх presence используются два дополнительных слоя:

- `selfStatus` — наша локальная SIP-сессия текущего пользователя с этим абонентом;
- `subscriberStatus` — BLF-состояние абонента относительно других участников.

Batch SIP/BLF `subscribeSIP` для наполнения `contactStatuses` выполняет Activity Monitor (не ПБВ). Без подписки карточки ПБВ обычно остаются `offline` по presence, но `selfStatus` и звонок работают как раньше.

Self-статусы карточки панели быстрого вызова:

- `incoming-self` — этот абонент звонит текущему пользователю;
- `outgoing-self` — текущий пользователь звонит этому абоненту;
- `connected-self` — текущий пользователь находится в разговоре с этим абонентом;
- `conference-self` — текущий пользователь находится в конференции с этим абонентом;
- `incoming-hold-self` — входящий вызов с этим абонентом на удержании;
- `outgoing-hold-self` — исходящий вызов с этим абонентом на удержании;
- `conference-hold-self` — конференция с этим абонентом на удержании.

Subscriber-статусы карточки панели быстрого вызова:

- `incoming-subscriber` — у абонента есть входящий вызов не с текущим пользователем;
- `connected-subscriber` — абонент находится в разговоре не с текущим пользователем;
- `hold-subscriber` — вызов абонента не с текущим пользователем находится на удержании.

В первой части WUI-4864 эти статусы используются только для визуального состояния карточки. Действия по клику, контекстное меню, перехват и переходы в call manager не добавлены.

## Основные сущности

- `SubscriberStatus.registered` — признак доступности абонента из SIP/BLF notify.
- `useContactStatusState().contactStatuses` — словарь статусов по `internalNumber`.
- `ContactPresence` — UI-состояние карточки панели быстрого вызова: `online` или `offline`.
- `ContactCardSelfStatus` — UI-состояние нашей локальной сессии с абонентом.
- `ContactCardSubscriberStatus` — UI-состояние BLF-линий абонента относительно других участников.
- `useSessionStore().getPreferredSessionByPServed(...)` — источник локальной сессии текущего пользователя для вычисления self-статусов.
- `useContactStatusState().findLinesByInternalNumber(...)` — источник BLF-линий абонента.

## Правила и ограничения

- UI не должен считать контакт online без `registered === true`.
- Отсутствие статуса трактуется как `offline`.
- Для карточки панели быстрого вызова presence является UI-абстракцией поверх SIP/BLF статуса, а не самостоятельным backend-полем.
- Локальная сессия текущего пользователя имеет визуальный приоритет над BLF-линиями абонента.
- Если есть `selfStatus`, карточка получает фон и основную иконку нашей сессии.
- Если `selfStatus` нет, карточка получает фон из `presence` с учетом priority.
- `subscriberStatus` не выбирает фон карточки; он добавляет дополнительную иконку поверх базового `presence`-тона.
- `subscriberStatus` визуально применяется только для `online`; для `offline` карточка остается в базовом offline-тоне без subscriber-иконки.
- Priority влияет только на `online/offline` и `incoming-self`.
- Для `incoming-self` high priority дает красный фон, все остальные priority — оранжевый.
- Остальные self-статусы не зависят от priority.
- Визуальный контракт хранится в `contact-card-tone`: `CONTACT_CARD_PRESENCE_TONES`, `CONTACT_CARD_INCOMING_SELF_TONES`, `CONTACT_CARD_SELF_TONES`, `CONTACT_CARD_SUBSCRIBER_ICONS`.

## Связанные страницы

- `quick-call-panel.md`
- `activity-monitor.md`
- `../backend-integration/sip-webrtc.md`

## Источники

- `src/entities/contact/model/use-contact-status-state.ts`
- `src/features/contact-card/model/use-contact-card-presence/use-contact-card-presence.ts`
- `src/features/contact-card/model/use-contact-card-status/use-contact-card-status.ts`
- `src/features/contact-card/model/contact-card-tone/contact-card-tone.ts`
- `src/features/contact-card/ui/ContactCard.vue`
- `src/widgets/activity-monitor/model/use-activity-monitor-blf-subscription.ts`
- Уточнение пользователя от 2026-06-01
- Уточнение пользователя от 2026-06-02
- Уточнение пользователя от 2026-08-26 (presence/subscriber в shared ContactCard; BLF subscribe только AM)

## Открытые вопросы

- Финальные размеры, отступы, цвета и точные соответствия иконок будут доведены на ручном pixel perfect шаге.
