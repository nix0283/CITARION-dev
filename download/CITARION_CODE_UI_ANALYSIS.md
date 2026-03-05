# CITARION - Анализ расхождений между кодом и UI

**Дата:** 2025-01-16
**Версия:** 1.0.0

---

## 📊 Сводка

| Категория | В коде | В UI | Расхождение |
|-----------|--------|------|-------------|
| API Endpoints | 29 | ~15 используемых | **14 не используются** |
| Боты | 5 типов | 3 менеджера | **2 бота без UI** |
| Сервисы | 15+ | ~8 используемых | **7+ скрыты** |
| Модели Prisma | 35+ | ~20 используемых | **15+ без UI** |

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. Argus Bot - НЕТ UI

**Статус:** ❌ КРИТИЧНО

**Что есть в коде:**
- `/src/lib/argus-bot.ts` - Полная реализация
- `/src/app/api/bots/argus/route.ts` - API endpoint
- Prisma модель `ArgusBot` с полями для Market Forecast интеграции
- Pump/Dump детекция, orderbook анализ, market cap фильтрация

**Чего нет в UI:**
- Нет компонента `ArgusBotManager.tsx`
- Нет вкладки в sidebar для Argus
- Нет виджета активных Argus ботов на дашборде

**Решение:**
```typescript
// Нужно создать:
// 1. src/components/bots/argus-bot-manager.tsx
// 2. Добавить в sidebar.tsx: { id: "argus-bot", label: "Аргус (P&D)", icon: Eye }
// 3. Добавить в page.tsx case "argus-bot": return <ArgusBotManager />;
// 4. Создать src/components/dashboard/active-argus-bots.tsx
```

---

### 2. Oracle Bot - НЕТ UI

**Статус:** ❌ КРИТИЧНО

**Что есть в коде:**
- `/src/lib/oracle-bot/` - Полный модуль (types, forecast-service, index)
- `/src/app/api/bots/oracle/route.ts` - API endpoint
- Market Forecast: ROC, ATR, EMA, Volume, Correlations
- 4 стратегии: basic, multi_tp, trailing, reentry_24h
- 4 профиля риска: easy, normal, hard, scalper
- Backtest engine

**Чего нет в UI:**
- Нет компонента `OracleBotManager.tsx`
- Нет виджета прогноза рынка
- ChatBot называется "Оракул" но это просто парсер сигналов

**Решение:**
```typescript
// Нужно создать:
// 1. src/components/bots/oracle-bot-manager.tsx
// 2. src/components/dashboard/market-forecast-widget.tsx
// 3. Переименовать ChatBot или создать отдельный Market Forecast UI
```

---

### 3. Market Forecast Service - Не интегрирован

**Статус:** ⚠️ ВАЖНО

**Что есть в коде:**
- `/src/lib/market-forecast.ts` - Полный сервис прогнозирования
- Интеграция с Argus Bot через `applyForecastBoost()`
- Поля в ArgusBot: `useMarketForecast`, `forecastBoostSignals`, `forecastWeight`

**Чего нет в UI:**
- Нет переключателя для включения Market Forecast в Argus
- Нет отображения текущего прогноза
- Нет настроек weight/confirmation

---

### 4. Notifications - Пустая страница

**Статус:** ⚠️ ВАЖНО

**Что есть в коде:**
- `/src/lib/notification-service.ts` - Полный сервис
- SSE endpoint `/api/notifications` - Real-time уведомления
- Типы: TP, SL, EXTERNAL_POSITION, WARNING, ERROR

**Чего нет в UI:**
- Вкладка "Уведомления" показывает только placeholder текст
- Нет списка уведомлений
- Нет настроек уведомлений

**Решение:**
```typescript
// Нужно создать:
// src/components/notifications/notifications-panel.tsx
// с списком уведомлений и настройками
```

---

### 5. Funding Rate - Скрытая функциональность

**Статус:** ⚠️ СРЕДНИЙ ПРИОРИТЕТ

**Что есть в коде:**
- `/src/lib/funding.ts` - WebSocket + REST API
- Prisma модели: `FundingRateHistory`, `FundingPayment`
- Расчёт funding для позиций

**Чего нет в UI:**
- Нет виджета Funding Rate
- Нет отображения в PositionsTable
- Нет истории funding платежей

---

## 🟡 СРЕДНИЕ ПРОБЛЕМЫ

### 6. OHLCV Data - Не используется полностью

**Что есть:**
- `/src/lib/ohlcv.ts` - Сервис хранения свечей
- `/src/app/api/ohlcv/route.ts` - API endpoint
- Prisma модель `OhlcvCandle`

**Проблема:**
- Нет UI для просмотра исторических данных
- Нет интеграции с индикаторами из `/src/lib/indicators.ts`

