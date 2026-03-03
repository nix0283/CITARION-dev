# Система сопровождения внешних позиций - Отчёт

## Обзор

Реализована полная система обнаружения и сопровождения позиций, открытых вручную на бирже.

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    БИРЖА (Binance, Bybit, OKX...)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Позиция открыта вручную (Spot/Futures)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ API запрос
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  POSITION SYNC SERVICE                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  syncAllAccounts() - каждые 2 минуты (Vercel Cron)       │  │
│  │  syncAccountPositions() - синхронизация конкретного      │  │
│  │  fetchExchangePositions() - запрос к API биржи           │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Новая позиция найдена
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL POSITION (БД)                         │
│  Статус: PENDING_APPROVAL                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Уведомление
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      УВЕДОМЛЕНИЯ                                │
│  ┌────────────────────┐    ┌────────────────────────────────┐  │
│  │   Telegram Bot     │    │         UI Chat Bot            │  │
│  │  Inline кнопки:    │    │  Кнопки:                       │  │
│  │  ✅ Сопровождать   │    │  ✅ Сопровождать               │  │
│  │  ❌ Игнорировать   │    │  🚫 Игнорировать               │  │
│  └────────────────────┘    └────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   ADOPTED (Сопровождение)│   │   IGNORED (Игнорирование)│
│   Создаётся Position     │   │   Позиция игнорируется   │
│   Мониторинг TP/SL/TS    │   │   в будущем              │
└─────────────────────────┘   └─────────────────────────┘
```

---

## Компоненты

### 1. База данных (Prisma Schema)

**Модель ExternalPosition:**
```prisma
model ExternalPosition {
  id                    String   @id
  accountId             String
  exchangeId            String   // binance, bybit, etc.
  exchangeType          String   // spot, futures
  symbol                String
  direction             String   // LONG, SHORT
  status                String   // DETECTED, PENDING_APPROVAL, ADOPTED, IGNORED, CLOSED
  amount                Float
  amountUsd             Float
  avgEntryPrice         Float
  leverage              Int
  stopLoss              Float?
  takeProfit            Float?
  trailingStop          String?  // JSON
  positionId            String?  // Связь с Position при ADOPTED
  telegramMessageId     String?  // ID сообщения в Telegram
  // ... timestamps
}
```

### 2. Position Sync Service (`src/lib/position-sync.ts`)

**Основные функции:**
- `syncAllAccounts()` - Синхронизация всех REAL аккаунтов
- `syncAccountPositions(accountId)` - Синхронизация конкретного аккаунта
- `fetchExchangePositions(account)` - Запрос позиций с биржи
- `adoptExternalPosition(id)` - Принять на сопровождение
- `ignoreExternalPosition(id)` - Игнорировать позицию

**Поддерживаемые биржи:**
- Binance (Spot/Futures)
- Bybit (Spot/Futures)
- OKX (Spot/Futures)
- Bitget (Spot/Futures)
- KuCoin (Spot/Futures)

### 3. API Endpoints

**`/api/positions/sync` (route.ts):**
- `POST` - Запустить синхронизацию
- `GET` - Получить статус и ожидающие позиции

**`/api/positions/escort` (route.ts):**
- `POST` - Принять/отклонить сопровождение
- `GET` - Получить список внешних позиций
- `PATCH` - Обновить параметры (SL, TP, Trailing)

**`/api/cron/sync` (route.ts):**
- `POST` - Cron задача синхронизации
- `PUT` - Запустить постоянную синхронизацию
- `DELETE` - Остановить синхронизацию

### 4. Telegram Bot Integration

**Inline кнопки:**
```
🆕 Обнаружена новая позиция

🟢 BTCUSDT LONG
Exchange: Binance (FUTURES)
Entry: $97,000
Amount: 0.05 ($4,850.00)
Leverage: 10x

📋 Сопровождать позицию?

[✅ Да, сопровождать] [❌ Нет, игнорировать]
```

**Callback обработка:**
- `adopt_{positionId}` → adoptExternalPosition()
- `ignore_{positionId}` → ignoreExternalPosition()

### 5. UI Chat Bot Integration

**Новые кнопки:**
- "🔄 Синхр." - Запустить синхронизацию
- "🔗 Внешние" - Показать ожидающие позиции

**Отображение внешней позиции:**
```
🔗 Внешняя позиция

🟢 BTCUSDT LONG 10x
Exchange: Binance Futures
Entry: $97,000
Amount: 0.05 ($4,850.00)
PnL: +$125.50

[✅ Сопровождать] [🚫 Игнорировать]
```

### 6. Position Monitor Integration

**Функция monitorExternalPositions():**
- Проверяет все позиции со статусом ADOPTED
- Отслеживает TP/SL/Trailing Stop
- Отправляет уведомления о событиях
- Обновляет статус при закрытии на бирже

---

## Vercel Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

Синхронизация каждые 2 минуты.

---

## Поток данных

1. **Обнаружение:**
   - Cron → `/api/cron/sync` → `syncAllAccounts()`
   - Для каждого REAL аккаунта: `fetchExchangePositions()`
   - Сравнение с известными позициями
   - Новая позиция → `ExternalPosition` (PENDING_APPROVAL)

2. **Уведомление:**
   - Telegram: inline кнопки `adopt_` / `ignore_`
   - UI: SSE уведомление + кнопки

3. **Действие пользователя:**
   - Telegram callback → `handleCallbackQuery()`
   - UI кнопка → `handleEscortPosition()`
   - Оба → `/api/positions/escort`

4. **Сопровождение (ADOPTED):**
   - Создаётся `Position` в БД
   - `monitorExternalPositions()` отслеживает
   - TP/SL/Trailing Stop работает автоматически

---

## Переменные окружения

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_ALLOWED_USERS=123456789

# Cron Security
CRON_SECRET=your_secret_key

# Database
DATABASE_URL=file:./db/custom.db
```

---

## Пример использования

### Через Telegram:

1. Откройте позицию на Binance вручную
2. Через 2 минуты получите уведомление в Telegram
3. Нажмите "✅ Да, сопровождать"
4. Позиция добавляется в мониторинг

### Через UI:

1. Нажмите "🔄 Синхр." в чат-боте
2. Обнаруженные позиции появятся в чате
3. Нажмите "✅ Сопровождать"
4. Установите SL/TP если нужно

---

## Статусы ExternalPosition

| Статус | Описание |
|--------|----------|
| DETECTED | Только обнаружена |
| PENDING_APPROVAL | Ожидает решения пользователя |
| ADOPTED | Принята на сопровождение |
| IGNORED | Пользователь отказался |
| CLOSED | Закрыта на бирже |

---

## Требования для работы

1. **REAL аккаунт** с API ключами
2. **Активные API ключи** с правами чтения позиций
3. **Настроенный Telegram Bot** (опционально)
4. **Vercel Cron** или внешний cron сервис

---

## Файлы

| Файл | Описание |
|------|----------|
| `src/lib/position-sync.ts` | Сервис синхронизации |
| `src/app/api/positions/sync/route.ts` | API синхронизации |
| `src/app/api/positions/escort/route.ts` | API сопровождения |
| `src/app/api/cron/sync/route.ts` | Cron endpoint |
| `src/app/api/telegram/webhook/route.ts` | Telegram обработка |
| `src/components/chat/chat-bot.tsx` | UI интеграция |
| `src/lib/notification-service.ts` | Уведомления |
| `src/lib/position-monitor.ts` | Мониторинг позиций |
| `prisma/schema.prisma` | Модель ExternalPosition |
