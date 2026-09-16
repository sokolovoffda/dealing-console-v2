# Кейс: WUI-5083 — Кнопки пульта, цвета и финализация footer

## Описание текущей части кейса

Нужно локально в `dealing-console-ui` подготовить theme-токены кнопок пульта и компонент `MyBtn` поверх `WuiBtn`, не меняя `common-library`, затем перевести footer-кнопки на новый визуальный контракт и довести footer до финального вида.

## Контекст предыдущих частей

- Предыдущих планов по WUI-5083 не найдено.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/frontend/components.md` — правила использования `wui-btn` для action controls.
- `.ai/knowledge/wiki/frontend/architecture.md` — FSD-импорты и public API.
- `.ai/knowledge/wiki/frontend/testing.md` — практики focused-тестов.
- `.ai/knowledge/wiki/product/open-questions.md` — проверено, связанных открытых вопросов по WUI-5083 нет.

# План реализации: локальные кнопки пульта и финальный footer

## Шаг 1: Подготовить локальные theme-токены кнопок пульта

- **Описание:** Создать/обновить локальный registry `src/app/assets/styles/theme.css` через `@theme static`, чтобы public `--color-*` токены генерировали Tailwind utilities (`text-*`, `bg-*`, `border-*`). В `light-1.css` и `lsDark-1.css` хранить runtime-значения под `--app-color-*` внутри `.theme-light-1` / `.theme-lsDark-1`. Взять только блоки дизайнерских CSS `Кнопки. Дилинговый пульт` и `Тоглы. Дилинговый пульт`, использовать финальный формат ТЗ (`btn-neutcon`, `tog-neutcon` и т.д.) и оставить значения ссылками на палитру common-library. Не добавлять отсутствующие в дизайнерском источнике наборы, включая `callcon` alpha/toggle. Подключить `theme.css` и theme-файлы один раз после стилей common-library.
- **Файлы для изменений:** `src/app/assets/styles/theme.css`, `src/app/assets/styles/light-1.css`, `src/app/assets/styles/lsDark-1.css`, `src/app/assets/styles/index.css`.
- **Ожидаемый результат:** В приложении доступны CSS variables для кнопок и toggle пульта в темах `.theme-light-1` и `.theme-lsDark-1`; эти токены можно использовать как Tailwind utilities; `MyBtn` не владеет theme-файлами; `common-library` и `colors.css` не изменены.
- **Проверка:** `npm run ts:check`; `npm run build` для проверки CSS-импортов.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Создать локальный компонент MyBtn

- **Описание:** Создать `MyBtn` в `shared/ui`, который оборачивает `WuiBtn`, прокидывает базовые props (`size`, `icon`, `prependIcon`, `appendIcon`, `disabled`, `contentAlign`, slot и attrs) и добавляет локальные классы `my-btn`, `my-btn--button|toggle`, `my-btn--{variant}`, `my-btn--active|inactive`. CSS компонента лежит рядом с `MyBtn` и применяет public `--color-*` токены из локального `@theme static` registry. Реализовать только доступные по theme-токенам состояния: `callcon` не должен получать придуманный alpha/toggle набор; `twolinecon` использовать по доступному alpha-набору.
- **Файлы для изменений:** `src/shared/ui/my-btn/MyBtn.vue`, `src/shared/ui/my-btn/my-btn.css`, `src/shared/ui/my-btn/types.ts`, `src/shared/ui/my-btn/index.ts`, `src/shared/ui/index.ts`.
- **Ожидаемый результат:** `MyBtn` доступен через public API `@/shared/ui`, использует `WuiBtn` внутри, применяет классы поверх безопасной базы `variant="neut"` / `state="alpha"` и берёт цвета из глобальных theme-файлов приложения.
- **Проверка:** `npm run ts:check`; `npx eslint --ext .vue,.ts src/shared/ui/my-btn`.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 3: Перевести глобальные footer-controls на MyBtn

- **Описание:** Заменить прямое использование `WuiBtn` в глобальных footer controls на `MyBtn`: звук приложения, микрофон приложения и кнопка скрытия/показа header. Сохранить текущую логику dropdown громкости, muted-state и header toggle, но перевести цвета на variants/mode нового `MyBtn`.
- **Файлы для изменений:** `src/features/app-audio-controls/ui/GlobalAppVolumeControl.vue`, `src/features/app-audio-controls/ui/GlobalAppMicrophoneControl.vue`, `src/widgets/app-footer/ui/FooterGlobalControls.vue`.
- **Ожидаемый результат:** Глобальные controls footer используют единый локальный визуальный контракт `MyBtn`, без ручных `bg-card-deal...` классов для button-state.
- **Проверка:** `npm run ts:check`; `npx eslint --ext .vue,.ts` по изменённым файлам; ручная проверка muted/open/active states.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 4: Зафиналить кнопки трубок и сетку footer

- **Описание:** Перевести кнопки трубок в footer на `MyBtn` с вариантом `twolinecon` или согласованным console-вариантом, сохранить двухстрочную разметку, `prependIcon` для левой трубки и `appendIcon` для правой. Довести размеры, центрирование блока трубок, отступы между зонами footer и состояния кнопок до финального вида текущего макета.
- **Файлы для изменений:** `src/widgets/app-footer/ui/FooterHandsetControls.vue`, `src/widgets/app-footer/ui/AppFooter.vue`, при необходимости `src/widgets/app-footer/ui/AppFooterUserBlock.vue`, `src/widgets/app-footer/ui/FooterGlobalControls.vue`.
- **Ожидаемый результат:** Footer визуально собран на `MyBtn`, центральный блок трубок остаётся строго по центру, левая/правая зоны не ломают центрирование.
- **Проверка:** `npm run ts:check`; `npx eslint --ext .vue src/widgets/app-footer/ui/*.vue`; ручная проверка footer на desktop viewport.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 5: Финальные тесты и project wiki

- **Описание:** После стабилизации визуального контракта добавить или обновить focused-тесты для `MyBtn` и существующих footer controls, если тесты дают полезную защиту контракта. Обновить project wiki устойчивым знанием о локальных theme-токенах кнопок пульта и границе с `common-library`.
- **Файлы для изменений:** тесты рядом с `src/shared/ui/my-btn` и/или `src/features/app-audio-controls/test`, `.ai/knowledge/wiki/frontend/components.md`, `.ai/knowledge/wiki/log.md`, при необходимости `.ai/knowledge/wiki/index.md`.
- **Ожидаемый результат:** Есть минимальная проверка ключевого контракта `MyBtn`/controls; project wiki фиксирует, что theme-токены кнопок пульта живут локально в `dealing-console-ui`, а `common-library` остаётся источником палитры и базового `WuiBtn`.
- **Проверка:** `npm run ts:check`; targeted `vitest run` по новым/изменённым тестам; при необходимости `npm run lint` или targeted eslint.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да: `frontend/components.md`, `log.md`