---

### 7. Indicators - Не отображаются

**Что есть:**
- `/src/lib/indicators.ts` - RSI, MACD, Bollinger Bands, EMA, SMA

**Проблема:**
- Индикаторы не используются нигде в UI
- BB Bot использует свои индикаторы из BBotTimeframeConfig

---

### 8. User Data Stream - Без UI

**Что есть:**
- `/src/lib/user-data-stream.ts` - Binance User Data Stream
- Listen key management, account updates, order updates

**Проблема:**
- Не интегрирован в UI
- Нет индикатора real-time статуса

---

### 9. Position Monitor - Скрытый

**Что есть:**
- `/src/lib/position-monitor.ts` - Мониторинг позиций
- TP/SL триггеры, уведомления

**Проблема:**
- Работает через cron, но нет UI для мониторинга
- Нет логов срабатываний

---

### 10. Telegram Integration - Частично скрыта

**Что есть:**
- `/src/lib/telegram-bot.ts`, `/src/lib/telegram-bot-v2.ts`
- `/src/app/api/telegram/*` - 3 endpoints
- Inline кнопки, команды

**Проблема:**
- Нет UI для настройки Telegram
- Нет отображения статуса бота
- Нет списка подключённых чатов

---

## 🟢 МИНОРНЫЕ ПРОБЛЕМЫ

### 11. API Monitor

**Что есть:**
- `/src/lib/exchange/api-monitor.ts` - Rate limiting tracking

**Проблема:**
- Не отображается в UI
- Нет предупреждений о rate limits

---

### 12. Exchange WebSocket

**Что есть:**
- `/src/lib/exchange-websocket.ts` - WebSocket connections

**Проблема:**
- Используется через PriceProvider, но нет детального статуса

---

### 13. Daily Stats

**Что есть:**
- Prisma модель `DailyStats` - Агрегированная статистика

**Проблема:**
- Не используется в аналитике

---

### 14. Signal ID Counter

**Что есть:**
- Prisma модель `SignalIdCounter` - Cornix-style IDs

**Проблема:**
- Не отображается в Signal Feed

---

### 15. Multiple Exchange Types

**Что есть:**
- Поддержка spot, futures, inverse для всех бирж
- Testnet/demo режимы

**Проблема:**
- UI показывает только futures по умолчанию
- Нет переключателя market type в ExchangeSelector

---

## 📋 Обратные проблемы (UI без Backend)

### 1. "Кошелёк" вкладка

**Проблема:**
- Показывает только BalanceWidget и MarketOverview
- Нет реального кошелька с депозитами/выводами
- Нет истории транзакций

---

### 2. "Справка" вкладка

**Проблема:**
- Статический текст
- Нет ссылки на документацию
- Нет видео-туториалов

---

## 🔧 Рекомендуемый план исправлений

### Приоритет 1 (Критично):
1. ✅ Создать `ArgusBotManager.tsx` и добавить в sidebar
2. ✅ Создать `OracleBotManager.tsx` для Market Forecast
3. ✅ Создать `MarketForecastWidget.tsx` для дашборда
4. ✅ Реализовать полноценную страницу уведомлений

### Приоритет 2 (Важно):
5. Добавить Funding Rate виджет
6. Интегрировать OHLCV и индикаторы в UI
7. Создать UI для Telegram настроек
8. Добавить переключатель market type (spot/futures)

### Приоритет 3 (Улучшения):
9. API Monitor виджет
10. Логи Position Monitor
11. Daily Stats в аналитике
12. Детальный статус WebSocket подключений

---

## 📊 Статистика файлов

| Тип | Всего | Используется | Не используется |
|-----|-------|--------------|-----------------|
| API Routes | 29 | 15 (52%) | 14 (48%) |
| Lib Services | 20 | 10 (50%) | 10 (50%) |
| UI Components | 45 | 45 (100%) | 0 (0%) |
| Prisma Models | 35 | 20 (57%) | 15 (43%) |

---

## ✅ ЧТО РАБОТАЕТ ПОЛНОСТЬЮ

1. **Grid Bot** - Полный цикл: API + UI + Cron
2. **DCA Bot** - Полный цикл: API + UI + Cron
3. **BB Bot** - Полный цикл: API + UI + Cron
4. **Signal Parser** - ChatBot + API работают
5. **Price Provider** - Real-time цены через WebSocket
6. **Trading Form** - Открытие/закрытие позиций
7. **PnL Analytics** - Графики и статистика
8. **Exchange Connection** - Подключение бирж
9. **External Positions** - Escort система через ChatBot
10. **Cron Jobs** - Автоматический запуск ботов

---

**Отчёт подготовлен:** Super Z
**Для:** CITARION Trading Platform
