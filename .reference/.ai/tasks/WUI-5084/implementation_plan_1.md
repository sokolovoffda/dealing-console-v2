# Кейс: WUI-5084 — New Media Devices Stores

## Описание текущей части кейса

Первая часть — создать базовую основу для новых media device stores без переключения приложения на них. На этом этапе нужен узкий `devices-store-new`, который работает с браузерными аудио endpoint-устройствами из `navigator.mediaDevices.enumerateDevices()` или из мокового списка, и пустая публичная заготовка `devices-sessions-store-new` для следующих частей.

Базовый store не должен смешивать browser media devices, controller modules, IndexedDB, backend-хранение, аппаратные события и настройки логических профилей.

## Контекст предыдущих частей

- Предыдущих планов по `WUI-5084` нет.

## Связанные страницы проектной памяти

- Связанные страницы не найдены.

# План реализации: базовый store браузерных audio endpoints

## Шаг 1: Структура, типы и фильтрация audio endpoints

- **Описание:** Создать структуру новых модулей и минимальную модель браузерного аудио endpoint. Добавить чистую фильтрацию списка `MediaDeviceInfo`: оставить только `audioinput` и `audiooutput`, исключить `deviceId === 'default'`, исключить echo-cancelled варианты по label. Контроллерные модули, настройки профилей, иконки, номера кнопок и режимы не добавлять.
- **Файлы для изменений:**
  - `src/shared/composables/state/devices-store-new/types.ts`
  - `src/shared/composables/state/devices-store-new/media-device-filter.ts`
  - `src/shared/composables/state/devices-store-new/index.ts`
  - `src/shared/composables/state/devices-sessions-store-new/index.ts`
- **Ожидаемый результат:** Есть публичный API нового `devices-store-new` с типами и helper-фильтрацией; есть пустой public API для будущего `devices-sessions-store-new`; старые сторы и текущие потребители не изменены.
- **Проверка:** 
  - `npm run ts:check`
  - точечный ESLint для новых TypeScript-файлов
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет

## Шаг 2: Изолированный Pinia store и жизненный цикл загрузки устройств

- **Описание:** Добавить `useDevicesStoreNew` с минимальным состоянием доступных audio endpoints. Store должен уметь принять список устройств извне для моков, загрузить реальные устройства через `navigator.mediaDevices.enumerateDevices()`, подписаться на `devicechange` через явный `init()` и очистить подписку через `dispose()`. Не импортировать моки напрямую в production-store и не делать side effects при создании стора.
- **Файлы для изменений:**
  - `src/shared/composables/state/devices-store-new/use-devices-store-new.ts`
  - `src/shared/composables/state/devices-store-new/index.ts`
  - `src/shared/composables/index.ts`
- **Ожидаемый результат:** Новый store можно использовать изолированно: получить `audioInputs`, `audioOutputs`, общий список `audioDevices`, состояние загрузки/ошибки, обновить список из моков или из browser API. Старые сторы и приложение пока не переключены.
- **Проверка:**
  - `npm run ts:check`
  - точечный ESLint для новых TypeScript-файлов
  - ручная проверка через моковые данные из `src/__mocks_/mock-media-devices.ts` без сохранения временного bootstrap-кода
- **Коммит после шага:** Да
- **Нужно ли обновить project wiki:** Нет
