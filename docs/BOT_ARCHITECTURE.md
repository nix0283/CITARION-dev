# CITARION Bot Architecture

## Институциональная классификация торговых ботов

*«Побеждает не стратегия, побеждает инфраструктура, на которой она работает»*

---

## Обзор системы

| Категория | Количество | Статус |
|-----------|------------|--------|
| **Core Trading Bots** | 7 | ✅ Production Ready |
| **Execution Algorithms** | 1 | ✅ Production Ready |
| **ML/AI Modules** | 3 | ✅ Production Ready |
| **Support Systems** | 4 | ✅ Production Ready |

---

## Bot Classification Matrix

### 📊 Market Making

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **Архитектор** | Avellaneda-Stoikov | `/bots/architect/` | Inventory skew, toxicity detection, volatility-adjusted quoting |

### 📈 Trend Following

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **Крон** | Multi-MA + ADX | `/bots/kron/` | Donchian breakouts, Parabolic SAR, multi-timeframe confirmation |
| **Вижн** | ML Forecasting | `/vision-bot/` | 24h probability forecasting, feature engineering |

### 📉 Mean Reversion

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **Эквилибрист** | Bollinger + RSI + Z-Score | `/bots/equilibrist/` | Half-life estimation, volatility regime detection |
| **Рид** | Statistical Arbitrage | `/bots/reed/` | Engle-Granger cointegration, Kalman filter hedge ratios |

### 🔄 Arbitrage

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **Орион** | Cash-and-Carry | `/bots/orion/` | Basis monitoring, funding rate optimization |
| **Спектр** | Pairs Trading | `/bots/spectrum/` | Rolling correlation, spread z-score signals |

### ⚡ High-Frequency Trading

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **HFT Bot** | Microstructure | `/hft-bot/` | 10-layer confirmation, iceberg/spoofing detection |

### 🎯 Execution Algorithms

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **Люмис** | VWAP/TWAP/POV | `/bots/lumis/` | Market impact modeling, Almgren-Chriss trajectory |

### 📡 Signal Processing

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **Signal Bot** | Copy Trading | `/signal-bot/` | Multi-source aggregation, reputation tracking |

### 🐋 Event-Driven

| Bot | Стратегия | Файл | Ключевые особенности |
|-----|-----------|------|---------------------|
| **Аргус** | Pump/Dump Detection | `/argus-bot/` | Orderbook imbalance, market cap filtering |

---

## Detailed Bot Specifications

### 🏗️ АРХИТЕКТОР (Market Maker)

**Теория:** Avellaneda-Stoikov (2008) optimal market making model

```
Optimal Spread = γ * σ² * T + 2/κ * ln(1 + γ/κ)
Inventory Skew = -γ * q * σ² * (T-t)
```

**Компоненты:**
- `AvellanedaStoikovModel` - Optimal quote calculation
- `InventoryManager` - Position tracking with risk limits
- `VolatilityEstimator` - Parkinson volatility, regime detection
- `AdverseSelectionDetector` - Toxicity scoring
- `CircuitBreaker` - Drawdown protection

**Параметры:**
- γ (gamma): 0.1 - Risk aversion coefficient
- κ (kappa): 1.5 - Order book intensity
- Max inventory: 1000 units
- Toxicity threshold: 0.7

---

### 📊 РИД (Statistical Arbitrage)

**Теория:** Engle-Granger (1987), Johansen (1988) cointegration

**Компоненты:**
- `CointegrationTests` - ADF test, Johansen test
- `HedgeRatioCalculator` - OLS, TLS, Kalman Filter
- `SpreadAnalyzer` - Z-score, Hurst exponent, half-life

**Статистические тесты:**
```typescript
ADF Test: H0 = unit root (not cointegrated)
Johansen Test: Determines cointegration rank
Hurst Exponent: H < 0.5 indicates mean reversion
Half-Life: Speed of mean reversion
```

**Критерии отбора пар:**
- Minimum correlation: 0.7
- Maximum ADF p-value: 0.05
- Half-life range: 5-100 periods
- Entry Z-score: ±2.0
- Exit Z-score: ±0.5

---

### ⚡ ЛЮМИС (Execution Algorithms)

**Теория:** Almgren-Chriss (2000) optimal execution

**Алгоритмы:**
1. **VWAP** - Volume Weighted Average Price
2. **TWAP** - Time Weighted Average Price
3. **POV** - Percentage of Volume
4. **IS** - Implementation Shortfall optimization
5. **ICEBERG** - Hidden order execution

**Market Impact Model:**
```
Linear:     Impact = α * (Q/V)
Square Root: Impact = σ * √(Q/V) 
Almgren-Chriss: Temporary + Permanent impact
```

---

### 🔄 ОРИОН (Cash-and-Carry Arbitrage)

**Стратегия:** Capturing basis between spot and futures

**Типы арбитража:**
- **Cash-and-Carry:** Buy spot, sell futures (positive basis)
- **Reverse Cash-and-Carry:** Sell spot, buy futures (negative basis)
- **Funding Arb:** Capture funding rate differentials

