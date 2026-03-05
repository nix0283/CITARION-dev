# Система распознавания и сопровождения внешних позиций

## Обзор функционала

Реализована полная система для:
1. **Распознавания позиций**, открытых вручную на бирже
2. **Уведомлений** через Telegram и UI чат-бот
3. **Запроса на сопровождение** с inline кнопками
4. **Сопровождения** - SL, TP, Trailing Stop для внешних позиций

---

## Требования

Для работы системы необходимо:
- **Активное подключение аккаунта биржи** с API ключами
- **Account type: REAL** (не DEMO)
- **Права API:** чтение позиций и торговля

---

## Компоненты системы

### 1. Сервис синхронизации (`position-sync-service.ts`)

```typescript
// Синхронизация позиций с аккаунта
syncPositionsFromAccount(accountId: string): Promise<PositionSyncResult>

// Синхронизация всех REAL аккаунтов
syncAllAccounts(): Promise<Record<string, PositionSyncResult>>

// Подтвердить сопровождение
confirmEscort(positionId: string, options?: {
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: { type: "PERCENT" | "FIXED" | "BREAKEVEN"; value: number };
}): Promise<{ success: boolean; error?: string }>

// Отклонить сопровождение
declineEscort(positionId: string): Promise<{ success: boolean; error?: string }>

// Обновить параметры сопровождения
updateEscortParams(positionId: string, params: {...}): Promise<{ success: boolean }>

// Закрыть внешнюю позицию на бирже
closeExternalPosition(positionId: string, closeReason?: string): Promise<{ success: boolean }>

// Получить ожидающие запросы
getPendingEscortRequests(): Promise<ExternalPosition[]>

// Получить сопровождаемые позиции
getEscortingPositions(): Promise<ExternalPosition[]>
```

### 2. API Endpoints

#### `/api/positions/sync`
- **POST** - Синхронизировать позиции
- **GET** - Получить статус и списки

#### `/api/positions/escort`
- **POST** - Подтвердить/отклонить сопровождение
  ```json
  { "positionId": "xxx", "action": "confirm", "params": { "stopLoss": 95000 } }
  ```
- **PUT** - Обновить параметры
  ```json
  { "positionId": "xxx", "stopLoss": 94000, "trailingStop": { "type": "PERCENT", "value": 2 } }
  ```
- **DELETE** - Закрыть позицию
- **GET** - Получить детали позиции

#### `/api/cron/position-sync`
- **POST** - Cron задача (каждые 2 минуты)
- **GET** - Health check

---

## Telegram Integration

### Inline кнопки при обнаружении позиции

```
🔔 New External Position Detected

🟢 BTCUSDT LONG
📍 Exchange: Binance Futures
💱 Symbol: BTCUSDT
📊 Direction: LONG
💰 Entry Price: $97,000
📐 Size: 0.0150
⚡ Leverage: 10x

Would you like to escort this position?
(SL, TP, Trailing Stop will be managed)

[✅ Yes, Escort] [❌ No, Ignore]
[⚙️ Escort with TP/SL]
```

### Callback data форматы

- `escort_yes_{positionId}` - Подтвердить сопровождение
- `escort_no_{positionId}` - Отклонить
- `escort_config_{positionId}` - Подтвердить + показать настройки

### Команды для управления сопровождением

После подтверждения можно использовать команды:

```
btcusdt sl 95000         # Установить Stop Loss
btcusdt tp 105000        # Установить Take Profit
btcusdt trailing 2%      # Включить Trailing Stop 2%
btcusdt close            # Закрыть позицию
```

---

## UI Chat Bot Integration

Чат-бот получает SSE уведомления о новых внешних позициях:

```typescript
// Event types
"ESCORT_REQUEST" - Новая внешняя позиция обнаружена
"ESCORT_STARTED" - Сопровождение подтверждено
"ESCORT_DECLINED" - Сопровождение отклонено
```

Отображаются кнопки для подтверждения/отклонения.

---

## База данных

### Позиции в БД

```prisma
model Position {
  source        String   @default("PLATFORM") // PLATFORM, EXTERNAL, SIGNAL
  exchangePositionId String? // ID позиции на бирже
  
  // Сопровождение
  escortEnabled Boolean  @default(false)
  escortStatus  String?  // PENDING_CONFIRMATION, ESCORTING, IGNORED, ...
  
  // Risk management
  stopLoss      Float?
  takeProfit    Float?
  trailingStop  String?
  trailingActivated Boolean @default(false)
}
```

### Статусы сопровождения

- `PENDING_CONFIRMATION` - Ожидает подтверждения пользователя
- `ESCORTING` - Активно сопровождается
- `IGNORED` - Пользователь отклонил
- `SL_HIT` - Закрыт по Stop Loss
- `TP_HIT` - Закрыт по Take Profit
- `TRAILING_HIT` - Закрыт по Trailing Stop
- `CLOSED_EXTERNALLY` - Закрыт на бирже пользователем

---

## Cron Jobs (vercel.json)

```json
{
  "path": "/api/cron/position-sync",
  "schedule": "*/2 * * * *"
}
```

Каждые 2 минуты:
1. Проверяет все REAL аккаунты с API ключами
2. Получает позиции с биржи
3. Сравнивает с известными позициями
4. Обнаруживает новые и закрытые позиции
5. Отправляет уведомления

---

## Мониторинг сопровождаемых позиций

Position Monitor автоматически:
- Обновляет текущие цены
- Проверяет достижение SL/TP
- Обновляет Trailing Stop
- Закрывает позиции при срабатывании
- Отправляет уведомления

---

## Поддерживаемые биржи

| Биржа | Spot | Futures | Методы |
|-------|------|---------|--------|
| Binance | ✅ | ✅ | getSpotPositions, getFuturesPositions |
| Bybit | 🔜 | 🔜 | - |
| OKX | 🔜 | 🔜 | - |
| Bitget | 🔜 | 🔜 | - |
| KuCoin | 🔜 | 🔜 | - |

Для добавления новой биржи реализуйте методы:
```typescript
async getFuturesPositions(): Promise<ExchangePosition[]>
async getSpotPositions(): Promise<ExchangePosition[]>
```

---

## Пример workflow

1. **Пользователь открывает позицию на Binance**
   - manually через веб-интерфейс биржи

2. **Платформа обнаруживает позицию** (через 2 минуты)
   - Cron задача синхронизирует позиции
   - Обнаруживает новую позицию, отсутствующую в БД

3. **Отправка уведомления**
   - Telegram: сообщение с inline кнопками
   - UI: SSE уведомление в чат-боте

4. **Пользователь подтверждает сопровождение**
   - Нажимает "✅ Yes, Escort"
   - Или "⚙️ Escort with TP/SL" для настройки

5. **Позиция сопровождается**
   - Автоматический мониторинг SL/TP/Trailing
   - Уведомления о событиях
   - Возможность закрытия через платформу

---

## Файлы

```
src/lib/position-sync-service.ts      # Основной сервис
src/app/api/positions/sync/route.ts   # API синхронизации
src/app/api/positions/escort/route.ts # API сопровождения
src/app/api/cron/position-sync/route.ts # Cron задача
src/app/api/telegram/webhook/route.ts  # Telegram callback handling
src/lib/exchange/binance-client.ts    # Binance позиции
```
