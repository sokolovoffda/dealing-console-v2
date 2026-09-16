# Кейс: WUI-5596 — Не принимается входящий при клике по карточке ПБВ

## Описание текущей части кейса

Клик по карточке контакта (ПБВ / shared `ContactCard`) при входящей сессии должен принимать вызов на нужное устройство (goose для завешенных, handset для обычных) и открывать call-card; при отсутствии устройства — toast, без «тихого» только-открытия входящего.

## Контекст предыдущих частей

- Планов ещё не было.

## Связанные страницы проектной памяти

- `.ai/knowledge/wiki/domain/quick-call-panel.md`
- `.ai/knowledge/wiki/domain/calls.md`
- `.ai/knowledge/wiki/domain/pinned-calls.md`
- `.ai/knowledge/wiki/domain/devices.md`

# План реализации: accept входящего с карточки ПБВ

## Шаг 1: `useContactCardCall` — answer на входящий + toast без устройства

- **Описание:** В `toggleCall` / `callPinnedPanelContact` при существующей входящей сессии (`RINGING` / incoming view):
  - **pinned:** по аналогии с `answerPinnedSession` — если нет `readyPreferredGoose` → `showNotification` (тот же ключ `ScenarioContactViewCardDeviceCheckMessage`), не делать вид что вызов принят; если goose есть → `session.answer(..., goose)` + открыть pinned call-card (`openPinnedPanelSession`) / bind.
  - **не pinned:** если нет доступной трубки → toast; если есть → answer на preferred/available handset (логика как `answerSelectedSession`: hold активной на трубке при необходимости) + `openSessionInPreferredHandset`.
  - Для уже установленной сессии (не incoming): сохранить текущее поведение open + `switchToCall` / open handset (без повторного answer).
  - Исходящий новый звонок — без регрессии.
- **Файлы для изменений:** `src/features/contact-card/model/use-contact-card-call/use-contact-card-call.ts` (+ при необходимости тонкий shared helper рядом, без копипасты mediaConstraints).
- **Ожидаемый результат:** клик по входящему на ПБВ принимает вызов на goose/трубку или показывает уведомление.
- **Проверка:** ручная по сценарию Jira; unit на `ContactCard` / `use-contact-card-call` (incoming + device / без device).
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да — `domain/quick-call-panel.md` (и при необходимости `calls.md`): клик по входящему = answer + open, без устройства = toast.

## Шаг 2: Тесты + выравнивание wiki

- **Описание:** Обновить/добавить тесты клика: incoming pinned с goose → answer; без goose → notification, без answer; ordinary incoming с handset → answer; без handset → notification. Синхронизировать wiki с фактическим контрактом (убрать «можно открыть call-card без goose» для **входящего** accept-пути, если так решим в шаге 1).
- **Файлы для изменений:** `src/features/contact-card/test/ContactCard.test.ts` (и/или unit на composable); `.ai/knowledge/wiki/domain/quick-call-panel.md`, `log.md`.
- **Ожидаемый результат:** тесты зелёные; wiki отражает ОР Jira.
- **Проверка:** точечный vitest по contact-card.
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Да (если не сделали в шаге 1).
