# Кейс: WUI-5608 — Подтверждение удаления рабочего стола

## Описание текущей части кейса

Добавить стандартную `AppModal` подтверждения перед удалением/очисткой рабочего стола из меню «Удалить» в header.

## Контекст предыдущих частей

- Планов ещё не было.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/frontend/components.md`
- Связанные страницы по workspace snapshots — при наличии в wiki.

# План реализации: confirm delete workspace

## Шаг 1: Модалка + вызов перед delete

- **Описание:**
  - Создать `DeleteWorkspaceConfirmModal.vue` в `widgets/app-header` (как `ResetMainSettingsConfirmModal`: `AppModal` + title/description/cancel/confirm через i18n).
  - Ключи локалей (ru/en/zh): например `DeleteWorkspaceConfirmTitle`, `DeleteWorkspaceConfirmDescription`, confirm = «Удалить» / существующий `Cancel`.
  - В `WorkspaceSwitchers.handleDeleteWorkspace`: `showDialog(DeleteWorkspaceConfirmModal)`; при отмене — только закрыть меню (или не трогать delete); при подтверждении — текущий `deleteWorkspaceSnapshot` + navigate.
- **Файлы для изменений:**
  - `src/widgets/app-header/ui/DeleteWorkspaceConfirmModal.vue` (новый)
  - `src/widgets/app-header/ui/WorkspaceSwitchers.vue`
  - `src/widgets/app-header/index.ts` (если нужен public export — только если принято экспортировать; иначе внутренний импорт)
  - `src/app/assets/locales/{ru-RU,en-GB,zh-CN,zh-TW}.json`
- **Ожидаемый результат:** «Удалить» → модалка; Отмена — стол не удаляется; Подтвердить — как сейчас delete + draft.
- **Проверка:** ручная в header edit menu.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет (одноразовый UI-паттерн уже есть)

## Шаг 2: Тесты WorkspaceSwitchers

- **Описание:** Обновить `WorkspaceSwitchers.test.ts`: мок `showDialog` — false → delete не вызывается; true → delete как раньше. При необходимости тонкий тест самой модалки не обязателен.
- **Файлы для изменений:** `src/widgets/app-header/ui/WorkspaceSwitchers.test.ts`
- **Ожидаемый результат:** тесты зелёные.
- **Проверка:** `vitest run …/WorkspaceSwitchers.test.ts`
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
