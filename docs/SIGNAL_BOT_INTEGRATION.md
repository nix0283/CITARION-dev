# System Integration - CornixBot-like Signal Bot

## Overview

This document describes the complete integration of the signal bot system, designed as a full implementation of CornixBot functionality with Binance-like UI styling.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SIGNAL BOT INTEGRATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SIGNAL SOURCES                                  │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │ Telegram  │   │TradingView│   │  Webhook  │   │  Manual   │    │   │
│  │  │ Channels  │   │  Alerts   │   │  API      │   │  Input    │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SIGNAL PROCESSING                               │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Parser   │   │ Validator │   │  Filter   │   │  Router   │    │   │
│  │  │           │   │           │   │           │   │           │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      EXECUTION ENGINE                                │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Binance  │   │  Bybit    │   │   OKX     │   │  Bitget   │    │   │
│  │  │  Client   │   │  Client   │   │  Client   │   │  Client   │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     RISK MANAGEMENT                                  │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐    │   │
│  │  │  Position │   │   Stop    │   │  Take     │   │  Trailing │    │   │
│  │  │  Sizing   │   │   Loss    │   │  Profit   │   │   Stop    │    │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Signal Bot Components

### Signal Parser

```typescript
import { SignalParser } from '@/lib/signal-bot/cornix-bot'

const parser = new SignalParser()

// Parse Cornix format
const signal = parser.parse(`
  #BTCUSDT LONG
  Entry: 42000
  TP1: 43000 (50%)
  TP2: 44000 (50%)
  SL: 41000
  Leverage: 10x
`, 'telegram')

console.log(signal.symbol)     // 'BTCUSDT'
console.log(signal.direction)  // 'LONG'
console.log(signal.confidence) // 0.85
```

### Signal Validator

```typescript
import { SignalValidator } from '@/lib/signal-bot/cornix-bot'

const validator = new SignalValidator({
  maxLeverage: 20,
  maxRiskPerTrade: 2,
  minConfidence: 0.6
})

const validation = await validator.validate(signal)

if (validation.isValid) {
  // Execute signal
} else {
  console.log(validation.errors)
}
```

### Signal Executor

```typescript
import { SignalExecutor } from '@/lib/signal-bot/cornix-bot'

const executor = new SignalExecutor(config)

// Execute signal
const execution = await executor.execute(signal)

console.log(execution.entryPrice)
console.log(execution.positionSize)
console.log(execution.leverage)

// Update position
executor.updatePosition(positionId, currentPrice)

// Close position
await executor.closePosition(positionId, 'take_profit')
```

## 2. Supported Signal Formats

### Cornix Format
```
#BTCUSDT LONG
Entry: 42000
TP1: 43000 (50%)
TP2: 44000 (50%)
SL: 41000
Leverage: 10x
```

### Standard Format
```
Buy BTC/USDT
@ 42000
TP: 43000
SL: 41000
```

### TradingView JSON
```json
{
  "symbol": "BTCUSDT",
  "action": "buy",
  "price": 42000,
  "stop_loss": 41000,
  "take_profit": 43000
}
```

### Custom Format
```
💰 BTCUSDT
📊 LONG
🎯 43000
🛑 41000
```

## 3. Risk Management

### Position Sizing
- Risk-based sizing: Risk Amount / Stop Distance
- Maximum position size limit
- Account balance percentage

### Stop Loss
- Fixed stop loss
- Trailing stop
- ATR-based stop
- Percentage stop

### Take Profit
- Multiple TP levels
- Partial position closing
- Trailing TP

## 4. UI Components

### Binance-like Styling

```typescript
const binanceColors = {
  up: '#0ECB81',      // Green
  down: '#F6465D',    // Red
  warning: '#F0B90B', // Yellow
  accent: '#FCD535',  // Gold
  background: '#0B0E11',
  cardBg: '#1E2329',
  text: '#EAECEF'
}
```

### Signal Bot Panel

```tsx
import { SignalBotPanel } from '@/components/signal-bot/signal-bot-panel'

<SignalBotPanel />
```

Features:
- Real-time position tracking
- PnL display with color coding
- Signal processing input
- Position management
- Settings panel

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/signals | Get signals and positions |
| POST | /api/signals | Process new signal |
| PUT | /api/signals | Close position |
| DELETE | /api/signals | Delete signal |

## Files Created

| File | Description | Lines |
|------|-------------|-------|
| `/src/lib/signal-bot/cornix-bot.ts` | Signal bot core | ~800 |
| `/src/app/api/signals/route.ts` | API endpoints | ~150 |
| `/src/components/signal-bot/signal-bot-panel.tsx` | UI Panel | ~350 |

## Next Steps

After completing this integration:

1. **CornixBot-like Features**:
   - Telegram bot integration
   - Multi-exchange support
   - Signal marketplace
   - Copy trading

2. **Binance-like UI**:
   - Apply styles to all pages
   - Dark theme as default
   - Trading interface
   - Portfolio dashboard

3. **Additional Features**:
   - Backtesting integration
   - Performance analytics
   - Signal performance tracking
   - Automated strategies
