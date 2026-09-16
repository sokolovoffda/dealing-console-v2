# LEARN-000 — Мастер-roadmap: от Vite до звонкового MVP

## Часть плана

Карта фаз учебного приложения. Детальные шаги-коммиты — в дочерних `LEARN-001…`.  
Порядок: **каркас → стенд (auth/API/SIP) → домен звонков → UI (карточка, завешенные, ПБВ, настройки)**.

## Зависимости фаз

```text
F0 Scaffold
  └─ F1 Config + Auth + API (RTU/APS)
       └─ F2 SIP/WebRTC + call-session entity
            ├─ F3 Shared UI primitives (context-menu, layout shell)
            ├─ F4 Call card + call manager (mute/hold/speaker)
            ├─ F5 Pinned / завешенные (+ выбор audio device)
            ├─ F6 Directory/contacts (если ещё не закрыто в F1/F2)
            └─ F7 ПБВ: волна1 (группы/сетка/звонок/меню) → волна2 (layout/переносы)
                 └─ F8 Settings (устройства для завешенных)
                      └─ F9 (позже) Electron / devices
                      └─ F10 (позже) Vitest
```

---

# План: фазы и дочерние LEARN

## Шаг 0 (этот документ): согласовать roadmap

- **Зачем:** зафиксировать scope и порядок до кода.
- **Критерий готовности:** ты написал `одобряю` / `начинай` по LEARN-000; дальше стартуем `LEARN-001`.
- **Коммит после шага:** да (только `.ai/`), если хочешь зафиксировать договорённости.
- **Кто пишет код:** не применимо (только markdown).

---

## Фаза F0 — Scaffold (чистый Vite + FSD руками)

**Цель:** пустое Vue 3 + TS приложение с FSD-слоями, алиасами, Pinia, Router, lint/ts-check. Без бизнес-логики.

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-001-vite-scaffold** | Vite + Vue 3 + TS + базовые npm-скрипты | TS, tooling | `npm run dev` показывает заглушку |
| **LEARN-002-fsd-skeleton** | Слои `app/pages/widgets/features/entities/shared`, public API `index.ts`, алиасы `@/` | FSD | Импорты только через public API |
| **LEARN-003-pinia-router-shell** | Pinia, Vue Router, `App.vue`, страница-заглушка | Vue, Pinia | Навигация на `/` |
| **LEARN-004-wui-theme** | `@wui/common-library`, токены `wrkspc-*`, одна кнопка WUI | Vue, UI Kit | Тема подключена; **без i18n**, тексты на русском |

**Зависимости:** F0 → всё остальное.  
**Не входит:** auth, SIP, реальные страницы пульта.

---

## Фаза F1 — Config, Auth, API к стенду

**Цель:** как в проде (упрощённо) ходить на RTU/APS: конфиг стенда, логин, токен, базовый HTTP-клиент.

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-005-stand-config** | Env / config модуля стенда (host, пути), без хардкода секретов в коде | TS, FSD `shared`/`app` | Приложение знает, куда стучаться |
| **LEARN-006-auth-flow** | Логин, хранение сессии/токена, guard роута (упрощённо как в референсе) | Pinia, Vue | Логин → защищённый `/` |
| **LEARN-007-api-client** | HTTP-клиент + перехватчики auth; первые «проверочные» запросы профиля/ме | TS, FSD | В Network видны успешные запросы на стенд |

**Зависимости:** F0.  
**Референс (ориентир):** `.reference/src` — config, auth store, api layer (упрощать).  
**Не входит:** полный preferences sync, все эндпоинты directory.

---

## Фаза F2 — SIP / WebRTC + сущность сессии

**Цель:** регистрация SIP и жизненный цикл сессии **до** сложного UI. Проверка: исходящий/входящий через минимальный debug-UI или console/devtools actions.

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-008-jssip-init** | Подключить `@wui/jssip`, init после auth, статусы registered/failed | Pinia, lifecycle | SIP registered на стенде |
| **LEARN-009-call-session-entity** | Entity/store сессий: create/answer/hangup, базовые статусы | Pinia, TS, FSD | Сессии в store видны в Vue DevTools |
| **LEARN-010-call-controls-core** | Actions: mute, hold, (базовый) выбор output — без красивой карточки | Pinia | Управление сессией из временной панели/кнопок |

**Зависимости:** F1.  
**Референс:** `.reference/.ai/knowledge/wiki/backend-integration/sip-webrtc.md`, stores/composables звонков в `.reference/src`.  
**Не входит:** Goose/Handset, BLF batch как в Activity Monitor (можно позже точечно для ПБВ).

---

## Фаза F3 — Shared UI: shell + контекстное меню

**Цель:** общий каркас layout и **один** переиспользуемый context menu (как договорились).

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-011-app-layout-shell** | Main layout: header/content/footer-заглушки, слоты под панели | Vue, FSD `widgets`/`pages` | Каркас экрана пульта |
| **LEARN-012-context-menu** | `shared/ui/context-menu` + `useContextMenu` (по референсу, упростить) | Vue, FSD | Меню открывается на ПКМ/кнопке; API готово к переиспользованию |

**Зависимости:** F0; желательно после F1 (чтобы layout уже за логином).  
**Референс:** `.reference/src/shared/ui/context-menu/`.

---

## Фаза F4 — Call card / call manager

