# Jesse Trading Framework Analysis

## Overview

**Repository**: https://github.com/jesse-ai/jesse  
**Language**: Python  
**License**: MIT  
**Website**: https://jesse.trade

Jesse - это продвинутый Python фреймворк для алгоритмической торговли криптовалютами с акцентом на точный backtesting и простоту разработки стратегий.

---

## Key Features

### 1. 300+ Indicators Library
Самое ценное для CITARION - Jesse предоставляет **300+ технических индикаторов** из коробки:
- Trend: ADX, Aroon, Ichimoku, Parabolic SAR, SuperTrend, etc.
- Momentum: RSI, Stochastic, CCI, MACD, ROC, etc.
- Volatility: ATR, Bollinger Bands, Keltner Channel, Donchian, etc.
- Volume: OBV, VWAP, MFI, Volume Profile, etc.
- Custom: Laguerre RSI, Ehlers filters, etc.

**Текущий статус CITARION**: ~28+ индикаторов

### 2. Look-Ahead Bias Protection
Jesse имеет защиту от look-ahead bias в backtesting:
- Строгий порядок обработки данных
- Запрет на использование будущих данных
- Детекция peeking в логах

**Ценность для CITARION**: Критически важно для достоверного backtesting

### 3. Multi-Symbol/Multi-Timeframe Support
- Одновременный анализ нескольких символов
- Синхронизация разных таймфреймов
- Portfolio-level backtesting

**Ценность для CITARION**: Дополнить существующую архитектуру

### 4. Partial Fills
Поддержка частичного исполнения ордеров:
- Реалистичная симуляция ликвидности
- Queue position modeling
- Slippage estimation

**Ценность для CITARION**: Улучшение paper trading точности

### 5. Risk Management Tools
- Position sizing
- Portfolio-level risk limits
- Drawdown protection
- Exposure tracking

**Текущий статус CITARION**: ✅ Уже реализовано (risk-manager.ts)

### 6. AI-Driven Optimization
- Генетические алгоритмы
- Parameter optimization
- Walk-forward analysis

**Текущий статус CITARION**: ✅ Уже реализовано (hyperopt/)

---

## Integration Opportunities

### High Priority

| Функция | Ценность | Сложность | Статус CITARION |
|---------|----------|-----------|-----------------|
| 300+ Indicators | 🔴 Высокая | Средняя | ~28 индикаторов |
| Look-Ahead Protection | 🔴 Высокая | Низкая | Не реализовано |
| Partial Fills | 🟡 Средняя | Высокая | Не реализовано |
| Multi-Symbol Strategies | 🟡 Средняя | Средняя | Частично |

### Low Priority (Already Implemented)

| Функция | Статус CITARION | Файл |
|---------|-----------------|------|
| Backtesting Engine | ✅ Реализовано | /src/lib/backtesting/ |
| Risk Management | ✅ Реализовано | /src/lib/strategy/risk-manager.ts |
| Hyperopt/Optimization | ✅ Реализовано | /src/lib/hyperopt/ |
| Paper Trading | ✅ Реализовано | /src/lib/paper-trading/ |
| Strategy Framework | ✅ Реализовано | /src/lib/strategy/ |
| Plugin System | ✅ Реализовано | /src/lib/strategy/plugin-system.ts |

---

## Recommended Actions

### 1. Indicator Port (High Priority)
```
Портировать недостающие индикаторы из Jesse:
- Laguerre RSI
- Ehlers filters (Super Smoother, Decycler, etc.)
- Volume Profile
- Market Facilitation Index
- Williams %R
- Money Flow Index (MFI)
- Commodity Channel Index (CCI) - уже есть?
- Aroon
- Donchian Channel
```

### 2. Look-Ahead Bias Detection
```typescript
// Добавить в backtesting/engine.ts
interface BacktestConfig {
  // ... existing fields
  lookAheadProtection: boolean;
  lookAheadLog: LookAheadEvent[];
}

function detectLookAhead(candles: Candle[], signal: Signal): boolean {
  // Детекция использования будущих данных
}
```

### 3. Partial Fills Simulation
```typescript
// Добавить в paper-trading/engine.ts
interface PartialFill {
  orderId: string;
  requestedSize: number;
  filledSize: number;
  avgPrice: number;
  remainingSize: number;
  timestamp: Date;
}
```

---

## Code Examples from Jesse

### Strategy Structure (Jesse)
```python
# Jesse strategy example
class MyStrategy(Strategy):
    def should_long(self):
        return self.price > self.ema(20)
    
    def should_short(self):
        return self.price < self.ema(20)
    
    def should_cancel(self):
        return True
    
    def go_long(self):
        qty = self.balance * 0.1 / self.price
        self.buy = qty, self.price
        self.stop_loss = qty, self.price * 0.98
        self.take_profit = qty, self.price * 1.04
```

### Equivalent in CITARION (Already Implemented)
```typescript
// CITARION strategy example
class MyStrategy extends BaseStrategy {
  populateEntrySignal(candles, indicators, price) {
    const ema = indicators.ema[20];
    if (price > ema) {
      return { type: "LONG", confidence: 70, ... };
    }
    return null;
  }
}
```

---

## Comparison Table

| Feature | Jesse | CITARION | Gap |
|---------|-------|----------|-----|
| **Language** | Python | TypeScript | Different ecosystems |
| **Backtesting** | ✅ Advanced | ✅ Full | Minor |
| **Indicators** | 300+ | ~28 | Major gap |
| **Paper Trading** | ✅ | ✅ | Equal |
| **Live Trading** | ✅ | ✅ | Equal |
| **Risk Management** | ✅ | ✅ | Equal |
| **Optimization** | ✅ Genetic | ✅ 4 methods | Equal |
| **Look-Ahead Protection** | ✅ Built-in | ❌ Missing | Important |
| **Partial Fills** | ✅ | ❌ Missing | Nice to have |
| **Multi-Symbol** | ✅ Native | ⚠️ Partial | Minor |
| **AI Integration** | ⚠️ Plugin | ✅ Built-in (z-ai-sdk) | CITARION better |
| **UI/Visualization** | ❌ CLI only | ✅ Full Web UI | CITARION better |
| **Plugin System** | ❌ | ✅ Full | CITARION better |
| **Alpha Factors** | ❌ | ✅ 12 factors | CITARION better |
| **Self-Learning** | ❌ | ✅ ML module | CITARION better |

---

## Conclusion

### Что можно позаимствовать:
1. **300+ индикаторов** - портировать наиболее полезные (~50-100)
2. **Look-ahead bias защита** - добавить в backtesting engine
3. **Partial fills** - улучшить paper trading реализм

### Что CITARION делает лучше:
1. **Web UI** - полноценный дашборд vs CLI у Jesse
2. **AI Integration** - нативная интеграция с z-ai-sdk
3. **Plugin System** - расширяемая архитектура
4. **Alpha Factors** - факторные модели для сигналов
5. **Self-Learning** - автоматическое улучшение стратегий

### Рекомендация:
**Портировать только индикаторы и look-ahead protection.** Остальное CITARION уже реализует лучше или на том же уровне.

---

## Next Steps

1. Создать файл `/src/lib/indicators/jesse-port.ts`
2. Портировать приоритетные индикаторы:
   - Laguerre RSI
   - Ehlers filters
   - Volume Profile
   - Aroon
   - Donchian Channel
   - MFI
3. Добавить look-ahead detection в backtesting
4. Документировать портированные индикаторы
