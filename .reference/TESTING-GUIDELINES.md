# Testing Guidelines - AAA Pattern & Best Practices

> **Дата:** 06 ноября 2025
> **Основано на:** Презентация "Юнит-тестирование" by Руслан Мирзоев (Premier)

---

## 📚 Содержание

1. [Философия тестирования](#-философия-тестирования)
2. [Уровни тестирования](#-уровни-тестирования)
3. [Основной принцип: AAA Pattern](#-основной-принцип-aaa-pattern)
4. [Что тестировать](#-что-тестировать)
5. [Что НЕ тестировать (Антипаттерны)](#-что-не-тестировать-антипаттерны)
6. [Тестирование Vue компонентов](#-тестирование-vue-компонентов)
7. [Работа с моками и асинхронностью](#-работа-с-моками-и-асинхронностью)
8. [Soft vs Hard Assertions](#-soft-vs-hard-assertions)
9. [Производительность тестов](#-производительность-тестов)
10. [Инструменты](#-инструменты)
11. [Покрытие кода](#-покрытие-кода)

---

## 🎯 Философия тестирования

### Зачем мы пишем тесты?

**Главная цель:** Валидация требований, а не кода!

```
❌ "Проверить, что функция работает"
✅ "Убедиться, что бизнес-требование выполняется"
```

### Честность тестов

Тесты должны быть **честными**:

- 🟢 **Зелёный тест** = Модуль работает корректно
- 🔴 **Красный тест** = Ошибка в модуле (не в тесте!)

### Принципы

1. **Тест = живая документация** - описывает поведение системы
2. **Один тест = одна концепция** - не смешивать проверки
3. **Независимость** - тесты не зависят друг от друга
4. **Быстрота** - тесты должны выполняться быстро
5. **Надёжность** - стабильные результаты при повторных запусках

---

## 📊 Уровни тестирования

```
┌─────────────────────────────────────┐
│  E2E Tests (End-to-End)             │  ← Медленные, дорогие
│  - Тестируют весь flow пользователя │
│  - Реальный браузер + API           │
└─────────────────────────────────────┘
            ↑
┌─────────────────────────────────────┐
│  Integration Tests                  │  ← Средние по скорости
│  - Взаимодействие модулей           │
│  - Реальные зависимости (частично)  │
└─────────────────────────────────────┘
            ↑
┌─────────────────────────────────────┐
│  Unit Tests ⭐                      │  ← Быстрые, дешёвые
│  - Изолированные модули             │  ← ФОКУС ЭТОГО ДОКУМЕНТА
│  - Моки для зависимостей           │
└─────────────────────────────────────┘
```

### Соотношение тестов (Test Pyramid)

```
    E2E
   ╱────╲     10%
  ╱──────╲
 ╱ Integr.╲   30%
╱──────────╲
╱   Unit    ╲  60%
──────────────
```

**Наш подход:** Больше юнит-тестов, меньше E2E!

---

## 🎯 Основной принцип: AAA Pattern

Все unit тесты должны следовать паттерну **Arrange-Act-Assert (AAA)**:

1. **Arrange** (Подготовка) - настройка тестовых данных и окружения
2. **Act** (Действие) - выполнение тестируемого кода
3. **Assert** (Проверка) - проверка результатов

### ✅ Правильный пример

```typescript
it('should create ApiError with correct properties', () => {
  // Arrange
  const message = 'Test error'
  const code = 'TEST_CODE'
  const status = 500
  const details = { foo: 'bar' }

  // Act
  const error = new ApiError(message, code, status, details)

  // Assert
  expect(error).toBeInstanceOf(Error)
  expect(error.message).toBe(message)
  expect(error.code).toBe(code)
  expect(error.status).toBe(status)
  expect(error.details).toEqual(details)
})
```

### ❌ Плохой пример (смешанные секции)

```typescript
it('should create error', () => {
  const error = new ApiError('Test', 'CODE', 500) // Act смешан с Arrange
  expect(error.message).toBe('Test') // Assert сразу
  const code = error.code // Дополнительное действие
  expect(code).toBe('CODE')
})
```

---

## ✅ Что тестировать

### 1. Бизнес-логика

**Всегда тестируем:**
- Валидацию данных
- Вычисления
- Условную логику (if/else, switch)
- Обработку ошибок
- Трансформацию данных

```typescript
// ✅ ТЕСТИРУЕМ
function calculateDiscount(price: number, userType: 'vip' | 'regular'): number {
  if (userType === 'vip') {
    return price * 0.8 // 20% скидка
  }
  return price * 0.95 // 5% скидка
}

it('should calculate VIP discount correctly', () => {
  // Arrange
  const price = 1000
  const userType = 'vip'

  // Act
  const result = calculateDiscount(price, userType)

  // Assert
  expect(result).toBe(800)
})
```

### 2. API взаимодействия

- HTTP запросы (моки axios)
- Обработка ошибок API
- Retry логика
- Interceptors

### 3. Утилиты и хелперы

- Форматирование данных
- Парсинг
- Валидаторы

### 4. Stores (Pinia)

- Actions
- Getters
- Мутации состояния

---

## ❌ Что НЕ тестировать (Антипаттерны)

### 1. Внутреннюю реализацию (Implementation Details)

```typescript
// ❌ ПЛОХО - тестируем приватные методы
it('should call _internalMethod', () => {
  const spy = vi.spyOn(service, '_internalMethod')
  service.publicMethod()
  expect(spy).toHaveBeenCalled()
})

// ✅ ХОРОШО - тестируем публичное API
it('should return correct result', () => {
  const result = service.publicMethod()
  expect(result).toBe(expectedValue)
})
```

### 2. Библиотеки и фреймворки

```typescript
// ❌ ПЛОХО - тестируем Vue
it('reactive works', () => {
  const state = reactive({ count: 0 })
  state.count++
  expect(state.count).toBe(1) // Тестируем Vue!
})

// ✅ ХОРОШО - тестируем нашу логику
it('should increment counter', () => {
  const store = useCounterStore()
  store.increment()
  expect(store.count).toBe(1)
})
```

### 3. Тривиальный код

```typescript
// ❌ НЕ НУЖНО - тривиальный getter
it('should return name', () => {
  const user = { name: 'John' }
  expect(user.name).toBe('John')
})

// ✅ НУЖНО - геттер с логикой
it('should return full name', () => {
  const user = { firstName: 'John', lastName: 'Doe' }
  expect(getFullName(user)).toBe('John Doe')
})
```

### 4. Константы и типы

```typescript
// ❌ НЕ НУЖНО
it('API_URL is correct', () => {
  expect(API_URL).toBe('/api')
})

// TypeScript проверит типы без тестов
```

### 5. Избыточные моки

```typescript
// ❌ ПЛОХО - всё замокано, тестируем моки
it('should work', () => {
  const mockFn = vi.fn().mockReturnValue(true)
  const mockObj = { method: mockFn }
  expect(mockObj.method()).toBe(true) // Бессмысленно!
})

// ✅ ХОРОШО - мокаем только внешние зависимости
it('should call API with correct params', () => {
  mock.onPost('/users').reply(201, { id: 1 })
  const result = await createUser({ name: 'John' })
  expect(result.id).toBe(1)
})
```

---

## 🎨 Тестирование Vue компонентов

### Что тестировать в компонентах

```typescript
import { mount } from '@vue/test-utils'

describe('AButton.vue', () => {
  // 1. Рендеринг по умолчанию
  it('should render with default props', () => {
    // Arrange
    const wrapper = mount(AButton)

    // Act & Assert
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.classes()).toContain('a-button--medium') // размер по умолчанию
  })

  // 2. Props
  it('should apply disabled class when disabled', () => {
    // Arrange
    const wrapper = mount(AButton, {
      props: { disabled: true }
    })

    // Act & Assert
    expect(wrapper.classes()).toContain('a-button--disabled')
  })

  // 3. Атрибуты
  it('should set tabindex to 0 by default', () => {
    // Arrange
    const wrapper = mount(AButton)

    // Act
    const tabindex = wrapper.attributes('tabindex')

    // Assert
    expect(tabindex).toBe('0')
  })

  // 4. aria-label
  it('should set aria-label from text prop', () => {
    // Arrange
    const text = 'Click me'
    const wrapper = mount(AButton, {
      props: { text }
    })

    // Act
    const ariaLabel = wrapper.attributes('aria-label')

    // Assert
    expect(ariaLabel).toBe(text)
  })

  // 5. События
  it('should emit click event', async () => {
    // Arrange
    const wrapper = mount(AButton)

    // Act
    await wrapper.trigger('click')

    // Assert
    expect(wrapper.emitted()).toHaveProperty('click')
  })

  // 6. Disabled состояние
  it('should not emit click when disabled', async () => {
    // Arrange
    const wrapper = mount(AButton, {
      props: { disabled: true }
    })

    // Act
    await wrapper.trigger('click')

    // Assert
    expect(wrapper.emitted()).not.toHaveProperty('click')
  })

  // 7. Слоты
  it('should render slot content', () => {
    // Arrange
    const slotContent = 'Button Text'
    const wrapper = mount(AButton, {
      slots: {
        default: slotContent
      }
    })

    // Act
    const text = wrapper.text()

    // Assert
    expect(text).toContain(slotContent)
  })

  // 8. Условный рендеринг
  it('should display icon on the left by default', () => {
    // Arrange
    const wrapper = mount(AButton, {
      props: { icon: 'icon-card' }
    })

    // Act
    const icon = wrapper.find('.a-button__icon')
    const iconPosition = wrapper.find('.a-button__icon--left')

    // Assert
    expect(icon.exists()).toBe(true)
    expect(iconPosition.exists()).toBe(true)
  })

  // 9. Параметризованные тесты
  it.each([
    ['small', 'a-button--small'],
    ['medium', 'a-button--medium'],
    ['large', 'a-button--large'],
  ])('should apply %s size class', (size, expectedClass) => {
    // Arrange & Act
    const wrapper = mount(AButton, {
      props: { size }
    })

    // Assert
    expect(wrapper.classes()).toContain(expectedClass)
  })
})
```

### Компоненты с состоянием (loading, error)

```typescript
it('should show loading state', () => {
  // Arrange
  const wrapper = mount(WSubscriptions, {
    props: { isLoading: true }
  })

  // Act
  const skeleton = wrapper.find('.skeleton')

  // Assert
  expect(skeleton.exists()).toBe(true)
})
```

---

## 🔧 Работа с моками и асинхронностью

### 1. Мок функций (vi.fn)

```typescript
it('should call callback with result', () => {
  // Arrange
  const callback = vi.fn()
  const data = { test: 'value' }

  // Act
  processData(data, callback)

  // Assert
  expect(callback).toHaveBeenCalledWith(data)
  expect(callback).toHaveBeenCalledTimes(1)
})
```

### 2. Мок модулей

```typescript
// Arrange - в начале файла
vi.mock('@/composables/useOffers', () => ({
  useOffers: vi.fn(() => ({
    offers: ref([]),
    showTariff: vi.fn()
  }))
}))

it('should call showTariff with correct params', () => {
  // Arrange
  const { showTariff } = useOffers()
  const wrapper = mount(WSubscriptions)

  // Act
  wrapper.find('.tariff-card').trigger('click')

  // Assert
  expect(showTariff).toHaveBeenCalledWith('premium')
})
```

### 3. Асинхронность (nextTick)

```typescript
it('should update UI after state change', async () => {
  // Arrange
  const wrapper = mount(MyComponent)

  // Act
  await wrapper.find('button').trigger('click')
  await nextTick() // Ждём обновления DOM

  // Assert
  expect(wrapper.find('.success').exists()).toBe(true)
})
```

### 4. Fake Timers

```typescript
describe('Auto-save feature', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should save after 3 seconds', async () => {
    // Arrange
    const saveSpy = vi.fn()
    const wrapper = mount(Editor, {
      props: { onSave: saveSpy }
    })

    // Act
    await wrapper.find('input').setValue('New text')
    vi.advanceTimersByTime(3000)

    // Assert
    expect(saveSpy).toHaveBeenCalled()
  })
})
```

### 5. Mock axios-mock-adapter

```typescript
it('should fetch user data', async () => {
  // Arrange
  const mockData = { id: 1, name: 'John' }
  mock.onGet('/users/1').reply(200, mockData)

  // Act
  const result = await api.get('/users/1')

  // Assert
  expect(result).toEqual(mockData)
})
```

---

## 💎 Soft vs Hard Assertions

### Hard Assertions (по умолчанию)

```typescript
it('validates user data', () => {
  const user = { name: 'John', age: 25, email: 'john@example.com' }

  expect(user.name).toBe('John')
  expect(user.age).toBe(25) // ❌ Если упадёт - дальше не проверится
  expect(user.email).toContain('@') // НЕ ВЫПОЛНИТСЯ
})
```

### Soft Assertions (продолжает при ошибке)

```typescript
it('validates user data with soft assertions', () => {
  // Arrange
  const user = { name: 'John', age: 25, email: 'john@example.com' }

  // Act & Assert
  expect.soft(user.name).toBe('John')
  expect.soft(user.age).toBe(25) // ❌ Упадёт, но продолжит
  expect.soft(user.email).toContain('@') // ✅ ВЫПОЛНИТСЯ
})
```

**Когда использовать:**
- ✅ **Soft** - для независимых проверок объекта
- ✅ **Hard** - для зависимых проверок (если одна упала - остальные бессмысленны)

---

## ⚡ Производительность тестов

### 1. Изоляция тестов

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    isolate: false, // ⚠️ Быстрее, но тесты делят контекст
    // isolate: true (по умолчанию) - медленнее, но безопаснее
  }
})
```

**Когда использовать `isolate: false`:**
- Тесты независимы
- Нет глобальных side-effects
- Скорость критична

### 2. Параллельные тесты

```typescript
// По умолчанию describe запускается последовательно
describe('API tests', () => {
  // Параллельный запуск внутри describe
  it.concurrent('test 1', async () => { /* ... */ })
  it.concurrent('test 2', async () => { /* ... */ })
  it.concurrent('test 3', async () => { /* ... */ })
})
```

### 3. Шардинг (для CI/CD)

```bash
# Разделить тесты на 4 части и запустить 1-ю
vitest --shard=1/4

# В CI можно распараллелить:
# Job 1: vitest --shard=1/4
# Job 2: vitest --shard=2/4
# Job 3: vitest --shard=3/4
# Job 4: vitest --shard=4/4
```

### 4. Кэширование

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    cache: {
      dir: 'node_modules/.vitest'
    }
  }
})
```

### 5. Профайлинг

```bash
# Найти медленные тесты
vitest --reporter=verbose

# С таймингами
vitest --reporter=tap
```

### 6. Оптимизация setup/teardown

```typescript
// ❌ МЕДЛЕННО - создаём store в каждом тесте
it('test 1', () => {
  const store = createPinia()
  // ...
})

it('test 2', () => {
  const store = createPinia()
  // ...
})

// ✅ БЫСТРО - переиспользуем
describe('Store tests', () => {
  let store: ReturnType<typeof createPinia>

  beforeAll(() => {
    store = createPinia()
  })

  afterEach(() => {
    // Очищаем состояние, но не пересоздаём
    store.state.value = {}
  })

  it('test 1', () => { /* use store */ })
  it('test 2', () => { /* use store */ })
})
```

---

## 🛠️ Инструменты

### Основной стек

```json
{
  "devDependencies": {
    "vitest": "^2.1.8",           // Test runner
    "@vue/test-utils": "^2.4.6",  // Vue компоненты
    "axios-mock-adapter": "^2.1.0", // HTTP моки
    "@vitest/coverage-v8": "^2.1.8", // Coverage
    "@vitest/ui": "^2.1.8",       // UI для тестов
    "jsdom": "^25.0.1"            // DOM окружение
  }
}
```

### Команды

```bash
# Watch mode
npm test

# Однократный запуск
npm run test:run

# UI интерфейс
npm run test:ui

# Coverage
npm run test:coverage

# Только изменённые файлы
vitest --changed

# Обновить снапшоты
vitest -u
```

---

## 📊 Покрытие кода

### Требования

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,      // ≥80% строк
        functions: 80,  // ≥80% функций
        branches: 80,   // ≥80% веток
        statements: 80, // ≥80% операторов
      },
      exclude: [
        'node_modules/',
        '**/__tests__/**',
        '**/*.spec.ts',
        '**/types.ts',
        '**/*.d.ts',
      ]
    }
  }
})
```

### Стратегия покрытия

1. **Новый код** - 100% покрытие сразу
2. **Рефакторинг** - добавить тесты перед изменением
3. **Баги** - сначала тест, потом фикс
4. **Legacy** - постепенно повышать покрытие

### Что НЕ включать в coverage

- Типы и интерфейсы
- Константы
- Конфигурационные файлы
- Сгенерированный код

---

## 📋 Чек-лист для Code Review

### Обязательно проверить:

- [ ] Все тесты используют AAA pattern с комментариями
- [ ] Нет magic values (всё в переменных с именами)
- [ ] Один тест = одна концепция
- [ ] Имена тестов в формате "should [действие] [условие]"
- [ ] Нет тестирования implementation details
- [ ] Нет тестирования библиотек (Vue, Pinia, axios)
- [ ] Моки используются только для внешних зависимостей
- [ ] Используется beforeEach/afterEach для cleanup
- [ ] Async тесты используют async/await
- [ ] Coverage ≥80%

### Дополнительно:

- [ ] Параметризованные тесты (it.each) где уместно
- [ ] Soft assertions для независимых проверок
- [ ] Fake timers для работы с таймерами
- [ ] Тесты быстрые (<100ms на тест)

---

## 🎓 Примеры из проекта

### API Client (Unit тесты)

Смотрите реальные примеры AAA pattern в:

- `src/shared/lib/api/__tests__/errors.spec.ts` - классы ошибок
- `src/shared/lib/api/__tests__/utils.spec.ts` - утилиты с fake timers
- `src/shared/lib/api/__tests__/client.spec.ts` - HTTP клиент с моками

### Vue компоненты (будущие примеры)

```typescript
// src/shared/components/__tests__/w-button.spec.ts
import { mount } from '@vue/test-utils'
import WButton from '../w-button.vue'

describe('WButton.vue', () => {
  it('should render with default props', () => {
    // Arrange
    const wrapper = mount(WButton)

    // Act & Assert
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.classes()).toContain('w-button')
  })

  it('should emit click event when enabled', async () => {
    // Arrange
    const wrapper = mount(WButton)

    // Act
    await wrapper.trigger('click')

    // Assert
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('should not emit click when disabled', async () => {
    // Arrange
    const wrapper = mount(WButton, {
      props: { disabled: true }
    })

    // Act
    await wrapper.trigger('click')

    // Assert
    expect(wrapper.emitted()).not.toHaveProperty('click')
  })
})
```

---

## 🔗 Дополнительные ресурсы

### Документация

- [Vitest Best Practices](https://vitest.dev/guide/best-practices.html)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [AAA Pattern by Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles)

### Презентации

- **"Юнит-тестирование"** by Руслан Мирзоев (Premier) - основа этого документа

---

## 📝 История изменений

**2025-11-06** - Расширенная версия
- Добавлена философия тестирования (валидация требований)
- Добавлены антипаттерны (что НЕ тестировать)
- Добавлен раздел по Vue компонентам
- Добавлены Soft vs Hard assertions
- Добавлен раздел по производительности
- Добавлены примеры параметризованных тестов (it.each)

**2025-11-06** - Первая версия
- Базовый AAA Pattern
- Примеры для API Client
- Работа с моками и async

---

**Создано:** 06 ноября 2025  
**Основано на:** Презентация Руслана Мирзоева + практики индустрии
