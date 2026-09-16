# Кейс: WUI-5185 — Стили карточки завешенной линии (pinnedline)

## Описание текущей части кейса

Довести визуал карточки слота до Figma `pinnedline` и правил футера бродкаст-групп: матрица mic/volume, правая кнопка (действие вне сессии / mute в сессии), иконки mic как в группах, VAD в слайдере. Empty/`+` не меняем. Сценарии dial/answer/cancel/call card не ломаем.

## Контекст предыдущих частей

- `implementation_plan_1.md` — REST API, store, сетка 15.
- `implementation_plan_2.md` — UI карточки, сессии, call card, footer.
- `implementation_plan_3.md` — WidgetViewport колонки.
- `implementation_plan_4.md` — Goose / PTT Media Devices.
- WUI-5293 — футер групп: visual matrix + VAD track (референс).

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/domain/broadcast-groups.md`
- Figma: `pinnedline` set `582:140`

# План реализации: pinnedline card styles + VAD

## Шаг 1: View-model визуальных состояний слота

- **Описание:** Расширить `pinned-call-slot-card-view.ts`: visual state (disable-like / inactive / inactive-muted / active / active-muted + call accents для out/inc/hold без сессии-audio); mic icons `micM`/`micF`; status/speaker icons: вне сессии — dial/inc/out/hold (`pauseM` для remote hold — уточнить детект local vs remote); в active — `volumeOnF` / volumeOff; хелперы классов зон (mic / mid / status) на токенах `pinnedline-*` по аналогии с `broadcast-group-card-view` / footer. Поведение кликов не менять.
- **Файлы:** `src/widgets/pinned-calls-panel/model/pinned-call-slot-card-view.ts`, при необходимости unit-тест рядом.
- **Ожидаемый результат:** Чистый маппинг state+mic+volume(+hold kind) → иконки и CSS-модификаторы.
- **Проверка:** unit-тест view-model / `vue-tsc`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (в финале)

## Шаг 2: Натянуть стили на `PinnedCallsPanelSlotCard`

- **Описание:** Подключить visual classes к mic / mid / status / volume range (как footer групп: зоны + override CSS variables слайдера). Убрать плоский `neutcon` где мешает матрице. В active правая кнопка визуально toggle mute (pressed = volume 0). Out/inc/hold — токены waitcon/warncon/негатив по макету, без смены handlers.
- **Файлы:** `PinnedCallsPanelSlotCard.vue`, scoped styles.
- **Ожидаемый результат:** Карточка красится по mic/mute; вне сессии правая — action; в сессии — speaker mute look.
- **Проверка:** ручной просмотр idle/out/inc/active/mute/mic on-off; `vue-tsc`.
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 3: VAD на слайдере слота

- **Описание:** Как в `BroadcastGroupCardFooter`: серые полосы при active session; синяя дорожка = `remoteVoiceLevel` при `remoteVoiceDetected`; free space scale через `:deep` `::before`/`::after`. Источник — session facade слота.
- **Файлы:** `PinnedCallsPanelSlotCard.vue` (+ мелкий helper в view-model при необходимости).
- **Ожидаемый результат:** При речи контрагента видна индикация на слайдере слота.
- **Проверка:** ручной на живой сессии; `vue-tsc`.
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 4: Тесты + wiki

- **Описание:** Unit на view-model (иконки, visual matrix, VAD percent). Обновить `domain/pinned-calls.md` (+ index/log при необходимости): матрица стилей, правая кнопка dual-mode, remote hold `pauseM`, VAD.
- **Файлы:** `*.test.ts`, `.ai/knowledge/wiki/**`
- **Ожидаемый результат:** Покрытие согласованных сценариев; стабильное знание в wiki.
- **Проверка:** точечный `vitest` + review wiki.
- **Коммит после шага:** Да (tests/wiki можно разнести)
- **Wiki:** Да

## Out of scope

- Empty / `+` / disable-edit редизайн.
- Смена product-сценариев dial/answer/hold/call card (кроме иконки remote hold).
- REST persist mic/volume.
