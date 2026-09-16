# Кейс: WUI-5185 — Goose default + режимы mic / PTT (Media Devices)

## Описание текущей части кейса

Вернуть на странице Media Devices выбор Goose по умолчанию и режимов микрофона (`stateful` / `pushToTalk` + scope `standard` / `activePinned`). Persist пока в localStorage. Runtime: выбранный Goose для pinned/footer/speak; `activePinned` PTT на новом panel store (без legacy). Main Settings не трогаем. Учесть ревью: WUI-3825 (active slot) и `reset()` на logout.

## Контекст предыдущих частей

- `implementation_plan_1.md` — REST API, store, сетка 15.
- `implementation_plan_2.md` — UI карточки, сессии, call card, footer.
- `implementation_plan_3.md` — WidgetViewport для колонок pinned.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/devices.md`
- `.ai/knowledge/wiki/domain/speakers-ptt.md` (сейчас пустая — заполнить)
- `.ai/knowledge/wiki/domain/pinned-calls.md`

# План реализации: Goose settings + PTT на panel store

## Шаг 1: Persist + devices-store API (без UI)

- **Описание:** В `devices-store` добавить `preferredGooseId`, `gooseMode`, `goosePttScope`; load/save в localStorage; getter `preferredGoose` / `readyPreferredGoose` с fallback на первый ready goose; при rebuild модулей применять `mode`/`pttScope` к goose-устройствам (хотя бы к выбранному / ко всем goose одинаково — зафиксировать: **ко всем goose одинаковый mode/scope**, preferred только кто «дефолтный» для pinned). Default: первый goose, `stateful`, `standard`.
- **Файлы:** `src/shared/composables/state/devices-store/use-devices-store.ts`, types при необходимости, unit-тест store.
- **Ожидаемый результат:** Настройки живут в local, переживают reload; API store готов для UI и runtime.
- **Проверка:** unit-тест store / `vue-tsc`.
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 2: UI селекторов на MediaDevicePage

- **Описание:** Сверху страницы блок из 2–3 `wui-select` (паттерн MainSettings): Goose default, Mode, PTT scope (`v-if` mode === pushToTalk). Стили не полировать. Main Settings не менять.
- **Файлы:** `MediaDevicePage.vue`; при необходимости маленький composable/helpers в `entities/media-devices-settings` + public API.
- **Ожидаемый результат:** Оператор меняет выбор; значения пишутся в store/local.
- **Проверка:** ручной просмотр / `vue-tsc`.
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 3: Runtime — везде выбранный Goose

- **Описание:** Заменить `readyGooseDevices.at(0)` в pinned panel (dial/answer/audio), footer `GlobalAppMicrophoneControl`, ключевых call-card / session путях для pinned на `preferredGoose` / ready preferred. Speak sync остаётся на module выбранного устройства.
- **Файлы:** `use-pinned-calls-panel-store.ts`, `use-pinned-calls-panel-slot-actions.ts`, `GlobalAppMicrophoneControl.vue`, точечно call-card / session при pinned goose.
- **Ожидаемый результат:** Смена Goose в settings меняет фактическое устройство для завешенных и footer.
- **Проверка:** ручная на пульте с 2 goose (если есть) / review call sites.
- **Коммит после шага:** Да
- **Wiki:** Нет

## Шаг 4: activePinned PTT → panel store (без legacy) + WUI-3825

- **Описание:** В `gooseEventHandler` для `pttScope === 'activePinned'` использовать `usePinnedCallsPanelStore` (`activeSlotOrder`, session/pServed слота, override unmute только active при press, mute all/off при release). Убрать зависимость от `usePinnedCallsStore.activePinnedCall` / `startActivePinnedPushToTalkOverride` в этом пути. Гарантия WUI-3825: переключение активной линии в PTT не включает mic без press speak; line mic UI не должен обходить аппаратную кнопку в PTT activePinned.
- **Файлы:** `gooseEventHandler.ts`, `use-pinned-calls-panel-store.ts` (override helpers), при необходимости убрать/не вызывать legacy.
- **Ожидаемый результат:** PTT activePinned работает с новой сеткой; legacy не мешает.
- **Проверка:** ручной сценарий WUI-3825 на пульте; `vue-tsc`.
- **Коммит после шага:** Да
- **Wiki:** Да — `speakers-ptt.md`, правки `devices.md` / `pinned-calls.md`

## Шаг 5: Logout reset panel store

- **Описание:** В `App.vue` logout вызвать `usePinnedCallsPanelStore().reset()` рядом с legacy `$reset`.
- **Файлы:** `src/app/App.vue`
- **Ожидаемый результат:** После logout нет stale activeSlot / sessions / volume multiplier.
- **Проверка:** ручной logout/login или review.
- **Коммит после шага:** Да
- **Wiki:** Нет (если не упомянули в шаге 4)

## Out of scope

- Main Settings / conference `pushToTalkIsEnabled`.
- Persist Goose settings на backend API (позже).
- Полировка стилей Media Devices под новый дизайн.
- Миграция других виджетов на WidgetViewport.
