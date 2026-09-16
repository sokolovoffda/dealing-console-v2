# Кейс: WUI-4864 — Device affinity на incoming (без hold/media до answer)

## Описание текущей части кейса

Согласованная бизнес-модель: при incoming сразу вешать **affinity** устройства (goose при свободном pin-слоте, иначе выбранная трубка), без hold и без media. Media + hold — только на answer. Incoming-assign перевести на `usePinnedCallsPanelStore`. ПБВ/футер/call-card должны видеть одну и ту же «сторону/устройство» звонка. Детали — в `case.md` § «device affinity на incoming».

## Контекст предыдущих частей

- `implementation_plan_6.md` — UI токенов/иконок карточки ПБВ (L/R, pinned mic, goose-hold stub); зависит от раннего `currentDevice` на incoming.
- Ранее: self-статусы без presence; panel pinned store для `isPinnedSession` по `slotSessionIds`.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/domain/quick-call-panel.md`

После стабилизации модели — обновить wiki (calls + pinned-calls) отдельным шагом.

# План реализации: Device affinity на incoming

## Шаг 1: Affinity API без hold / без media

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** Развести affinity и activation в devices-sessions (или тонкая обёртка над `bindSessionToDevice`): на RINGING можно выставить устройство/`devicesSession` **без** `holdOtherSessionsOnDevice` и **без** media update (`getUserMedia` / replaceTrack). Answer / явный activation — прежний путь с hold+media.
- **Файлы для изменений:** `src/shared/composables/state/devices-sessions-store/use-devices-sessions-store.ts` (+ точечные типы/экспорт); при необходимости тонкие вызовы в call-session.
- **Ожидаемый результат:** Есть способ привязать сессию к device на ringing без hold и без media; существующие сценарии answer/outgoing не ломаются.
- **Проверка:** `npm run ts:check`; точечный unit на bind-флаги, если уже есть тесты store.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (в конце блока)

## Шаг 2: Incoming policy + panel store вместо legacy pin assign

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** В `addSession` (incoming): если есть **свободный** слот в `usePinnedCallsPanelStore` по `pServed` → `assignSessionToFreeSlot` + affinity goose (`readyGooseDevices[0]`); иначе affinity на device выбранной трубки call-card. Убрать/не вызывать legacy `assignSessionToPinnedCall` для этого пути. Явный handset-transfer на RINGING → affinity rebind без hold/media.
- **Примечание:** полный фильтр call-card по правилу 3' — шаг 3; до него queue ещё опирается на legacy `isPinnedSessionId`.
- **Файлы для изменений:** `useSessionStore.ts` (addSession); call-card store (selected handset device, transfer incoming); `use-pinned-calls-panel-store` при нехватке хелперов (`hasFreeSlotByPServed` и т.п. — только если нужно).
- **Ожидаемый результат:** Incoming сразу имеет `currentDevice`; pin-path не в handset queue; no-free-slot → handset path.
- **Проверка:** `npm run ts:check`; ручной сценарий: incoming pin / incoming handset / transfer ringing.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Фильтр call-card / queue по правилу 3'

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** Сессия не в call-card/очереди трубки, если уходит в pin (свободный слот / уже в `slotSessionIds` / goose affinity pin-path). Если free slot нет и path = handset — сессия **в** call-card. Заменить опору фильтра с legacy `isPinnedSessionId` на panel-критерий, согласованный с шагом 2.
- **Файлы для изменений:** call-card session selectors / `use-call-card-store` / места с `isPinnedSessionId` для queue; возможно thin helper в `entities/pinned-calls`.
- **Ожидаемый результат:** Нет мелькания pin-incoming в карточке трубки; overflow без free slot виден на трубке.
- **Проверка:** `npm run ts:check`; ручная проверка обоих путей.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: ПБВ — исходящий pin-контакт через goose; сторона UI

- **Статус:** Выполнен (ожидает коммита пользователя).
- **Описание:** Клик по контакту ПБВ, если контакт в panel (есть слот по `pServed`): звонок/открытие через goose, не через selected handset. Иконки стороны на входящем опираются на affinity/`currentDevice` (уже из шагов 1–2). Трубочный звонок с pin — не делаем (отдельный сценарий позже).
- **Файлы для изменений:** `QuickCallContactCard.vue` / grid actions; при необходимости helper «контакт в pinned panel».
- **Сделано дополнительно:** preload `fetchPanel` в `LayoutApplication` + ПБВ; матч слотов по SIP user; без goose — нотификация, не handset; `switchToCall` пишет и в panel store. Goose `missing` при `VITE_MOCK_CONTROLLER_MODULES` — отдельно позже.
- **Ожидаемый результат:** Pin-контакт с ПБВ → goose; handset-контакт → как сейчас; incoming pin показывает goose/pinned icon.
- **Проверка:** `npm run ts:check`; ручная проверка ПБВ pin vs ordinary.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Wiki + точечные тесты доменной модели

- **Описание:** Обновить `.ai/knowledge/wiki/domain/calls.md` и `pinned-calls.md` согласованными правилами affinity/activation/фильтром 3'. Точечные тесты policy (free slot → goose; no free → handset; filter). Не дублировать весь UI tone suite.
- **Файлы для изменений:** wiki + unit tests policy/helpers.
- **Ожидаемый результат:** Wiki и тесты соответствуют `case.md`.
- **Проверка:** vitest точечно; wiki review.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `calls.md`, `pinned-calls.md`, `index.md`/`log.md`
