# Исследование: Доработка lightweight-charts до уровня Advanced Charting Library с поддержкой Pine Script

## Дата исследования: 2025-01-18

---

## 1. Краткое резюме

**Вердикт:** Доработка **возможна**, но потребует значительных усилий (3-6 месяцев). Существуют готовые open-source решения для транспиляции Pine Script в JavaScript.

**Ключевые находки:**
- TradingView Charting Library **не поддерживает Pine Script** напрямую - только JavaScript custom indicators
- Существуют два open-source транспилера Pine Script → JavaScript
- Lightweight-charts имеет систему плагинов для кастомных индикаторов
- Полная совместимость с Pine Script v5/v6 достижима

---

## 2. Сравнение библиотек

### 2.1 TradingView Charting Library (Commercial)

| Характеристика | Значение |
|----------------|----------|
| Лицензия | Коммерческая (бесплатная для публичных сайтов) |
| Pine Script | **НЕ поддерживается** напрямую |
| Custom Indicators | JavaScript API |
| Встроенные индикаторы | 100+ |
| Drawing Tools | Есть |
| Мульти-панели | Есть |
| Исходный код | Закрытый |

> **Важно:** Из официальной документации: *"You can create your custom indicators in JavaScript. Note that Pine Script® is not supported in the libraries."*

### 2.2 Lightweight-Charts (Open Source)

| Характеристика | Значение |
|----------------|----------|
| Лицензия | Apache 2.0 (полностью свободная) |
| Pine Script | Нет (требуется интеграция) |
| Custom Indicators | JavaScript + Plugin API |
| Встроенные индикаторы | 0 (нужно реализовывать) |
| Drawing Tools | Базовые (через плагины) |
| Мульти-панели | Есть (с версии 4.0) |
| Исходный код | Открытый (GitHub) |
| Размер | ~44KB gzip |

---

## 3. Open-Source решения для Pine Script

### 3.1 PineTS (Рекомендуется)

**Репозиторий:** https://github.com/QuantForgeOrg/PineTS

**Возможности:**
- Транспиляция Pine Script v5+ в TypeScript/JavaScript
- 1:1 синтаксическая совместимость с Pine Script
- Работает в браузере и Node.js
- Runtime для исполнения скомпилированного кода
- Открытый исходный код

**Пример использования:**
```typescript
import { PineTS } from '@vibetrader/pinets';

// Pine Script код
const pineCode = `
//@version=5
indicator("My MA", overlay=true)
length = input(14)
ma = ta.sma(close, length)
plot(ma, color=color.blue)
`;

// Транспиляция и исполнение
const pineTS = new PineTS();
const indicator = await pineTS.compile(pineCode);
const result = indicator.calculate(ohlcvData);
```

**Статус:** Активно развивается (2024-2025)

### 3.2 Pine Transpiler

**Репозиторий:** https://github.com/Opus-Aether-AI/pine-transpiler

**Возможности:**
- Транспиляция Pine Script v5/v6 в JavaScript
- Zero dependencies
- Поддержка основных конструкций Pine

**Особенности:**
- Специально создан для интеграции с TradingView Charting Library
- Преобразует Pine в стандартные JavaScript объекты
- Поддержка индикаторов для Charting Library

**Пример:**
```javascript
import { transpile } from 'pine-transpiler';

const pineScript = `
//@version=5
indicator("RSI", overlay=false)
rsiValue = ta.rsi(close, 14)
plot(rsiValue)
`;

const jsCode = transpile(pineScript);
// -> Готовый JavaScript код
```

### 3.3 OpenPineScript

**Репозиторий:** https://github.com/be-thomas/OpenPineScript

**Возможности:**
- Open-source runtime для Pine Script
- Бесплатная и расширяемая платформа
- Экспериментальная поддержка

---

## 4. Архитектура решения для CITARION

### 4.1 Предлагаемая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    CITARION Chart System                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Pine Script │───▶│  Transpiler  │───▶│   JavaScript  │  │
│  │   Editor    │    │   (PineTS)   │    │    Runtime    │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│                                                   │         │
│                                                   ▼         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Lightweight-Charts Core                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │ Candles │ │ Volume  │ │ Indica- │ │  Plugin  │  │   │
│  │  │ Series  │ │ Series  │ │ tors    │ │   API    │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Local Indicator Storage                 │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │   │
│  │  │ Pine Code  │ │ JS Cache   │ │ User Settings  │  │   │
│  │  │ (Database) │ │ (IndexedDB)│ │ (LocalStorage) │  │   │
│  │  └────────────┘ └────────────┘ └────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Компоненты системы

#### A. Pine Script Editor
- Monaco Editor с подсветкой синтаксиса Pine
- Автодополнение для функций Pine
- Валидация кода в реальном времени
- Preset шаблоны популярных индикаторов

#### B. Transpiler Module
- Интеграция PineTS для транспиляции
- Кэширование скомпилированных индикаторов
- Hot-reload при изменении кода

