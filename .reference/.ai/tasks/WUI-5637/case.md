# WUI-5637 — Виртуальная клавиатура для текстового ввода

## Исходная задача

**Jira:** [WUI-5637](https://jira.satel.org/browse/WUI-5637) — Не открывается электронная клавиатура при вводе наименования группы на ПБВ.

На ПБВ при создании группы фокус в поле наименования не открывает виртуальную клавиатуру.

## Уточнения пользователя

- Scope шире одного бага: показать плавающую виртуальную клавиатуру в трёх местах:
  1. **ПБВ → создать группу** (`CreateGroupModal`) — баг WUI-5637
  2. **Справочник** (`PhoneBookPanel`) — поле поиска
  3. **История** (`CallHistoryPanel`) — поле поиска
- Дизайн/компонент: как на логине или выборе контактов; предпочтительно переиспользовать существующую клавиатуру.
- Клавиатура **плавающая** (не встроенная в layout как на логине / `ChangeContactsModal`).
- **История и справочник:** появление при фокусе в input, можно закрыть.
- **Создание группы:** открывается автоматически при открытии модалки; можно закрыть; можно перетащить; повторный клик/фокус в input снова открывает.

## Ограничения

- Функционал для сенсорного/киоск-сценария пульта: текстовый ввод без физической клавиатуры.
- Не менять сценарии dialpad / numpad / слайдеры громкости.
- Минимальные изменения: переиспользовать `KeyboardModal` + `KeyboardPad`, не плодить новые абстракции без нужды.
- `SearchBar` уже умеет focus → `KeyboardModal`, но нигде не используется и стили устарели относительно текущих панелей (`size="48"`).

## Связанные материалы

- Jira: https://jira.satel.org/browse/WUI-5637
- Существующие компоненты:
  - `src/shared/ui/modals/keyboard-modal/KeyboardModal.vue` — плавающая, drag, close
  - `src/features/keyboard-pad/ui/KeyboardPad.vue`
  - `src/features/search-bar/ui/SearchBar.vue` — паттерн focus → keyboard
  - `src/pages/login/ui/LoginPage.vue` — встроенный `KeyboardPad`
  - `src/shared/ui/modals/change-contacts-keyboard/ChangeContactsModal.vue` — встроенный `KeyboardPad`
- Целевые места без клавиатуры:
  - `src/widgets/quick-call-panel/ui/CreateGroupModal.vue`
  - `src/widgets/phone-book/ui/PhoneBookPanel.vue`
  - `src/widgets/call-history/ui/CallHistoryPanel.vue`
