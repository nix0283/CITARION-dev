# Copy Trading API Research

## Обзор

Исследование API копитрейдинга на 5 биржах: Binance, Bybit, OKX, Bitget, BingX.

---

## ✅ OKX - Полная поддержка API

**OKX имеет самое полное API для копитрейдинга!**

### Публичные Endpoints (без авторизации)

#### 1. Получение списка Lead Traders
```
GET /api/v5/copytrading/public-lead-traders
```

**Параметры:**
- `instType` - SWAP (фьючерсы) или SPOT
- `limit` - количество результатов
- `sortType` - сортировка (pnlRatio, pnl, aum, etc.)

**Пример ответа:**
```json
{
  "code": "0",
  "data": [{
    "ranks": [{
      "uniqueCode": "99FB5ECCC0C27A8A",
      "nickName": "CrowleyZhou",
      "pnl": "452990.21",
      "pnlRatio": "3.0967",           // ROI 309.67%
      "aum": "441865.21",             // Assets Under Management
      "copyTraderNum": "565",         // Количество копирующих
      "leadDays": "120",              // Дней как лидер
      "winRatio": "0.5556",           // Винрейт 55.56%
      "traderInsts": ["BTC-USDT-SWAP", "ETH-USDT-SWAP"],
      "pnlRatios": [...]              // История ROI по дням
    }]
  }]
}
```

#### 2. Статистика Lead Trader
```
GET /api/v5/copytrading/public-lead-traders/{uniqueCode}/stats
```

#### 3. История сделок Lead Trader
```
GET /api/v5/copytrading/public-lead-traders/{uniqueCode}/trades
```

#### 4. Текущие позиции Lead Trader
```
GET /api/v5/copytrading/public-lead-traders/{uniqueCode}/positions
```

### Приватные Endpoints (требуют авторизации)

#### Для Lead Traders:
- `POST /api/v5/copytrading/apply-lead-trader` - Стать лидером
- `GET /api/v5/copytrading/lead-traders` - Управление профилем лидера
- `POST /api/v5/copytrading/amend-lead-trader` - Изменить настройки

#### Для Copy Traders:
- `POST /api/v5/copytrading/copy-trader` - Подписаться на лидера
- `POST /api/v5/copytrading/stop-copy-trading` - Отписаться
- `GET /api/v5/copytrading/copy-traders` - Список подписок
- `GET /api/v5/copytrading/copy-trading-profit-sharing-details` - Детали профита

### Документация
- https://www.okx.com/docs-v5/en/#copy-trading-rest-api

---

## ⚠️ Binance - Ограниченная поддержка API

### Статус
- **Публичное API для копитрейдинга НЕ доступно**
- Copy Trading существует на платформе, но только через Web UI
- Для Lead Traders можно создавать API ключи для портфолио

### Что доступно:
- Lead Traders могут торговать через API
- Копирующие НЕ могут управлять копированием через API
- Статистика лидеров доступна только на сайте

### Документация
- https://www.binance.com/en/copy-trading
- API Key для Lead Trading: https://www.binance.com/support/faq/detail/ceb4e539b034462c9c81fa0ada65e6eb

---

## ⚠️ Bybit - Частичная поддержка API

### Статус
- Copy Trading существует как "Copy Trading"
- Публичное API для получения статистики лидеров НЕ найдено
- Возможно требует авторизации для доступа

### Что доступно:
- Copy Trading через Web UI
- Возможна интеграция для Lead Traders

### Документация
- https://www.bybit.com/copy-trading

---

## ⚠️ Bitget - Ограниченная поддержка API

### Статус
- Copy Trading существует как "Elite Trader" система
- Публичное API НЕ найдено
- Более 80,000 Elite Traders на платформе

### Что доступно:
- Spot Copy Trading
- Futures Copy Trading
- Bot Copy Trading
- Вся статистика через Web UI

### Документация
- https://www.bitget.com/copy-trading/futures
- https://www.bitget.com/support/articles/12560603838677

