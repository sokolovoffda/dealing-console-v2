# WUI-5631 — Перевести call-card на turret-call-card

## Исходная задача

Перевести presentational UI карточки вызова в дилинговом пульте на компонент `TurretCallCard` из пакета `@rtu-turret-system/turret-lib`, сохранив текущую доменную логику в dealing (`useCallCardStore`, SIP, pinned, трубки).

Предшественник: WUI-5622 — call-card вынесен в `ui-lib`, опубликован npm-пакет `@rtu-turret-system/turret-lib@0.1.0` (GitLab Package Registry project 3853).

### Scope (входит)

- Подключение `@rtu-turret-system/turret-lib` + styles в dealing.
- Adapter: маппинг `useCallCardStore` → `TurretCallCardProps` + handlers на emits.
- Замена presentational UI call-card на `TurretCallCard` (session/empty, dialpad, history, queue, transfer chrome).
- Pinned presentation через `capabilities` (без нового `session.state`): скрыть pin / handsetSwap / transfer / history; queue + dialpad оставить; mic-иконки в `queue[].icon` с adapter.
- Footer трубок оставить в dealing; в карточку передавать только `handsetSide`.

### Критерии приёмки

1. Карточка вызова в dealing визуально и по сценариям соответствует текущему поведению на базе `TurretCallCard`.
2. Работают: empty / incoming / active / hold, dialpad (+ DTMF), history select → dial, queue (+ navigator / virtual slots), transfer (idle / consult / merge / cancel).
3. Pinned open: корректный набор кнопок и очередь с mic-иконками.
4. Footer трубок не сломан; `handsetSide` left/right зеркалит UI.
5. Нет регрессий по mute/volume / hold / pin / handset-swap (где применимо).

## Уточнения пользователя

- Локальная копия либы для сверки контракта: `C:\Users\d.sokolov\Desktop\projects\ui-lib`.
- Ветка dealing: `feature/WUI-5631`.
- Зависимость `@rtu-turret-system/turret-lib` уже добавлена (коммит `7049c68e`), `.npmrc` со scope `@rtu-turret-system` настроен. На шаге 5 подняли до `^0.1.1` (pinned queue `canSelectQueuePrevious` / `canSelectQueueNext`).
- **Токены:** источник истины — либа. Ожидаемо **все** релевантные токены (callcard + btn/tog и далее) будут жить в `@rtu-turret-system/turret-lib` и поставляться через `style.css`; dealing подключает пакет и не держит параллельный source of truth. На WUI-5631: импорт стилей либы так, чтобы они побеждали локальные дубли; полный вынос локальных токенов из dealing — по мере миграции / отдельным шагом. (2026-09-10)
- **Vue peer:** сначала пробуем на `vue@3.4`; bump до `^3.5` только если сломается. (2026-09-10)
- **Adapter vs lib:** карточка даёт нужный controlled API; расхождения поведения закрываем адаптацией dealing (маппинг store → props/emits), а не перестройкой домена «под либу». Правки ui-lib — только если контракт реально не хватает и это критично. (2026-09-10)
- **Расхождения контракта:** фиксировать в кейсе/плане; критичные → отдельный фикс в ui-lib. (2026-09-10)
- Consultation chrome: в `transfer.targetName` при stage `starting|active` отдаём имя **source** (как старый `transferMergeTarget`), не dial-target. (2026-09-10)
- Empty title: `dial.contactName` fallback на `${title} трубка` (Левая трубка / Правая трубка), как старый CallCardEmptyState; либа хардкодит «Трубка» только если contactName пустой. (2026-09-11)

## Известные расхождения (lib ↔ dealing)

- Queue disable в transfer: dealing смотрит `sourceSessionId`, либа — `session.sessionId`. При текущем flow dealing selected = source (выбор target не меняет selected) — **адаптируем dealing**, либу не трогаем, пока не всплывёт регресс.
- `canCall` / empty dial: dealing учитывает `hasAvailableHandset`, либа — нет. Крайний кейс; следить на smoke, критично → правка либы или guard в handler.
- `style.css` пакета также задаёт `--color-btn-*` / `--color-tog-*` (не только callcard). Импорт после dealing-темы даст победу либы и по ним; значения портированы из dealing — ожидаемо ок, проверить визуально footer/кнопки вне карточки.
- Pinned queue navigator: в `0.1.1` либа принимает controlled `canSelectQueuePrevious` / `canSelectQueueNext`; dealing прокидывает их из store (`canSelectPreviousQueuePosition` / `canSelectNextQueuePosition`).

## Ограничения

- Controlled API: store снаружи, UI только props/emits — домен (SIP/Pinia/pinned) остаётся в dealing.
- Не тащить footer handsets в либу; только `handsetSide`.
- Pinned без нового `session.state` — только `capabilities` recipe.
- Peer либы: `vue` `^3.5.0`, `@wui/common-library` `^2.1.0-alpha.16`. В dealing сейчас `vue@^3.4.37` и `common-library@2.1.0-alpha.26` — возможный peer warning / нужна проверка совместимости.
- FSD: adapter и wiring внутри `features/call-card`; публичный API слайса не ломать без необходимости (`CallCardDropdownHost`, `useCallCardStore`).

## Связанные материалы

- Jira: https://jira.satel.org/browse/WUI-5631
- ui-lib wiki: `C:\Users\d.sokolov\Desktop\projects\ui-lib\.ai\knowledge\wiki\domain\call-card.md`
- ui-lib README: секция TurretCallCard (pinned recipe, `canPin` / `canHandsetSwap`)
- dealing wiki: `.ai/knowledge/wiki/domain/calls.md`, `.ai/knowledge/wiki/domain/pinned-calls.md`
- Код dealing: `src/features/call-card/`
- Код либы: `ui-lib/lib/components/turret-call-card/`