**Критерии:**
- Minimum basis: 0.5%
- Target annualized return: 15%+
- Maximum expiry: 90 days
- Stop loss: 1% basis reversal

---

### 📉 ЭКВИЛИБРИСТ (Mean Reversion)

**Индикаторы:**
- Bollinger Bands (2σ, 20-period)
- RSI (14-period)
- Z-Score calculation
- Half-life estimation (Ornstein-Uhlenbeck)

**Сигналы:**
```
OVERSOLD:  Z < -2.0 && RSI < 30 && %B < 0.1
OVERBOUGHT: Z > +2.0 && RSI > 70 && %B > 0.9
```

---

### 📈 КРОН (Trend Following)

**Система:**
- Moving Averages: SMA(20, 50, 200), EMA(12, 26)
- ADX: Trend strength measurement
- Donchian Channels: Breakout detection
- Parabolic SAR: Trailing stop

**Сигналы:**
```
UPTREND: Price > SMA20 > SMA50 > SMA200 && ADX > 25 && +DI > -DI
DOWNTREND: Price < SMA20 < SMA50 < SMA200 && ADX > 25 && -DI > +DI
```

---

### 🌈 СПЕКТР (Pairs Trading)

**Методология:**
- Rolling correlation analysis
- Spread construction with hedge ratio
- Z-score entry/exit triggers
- Correlation regime detection

**Критерии:**
- Correlation range: 0.6 - 0.95
- Lookback: 60 periods
- Entry: |Z| > 2.0
- Exit: |Z| < 0.5

---

## 🚀 HFT Bot Improvements

**10-Layer Confirmation System:**

| Layer | Name | Weight | Purpose |
|-------|------|--------|---------|
| 1 | Order Flow | 1.5 | Bid/ask imbalance |
| 2 | Liquidity | 1.3 | Depth analysis |
| 3 | Spread | 1.2 | Tightness check |
| 4 | Market Regime | 1.4 | Trend/range detection |
| 5 | Market Quality | 1.6 | Manipulation detection |
| 6 | Whale Activity | 1.1 | Large trader tracking |
| 7 | Manipulation Check | 2.0 | Spoofing/iceberg detection |
| 8 | Volatility | 1.0 | Regime-appropriate sizing |
| 9 | Session Timing | 0.8 | Liquidity timing |
| 10 | Risk/Reward | 1.5 | Trade quality filter |

**Detection Systems:**
- Iceberg order detection
- Spoofing detection
- Wash trading detection
- Whale movement tracking

---

## 📡 Signal Bot Improvements

**Multi-Source Aggregation:**
- TradingView webhooks
- Telegram signals
- API integration
- Manual entry

**Position Escort System:**
- Adaptive trailing stop
- Break-even trigger
- Partial take profit
- Source reputation tracking

**Reputation System:**
```
Score = WinRate * 50 + min(ProfitFactor * 10, 50)
Decay: score *= 0.95 daily
```

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BOT ORCHESTRATOR                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Архитектор│  │   Крон   │  │   Рид    │  │  Орион  │ │
│  │Market Maker│Trend Follow│ Stat Arb │ Cash&Carry│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │             │       │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴────┐ │
│  │Эквилибр  │  │ Спектр   │  │  Люмис   │  │ HFT Bot │ │
│  │Mean Revert│ Pairs Trad│ Execution │ Microstruc│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                         │
│                    ┌──────────┐                         │
│                    │Signal Bot│                         │
│                    │Copy/Escort│                        │
│                    └──────────┘                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    EXCHANGE LAYER                        │
├─────────────────────────────────────────────────────────┤
│  Binance │ Bybit │ OKX │ Bitget │ KuCoin │ BingX │ ...  │
└─────────────────────────────────────────────────────────┘
```

---

## Performance Benchmarks

| Bot | Target Sharpe | Max Drawdown | Win Rate Target |
|-----|--------------|--------------|-----------------|
| Архитектор | > 2.0 | < 5% | 52%+ |
| Крон | > 1.5 | < 15% | 40%+ |
| Рид | > 2.0 | < 8% | 55%+ |
| Орион | > 3.0 | < 2% | 90%+ |
| Эквилибрист | > 1.8 | < 10% | 50%+ |
| Люмис | N/A | < 0.5% slippage | N/A |

---

## Risk Management Integration

All bots integrate with unified risk management:

```typescript
- Kelly Criterion position sizing
- VaR/CVaR monitoring
- Correlation limits
- Concentration limits
- Circuit breakers
```

---

## File Structure

```
/src/lib/
├── bots/
│   ├── architect/    # Avellaneda-Stoikov Market Maker
│   ├── kron/         # Trend Following
│   ├── reed/         # Statistical Arbitrage
│   ├── spectrum/     # Pairs Trading
│   ├── lumis/        # Execution Algorithms
│   ├── orion/        # Cash-and-Carry Arbitrage
│   └── equilibrist/ # Mean Reversion
├── hft-bot/          # High-Frequency Trading
├── signal-bot/       # Signal Processing & Escort
├── risk/             # Unified Risk Management
└── exchange/         # Exchange Clients (11 exchanges)
```

---

*"In trading, the house always wins. Be the house."*