---

## ⚠️ BingX - Нет публичного API

### Статус
- Copy Trading 2.0 существует
- Публичное API НЕ найдено
- Поддержка Spot и Futures копитрейдинга

### Что доступно:
- Copy Trading через Web UI
- Sub-accounts для копирования
- Zero-slippage execution

### Документация
- https://bingx.com/en/learn/guide/copy-trading
- https://bingx.com/en/wiki/detail/copy-trading

---

## 📊 Сравнительная таблица

| Функция | OKX | Binance | Bybit | Bitget | BingX |
|---------|-----|---------|-------|--------|-------|
| **Публичный API лидеров** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Список лидеров** | ✅ | Web | Web | Web | Web |
| **Статистика PnL/ROI** | ✅ API | Web | Web | Web | Web |
| **История сделок лидера** | ✅ API | ❌ | Web | Web | Web |
| **Текущие позиции лидера** | ✅ API | ❌ | ❌ | ❌ | ❌ |
| **Подписка через API** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Управление копированием** | ✅ API | Web | Web | Web | Web |
| **Lead Trader API торговля** | ✅ | ✅ | ✅ | ✅ | ? |

---

## 🎯 Рекомендации для CITARION

### 1. Основная интеграция: OKX
OKX - единственная биржа с полноценным публичным API для копитрейдинга.

**Что можно реализовать:**
- Получение рейтинга Lead Traders
- Отображение статистики (PnL, ROI, Win Rate)
- История сделок лидеров
- Мониторинг позиций лидеров в реальном времени
- Автоматическое копирование через API

### 2. Дополнительный источник: Web Scraping
Для Binance, Bybit, Bitget, BingX можно:
- Парсить публичные страницы лидеров
- Получать статистику из Web UI
- Кэшировать данные для аналитики

### 3. Альтернативный подход: Lead Trader аккаунт
Если CITARION выступает как Lead Trader:
- Создать Lead Trader аккаунты на всех биржах
- Торговать через стандартный Trade API
- Подписчики копируют через Web UI бирж
- Собирать статистику из внутренних данных

---

## 📝 Пример кода для OKX Copy Trading API

```typescript
// Получение топ Lead Traders
async function getTopLeadTraders(instType: 'SWAP' | 'SPOT' = 'SWAP', limit: number = 20) {
  const response = await fetch(
    `https://www.okx.com/api/v5/copytrading/public-lead-traders?instType=${instType}&limit=${limit}`
  );
  const data = await response.json();
  
  return data.data[0].ranks.map(trader => ({
    uniqueCode: trader.uniqueCode,
    nickname: trader.nickName,
    pnl: parseFloat(trader.pnl),
    pnlRatio: parseFloat(trader.pnlRatio) * 100, // Конвертируем в проценты
    aum: parseFloat(trader.aum),
    copyTraders: parseInt(trader.copyTraderNum),
    winRate: parseFloat(trader.winRatio) * 100,
    leadDays: parseInt(trader.leadDays),
    instruments: trader.traderInsts,
  }));
}

// Использование
const topTraders = await getTopLeadTraders('SWAP', 10);
console.log('Top Traders:', topTraders);
```

---

## 🔗 Полезные ссылки

### OKX
- API Docs: https://www.okx.com/docs-v5/en/#copy-trading-rest-api
- Copy Trading: https://www.okx.com/campaigns/copytrading-apizone

### Binance
- Copy Trading: https://www.binance.com/en/copy-trading
- Lead Trader API Key: https://www.binance.com/support/faq/detail/ceb4e539b034462c9c81fa0ada65e6eb

### Bybit
- Copy Trading: https://www.bybit.com/copy-trading

### Bitget
- Futures Copy Trading: https://www.bitget.com/copy-trading/futures
- Spot Copy Trading: https://www.bitget.com/copy-trading/spot

### BingX
- Copy Trading 2.0: https://bingx.com/en/learn/guide/copy-trading
