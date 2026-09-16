# Кейс: WUI-5631 — Перевести call-card на turret-call-card

## Описание текущей части кейса

Подключить `@rtu-turret-system/turret-lib` в dealing и заменить presentational UI карточки вызова на `TurretCallCard` через adapter над `useCallCardStore`, сохранив домен (SIP, pinned, footer трубок). Зависимость пакета уже в `package.json` (коммит `ui-lib`).

## Контекст предыдущих частей

- Планов ещё не было.
- WUI-5622 (ui-lib): `TurretCallCard` опубликован как `@rtu-turret-system/turret-lib@0.1.0`.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/domain/handsets.md`
- ui-lib: `domain/call-card.md`, `library/packaging.md`

# План реализации: adapter + TurretCallCard в dealing

## Шаг 1: Styles + проверка peer Vue

- **Описание:** Подключить `@rtu-turret-system/turret-lib/style.css` **после** локальных theme/tokens dealing, чтобы токены либы побеждали локальные дубли (ожидаемо все токены со временем уедут в либу; на этом шаге — SoT для карточки/связанных btn-tog из пакета). Vue: сначала smoke на `3.4`; bump до `^3.5` только если сломается. Smoke: импорт `TurretCallCard` резолвится.
- **Файлы для изменений:** `src/app/assets/styles/index.css` (или `main.ts`); при необходимости `package.json` / lock (`vue`).
- **Ожидаемый результат:** стили пакета подключены; callcard-токены с либы; нет блокеров по импорту.
- **Проверка:** `npm run ts:check`; быстрый визуальный взгляд на карточку и соседние кнопки (btn/tog тоже могут переопределиться пакетом).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Adapter — props VM из store

- **Описание:** Добавить в `features/call-card` adapter (composable/mapper), который из `useCallCardStore` (+ history/pinned где нужно) собирает `TurretCallCardProps`: `session`, `panelMode`, `queue`, `queuePosition`/`queueTotal`, `dial`, `historyItems`, `transfer`, `muted`/`volume`, `handsetSide`, `capabilities`. Маппинг session: существующий `selectedSessionView` → поля либы (`state`/`tone`/`icon`/`actions` + `canPin`/`canHandsetSwap` из `canMoveSelectedSessionToPinnedPanel` / `canTransferSelectedSessionToOtherHandset`). Queue: перенести логику иконок из `CallCardQueuePanel` (в т.ч. mic для pinned). History: `mapCallHistoryToCallCardEntries`. Transfer VM из `selectedTransferState` / consultation. Pinned recipe: `capabilities: { pin, handsetSwap, transfer, history: false; queue: true }`, `transfer: null`.
- **Файлы для изменений:** новые файлы в `src/features/call-card/model/` (например `use-turret-call-card-adapter.ts` / `map-turret-call-card.ts`); при необходимости тонкие правки `call-card-session-view.ts` / `types.ts` только для `canPin`/`canHandsetSwap` если удобнее в VM.
- **Ожидаемый результат:** один источник view-model для `TurretCallCard`, store не меняет доменный API.
- **Проверка:** `npm run ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Wiring emits + замена UI shell

- **Описание:** В `CallCardWindow` (или тонком wrapper рядом) рендерить `TurretCallCard` с props/handlers из adapter. Handlers → существующие методы store: answer/hangup/hold/unhold, panel open/close, queue prev/next/select, dial-change/call, dtmf, history-select → dial+dialpad, mute/volume, transfer-* / transfer-toggle, pin → `moveSelectedSessionToPinnedPanel`, handset-swap → `transferSelectedSessionToOtherHandset`. `CallCardDropdownHost` и footer не трогать по контракту. Удалить использование локальных presentational панелей из shell (`CallCardLayout` / Session / Empty / Dialpad / History / Queue / Audio / QueueNavigator) — файлы удалить или оставить неиспользуемыми только если что-то ещё импортирует (цель: удалить мёртвый UI).
- **Файлы для изменений:** `CallCardWindow.vue`; adapter handlers; удаление неиспользуемых `ui/CallCard*.vue` presentational; `index.ts` при необходимости.
- **Ожидаемый результат:** карточка в footer dropdown работает на `TurretCallCard`; доменные действия те же.
- **Проверка:** ручной smoke empty / session / dialpad; `npm run ts:check`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Pinned presentation + регрессия handsetSide / transfer

- **Описание:** Добить сценарий `openPinnedPanelSession`: capabilities recipe, queue mic icons, без history/pin/swap/transfer chrome. Проверить зеркало `handsetSide` left/right и transfer idle/consult/merge/cancel на обычной трубке. Поправить adapter, если всплывут расхождения с текущим UI (virtual queue slots, consultation dial buffer).
- **Файлы для изменений:** adapter + при необходимости точечные правки store только если контракт emit требует (минимально).
- **Ожидаемый результат:** критерии приёмки Jira по pinned / handset / transfer закрыты.
- **Проверка:** ручной чеклист из acceptance criteria тикета.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `domain/calls.md` (UI = `TurretCallCard` + adapter path); при стабильном знании — коротко в `frontend/components.md`; `log.md` / `index.md` при создании ссылок.

## Шаг 5 (по согласованию): тесты adapter

- **Описание:** После стабилизации контракта — точечные unit-тесты маппинга props/capabilities/queue icons (AAA), без SIP. Только после апрува на тесты.
- **Файлы для изменений:** `src/features/call-card/test/...`
- **Ожидаемый результат:** покрытие критичного маппинга; зелёный vitest по слайсу.
- **Проверка:** `npx vitest run` по call-card.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