**Цель:** ключевые состояния карточки ближе к проду (вариант B): ringing / active / held, mute, hold, speaker/volume.

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-013-call-card-ui** | UI карточки + привязка к session entity | Vue, Pinia | Видны состояния входящий/активный |
| **LEARN-014-call-card-controls** | Mute / hold / speaker на карточке | Vue, Pinia | Кнопки меняют реальную сессию |
| **LEARN-015-call-manager-widget** | Зона call manager (стек/очередь карточек — упрощённо при необходимости) | FSD widgets | Несколько сессий отображаются согласованно |

**Зависимости:** F2, F3 (layout).  
**Референс:** `.reference/src/features/call-card`, `.reference/src/widgets/call-manager`.

---

## Фаза F5 — Завешенные (pinned) + audio device

**Цель:** панель завешенных: список, переключение, mute/hold/speaker; выбор устройства вывода для завешенных (web).

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-016-pinned-panel** | Панель завешенных, pin/unpin или эквивалент учебного сценария | Vue, Pinia | Линия в панели, переключение фокуса |
| **LEARN-017-pinned-controls** | Управление на слоте + контекстное меню (reuse LEARN-012) | Vue | Меню/кнопки на завешенной линии |
| **LEARN-018-media-devices-list** | Список устройств (MediaDevices), store выбора | Pinia, TS | Список mic/speaker в UI |
| **LEARN-019-pinned-output-device** | Привязка выбранного output к завешенным | Pinia, WebRTC | Смена устройства влияет на playback завешенных |

**Зависимости:** F2, F4 (желательно), F3.  
**Референс:** `.reference/src/widgets/pinned-calls-panel`, devices store (без Electron/Goose).

---

## Фаза F6 — Contacts / directory (минимум под ПБВ и звонок)

**Цель:** данные контактов/групп с бэка, нужные ПБВ. Если часть уже появилась в F1 — фаза сжимается.

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-020-contacts-api** | API + entity контактов/групп (`user` groups) | TS, FSD entities | Данные с стенда в store |
| **LEARN-021-contact-status-lite** | Опционально: лёгкий presence/статус, если нужен для ПБВ | Pinia | Статусы не ломают звонок |

**Зависимости:** F1; для звонка из ПБВ — F2.  
**Не входит:** полный Activity Monitor / batch BLF как в проде (можно урезать).

---

## Фаза F7 — ПБВ (две волны)

**Цель:** полноценная панель быстрого вызова (web), но **не всё сразу**.

### Волна 1 — звонок из ПБВ

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-022-qcp-shell** | Виджет/страница ПБВ: header + grid shell | Vue, FSD | Пустая сетка в layout |
| **LEARN-023-qcp-groups-tabs** | Вкладки/группы `type: user`, переключение | Pinia, Vue | Группы со стенда |
| **LEARN-024-qcp-grid-contacts** | Ячейки, карточки контактов, исходящий звонок | Vue, Pinia | Клик → реальный вызов |
| **LEARN-025-qcp-context-menu** | Меню на карточке/вкладке через shared context-menu | Vue | Те же примитивы, что у pinned |

После волны 1 ПБВ уже usable для звонков; редактирование раскладки ещё не обязательно.

### Волна 2 — layout и переносы (отдельный кусок)

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-026-qcp-layout-edit** | Режим редактирования + сохранение раскладки (fast-dial / DnD) | TS, API | Позиции сохраняются |
| **LEARN-027-qcp-group-transfer** | Перенос/дублирование между группами | TS, Pinia | Сценарий как в wiki ПБВ |

**Зависимости:** F2, F3, F6; call card желателен (F4). Волна 2 — только после волны 1.  
**Референс:** `.reference/src/widgets/quick-call-panel`, wiki `quick-call-panel.md`.

---

## Фаза F8 — Настройки (устройства)

**Цель:** страница настроек: список устройств + выбор устройства для завешенных (уже может частично жить в F5 — тогда F8 = экран настроек + полировка).

| LEARN | Тема | Фокус | Результат |
|-------|------|-------|-----------|
| **LEARN-028-settings-page** | Роут настроек, список устройств, выбор output для завешенных | Vue, Pinia | Пользователь меняет устройство в Settings |

**Зависимости:** LEARN-018/019.  
**Не входит:** все секции settings production, Goose UI.

---

## Фаза F9 — Electron / devices (позже)

Отдельный roadmap после web-MVP: Electron shell, preload/IPC, Goose/Handset. Не планируем детально в LEARN-000.

## Фаза F10 — Vitest (позже)

Учебная фаза AAA/coverage после стабилизации UI.

---

# Порядок старта дочерних задач

1. После одобрения LEARN-000 → **`старт LEARN-001-vite-scaffold`**
2. Дальше строго по зависимостям F0 → F1 → F2, затем F3∥F4…  
3. ПБВ (F7) не начинать до рабочего SIP и contacts API.  
4. Context menu (LEARN-012) — до ПБВ и до меню завешенных.

---

# Что не копируем слепо из референса

- i18n / vue-i18n — **нет**, строки на русском.
- Electron, controller WS, Goose/Handset — после MVP.
- Activity Monitor, broadcast groups, полный settings — вне текущего MVP.
- Лишние абстракции: предпочитаем понятный учебный код; если в референсе решение слабое — говорим явно и упрощаем.

---

## Критерий готовности LEARN-000

- Roadmap согласован (`одобряю`).
- `learning-scope.md` обновлён под эти решения.
- Следующая команда: `старт LEARN-001-vite-scaffold`.
