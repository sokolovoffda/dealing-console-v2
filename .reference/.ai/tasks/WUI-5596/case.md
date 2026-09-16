# WUI-5596 — Не принимается входящий при клике по карточке ПБВ

## Исходная задача

При входящем от А2 клик по карточке А2 на ПБВ только открывает карточку вызова, вызов не принимается.

Env: 192.168.136.91, dealing-console 3.0.0-alpha.12, РТУ 2.3.2-71_Smolensk.

Шаги: А2 звонит А1 → А1 кликает карточку А2 на ПБВ.  
ОР: вызов принят + открылась карточка вызова.  
ФР: открылась карточка, вызов не принят.

Jira: https://jira.satel.org/browse/WUI-5596

## Уточнения пользователя

- 2026-09-07: клик по карточке ПБВ должен **принять** входящий (не только открыть call-card).
- Если нет доступных устройств — **уведомление** о недоступности.
- Контакт в **завешенных** → принять / повесить на **goose** (или уведомить, если goose недоступен).
- Контакт **не** в завешенных → то же через **трубки** (handset).

## Текущее поведение (код)

Источник: `src/features/contact-card/model/use-contact-card-call/use-contact-card-call.ts`

- Завешенный + сессия: `openPinnedPanelSession` + при ready goose `switchToCall` (reuse → `toggleHold(false)`, **без** `session.answer`).
- Обычный + сессия: только `openSessionInPreferredHandset` (открытие UI, **без** answer).
- Answer на goose уже есть в сетке завешенных: `answerPinnedSession` в `use-pinned-calls-panel-slot-actions.ts`.
- Answer на трубке: `answerSelectedSession` в `use-call-card-store.ts`.

## Ограничения

- Правка в общем `useContactCardCall` затронет и Activity Monitor (та же карточка) — поведение клика должно остаться согласованным.
- Не ломать исходящий звонок / открытие уже активной сессии без лишнего answer.

## Связанные материалы

- Wiki: `.ai/knowledge/wiki/domain/quick-call-panel.md`, `calls.md`, `pinned-calls.md`
- `src/features/contact-card/model/use-contact-card-call/use-contact-card-call.ts`
- `src/widgets/pinned-calls-panel/model/use-pinned-calls-panel-slot-actions.ts` — `answerPinnedSession`
- `src/features/call-card/model/use-call-card-store.ts` — `answerSelectedSession` / `openSessionInPreferredHandset`