#### C. Chart Integration
- Plugin API lightweight-charts для кастомных серий
- Overlay индикаторы (на основном графике)
- Pane индикаторы (в отдельной панели)
- Мульти-панельный режим

#### D. Local Storage
- Prisma schema для хранения Pine Script кода
- IndexedDB для кэша скомпилированных индикаторов
- Import/Export в формате Pine

---

## 5. План реализации

### Фаза 1: Базовая интеграция (2-3 недели)
1. Интеграция PineTS/npm пакет
2. Создание API endpoint для транспиляции
3. Базовый UI для редактора Pine Script
4. Простой рендеринг одного индикатора

### Фаза 2: Хранение и управление (2 недели)
1. Database schema для Pine Script
2. UI для управления индикаторами
3. Import/Export функционал
4. Кэширование скомпилированного кода

### Фаза 3: Расширенные функции (3-4 недели)
1. Мульти-панельные графики
2. Overlay + Pane индикаторы
3. Параметры индикаторов (input())
4. Style настройки (цвета, толщина линий)

### Фаза 4: Продвинутые возможности (4-6 недель)
1. Alerts на основе индикаторов
2. Backtesting интеграция
3. Стратегии (strategy.* функции)
4. Мульти-таймфрейм анализ

---

## 6. Оценка трудозатрат

| Компонент | Сложность | Время |
|-----------|-----------|-------|
| PineTS интеграция | Средняя | 1 неделя |
| Pine Editor UI | Средняя | 1 неделя |
| Database schema | Низкая | 2 дня |
| Chart Plugin API | Высокая | 2 недели |
| Мульти-панели | Высокая | 2 недели |
| Parameters UI | Средняя | 1 неделя |
| Import/Export | Низкая | 3 дня |
| Alerts system | Высокая | 2 недели |
| **Итого** | | **8-10 недель** |

---

## 7. Риски и ограничения

### 7.1 Технические ограничения

| Ограничение | Влияние | Решение |
|-------------|---------|---------|
| Не все функции Pine реализованы в PineTS | Среднее | Дополнить runtime своими реализациями |
| request.security() требует внешних данных | Высокое | Загрузка данных из нашего API |
| Стратегии (strategy.*) сложны | Среднее | Ограничить поддержку на первом этапе |
| array.* функции могут не работать | Низкое | Проверить совместимость |

### 7.2 Лицензионные риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| PineTS меняет лицензию | Низкая | Fork проекта |
| TradingView патентует API | Низкая | Используем open-source транспилеры |
| Изменения в Pine v6/v7 | Средняя | Следить за обновлениями PineTS |

---

## 8. Альтернативные подходы

### 8.1 Использование TradingView Charting Library

**Плюсы:**
- Готовые 100+ индикаторов
- Professional drawing tools
- Официальная поддержка

**Минусы:**
- Нет Pine Script (только JS)
- Коммерческая лицензия
- Закрытый код
- Требует публичного доступа к сайту

### 8.2 Написание индикаторов напрямую на JS/TS

**Плюсы:**
- Полный контроль
- Нет зависимостей
- Меньше overhead

**Минусы:**
- Нет совместимости с Pine
- Нужно писать с нуля
- Нет доступа к сообществу TradingView

### 8.3 Гибридный подход (Рекомендуется)

1. **Базовые индикаторы** - написать на JS (SMA, EMA, RSI, MACD, BB)
2. **Кастомные индикаторы** - Pine Script через PineTS
3. **Хранение** - База данных с кодом индикаторов

---

## 9. Выводы и рекомендации

### 9.1 Возможность реализации

✅ **Реализуемо** - существуют готовые open-source инструменты

### 9.2 Рекомендуемый подход

1. **Начать с PineTS** - наиболее зрелый проект
2. **Создать слой абстракции** - для будущей замены транспилера
3. **Реализовать поэтапно** - от простых индикаторов к сложным

### 9.3 Первые шаги

1. Установить и протестировать PineTS
2. Создать PoC с одним простым индикатором (SMA)
3. Оценить покрытие функций Pine
4. Принять решение о полномасштабной разработке

---

## 10. Ссылки на ресурсы

### Open-Source проекты
- **PineTS:** https://github.com/QuantForgeOrg/PineTS
- **Pine Transpiler:** https://github.com/Opus-Aether-AI/pine-transpiler
- **OpenPineScript:** https://github.com/be-thomas/OpenPineScript

### Lightweight-Charts
- **GitHub:** https://github.com/tradingview/lightweight-charts
- **Docs:** https://tradingview.github.io/lightweight-charts
- **Plugins:** https://tradingview.github.io/lightweight-charts/docs/plugins/intro
- **Indicator Examples:** https://github.com/tradingview/lightweight-charts/tree/master/indicator-examples

### TradingView Docs
- **Charting Library:** https://www.tradingview.com/charting-library-docs/
- **Custom Studies:** https://www.tradingview.com/charting-library-docs/latest/custom_studies
- **Pine Script:** https://www.tradingview.com/pine-script-docs/

---

**Статус:** Исследование завершено. Ожидаю решения о начале реализации.
