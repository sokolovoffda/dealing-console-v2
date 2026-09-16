# WUI-5608 — Окно подтверждения удаления / очистки рабочего стола

## Исходная задача

Рабочие столы очищаются/удаляются без подтверждения. Нужно окно подтверждения при нажатии «Удалить».

Jira: https://jira.satel.org/browse/WUI-5608  
Тип: Feature Request

## Уточнения пользователя

- 2026-09-07: использовать нашу **стандартную** модалку (`AppModal` / паттерн как `ResetMainSettingsConfirmModal`).

## Текущее поведение

`WorkspaceSwitchers.handleDeleteWorkspace` сразу вызывает `workspaceStore.deleteWorkspaceSnapshot` без `showDialog`.

## Что сделано

- 2026-09-07 шаг 1: `DeleteWorkspaceConfirmModal` (`AppModal`) + `showDialog` перед `deleteWorkspaceSnapshot`; локали ru/en/zh.
- 2026-09-07 шаг 2: тесты WorkspaceSwitchers — confirm / cancel модалки.

## Связанные материалы

- `src/widgets/app-header/ui/WorkspaceSwitchers.vue`
- `src/widgets/app-header/ui/DeleteWorkspaceConfirmModal.vue`
- `src/pages/main/ui/settings-page/sections/main-settings/ResetMainSettingsConfirmModal.vue` — референс
- `src/shared/ui/modals/app-modal/AppModal.vue`
