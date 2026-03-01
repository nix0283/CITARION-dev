# CITARION Institutional Trading Bots Reference

## Overview

CITARION implements a comprehensive suite of institutional-grade trading bots covering all major algorithmic trading categories used by top quantitative hedge funds and trading firms.

---

## Bot Classification Matrix

| Bot Name | Category | Strategy Type | ML/Neural | Latency Target |
|----------|----------|---------------|-----------|----------------|
| **Architect** | Market Making | Avellaneda-Stoikov | No | <10ms (colocated) |
| **Orion** | Arbitrage | Cash-and-Carry | No | <100ms |
| **Reed** | Statistical Arb | Cointegration | No | <1s |
| **Spectrum** | Pair Trading | Correlation | No | <1s |
| **Lumis** | Execution | VWAP/TWAP/POV | No | Variable |
| **Kron** | Trend Following | Momentum | No | <1s |
| **Equilibrist** | Mean Reversion | Bollinger/RSI | No | <1s |
| **HFT Engine** | High-Frequency | Multi-layer | No | <10ms |
| **Signal Bot** | Signal Processing | Copy/Escort | No | <100ms |
| **Vision Bot** | Forecasting | Probability | Partial | <1s |
| **Argus** | Market Analysis | Order Flow | No | <100ms |
| **Grid Bot** | Grid Trading | Adaptive Grid | No | <1s |
| **DCA Bot** | Accumulation | Dollar-Cost-Avg | No | Variable |
| **BB Bot** | Oscillation | Bollinger Bands | No | <1s |
| **WolfBot Arb** | Cross-Exchange | Triangular | No | <100ms |

---

## 1. Market Makers

### Architect Bot (`/src/lib/bots/architect/engine.ts`)

Institutional market maker implementing the **Avellaneda-Stoikov (2008)** optimal quoting model.

**Core Features:**
- Optimal bid/ask spread calculation: `spread = γ * σ² * T + 2/κ * ln(1 + γ/κ)`
- Inventory risk management with dynamic skew
- Reservation price adjustment: `r = S - q * γ * σ² * (T-t)`
- Volatility-adjusted quoting
- Adverse selection protection with toxicity scoring
- Queue position optimization
- Circuit breakers for drawdown protection

**Configuration Parameters:**
```typescript
{
  gamma: 0.1,              // Risk aversion parameter
  kappa: 1.5,              // Order book intensity
  maxInventory: 1000,      // Maximum position size
  inventorySkewFactor: 0.1, // Inventory adjustment sensitivity
  toxicityThreshold: 0.7,   // Adverse selection threshold
  maxDrawdownPercent: 5     // Circuit breaker trigger
}
```

**Key Classes:**
- `ArchitectBot` - Main market making engine
- `AvellanedaStoikovModel` - Optimal spread calculation
- `InventoryManager` - Position and risk tracking
- `VolatilityEstimator` - Realized and Parkinson volatility
- `AdverseSelectionDetector` - Toxicity scoring
- `CircuitBreaker` - Risk limits enforcement

**Academic Reference:**
> Avellaneda, M., & Stoikov, S. (2008). High-frequency trading in a limit order book. Quantitative Finance, 8(3), 217-224.

---

## 2. Arbitrage Bots

### 2.1 Orion Bot (`/src/lib/bots/orion/engine.ts`)

Cash-and-carry arbitrage bot capturing risk-free returns from basis between spot and futures markets.

**Arbitrage Types Supported:**
- `CASH_AND_CARRY` - Buy spot, sell futures (contango)
- `REVERSE_CASH_AND_CARRY` - Sell spot, buy futures (backwardation)
- `FUNDING_ARB` - Funding rate arbitrage
- `BASIS_ARB` - Pure basis trading

**Key Features:**
- Real-time basis monitoring across exchanges
- Annualized return calculation: `(1 + dailyReturn)^365 - 1`
- Funding rate optimization
- Exit timing based on basis convergence
- Stop loss on basis reversal

**Configuration:**
```typescript
{
  minBasisPercent: 0.5,      // Minimum 0.5% basis
  minFundingRate: 0.001,     // Minimum 0.1% funding
  maxExpiryDays: 90,         // Max days to expiry
  targetReturnPercent: 15,   // Target 15% annualized
  stopLossPercent: 1.0       // Stop loss on basis reversal
}
```

### 2.2 WolfBot Arbitrage (`/src/lib/wolfbot/arbitrage.ts`)

Cross-exchange triangular arbitrage engine.

**Features:**
- Multi-exchange price monitoring
- Triangular arbitrage path finding
- Fee-adjusted profit calculation
- Execution simulation with slippage modeling

**Supported Exchanges:**
- Binance, Bybit, OKX, Bitget, BingX, KuCoin, Coinbase, Kraken

---

## 3. Trend-Following / Momentum

### Kron Bot (`/src/lib/bots/kron/engine.ts`)

Multi-indicator trend following system without ML black boxes.

**Technical Indicators:**
- Moving Averages: SMA(20, 50, 200), EMA(12, 26)
- ADX (Average Directional Index) for trend strength
- Donchian Channels for breakout detection
- Parabolic SAR for trailing stops
- ATR for volatility-based position sizing

**Signal Generation:**
```typescript
// Trend direction determined by:
// 1. Price relative to MAs (SMA20, SMA50)
// 2. MA alignment (SMA20 > SMA50 > SMA200)
// 3. DI indicators (+DI vs -DI)
// 4. ADX threshold (>25 = trending)

// Entry signals:
// - Uptrend + ADX >= 25 + Price > SMA20 + Price > PSAR + Breakout
// - Downtrend + ADX >= 25 + Price < SMA20 + Price < PSAR + Breakdown
```

**Configuration:**
```typescript
{
  adxThreshold: 25,           // Minimum ADX for trending
  donchianPeriod: 20,         // Breakout channel period
  psarStep: 0.02,             // Parabolic SAR acceleration
  breakoutConfirmations: 2,   // Confirmations required
  pyramidEnabled: false       // Position pyramiding
}
```

---

## 4. Mean Reversion

### Equilibrist Bot (`/src/lib/bots/equilibrist/engine.ts`)

Statistical mean reversion system using classical technical analysis.

**Reversion Signals:**
1. **Bollinger Bands** - Price at band extremes
2. **RSI** - Overbought (>70) / Oversold (<30)
3. **Z-Score** - Statistical deviation from mean
4. **Half-Life** - Ornstein-Uhlenbeck estimation

**Signal Conditions:**
```typescript
// Oversold (Buy Signal):
// zScore < -2.0 && RSI < 30 && %B < 0.1

// Overbought (Sell Signal):
// zScore > 2.0 && RSI > 70 && %B > 0.9

// Half-life validation:
// Must be between minHalfLife and maxHalfLife
```

**Volatility Regimes:**
- `LOW` - vol < 0.15
- `NORMAL` - 0.15 <= vol < 0.35
- `HIGH` - 0.35 <= vol < 0.60
- `EXTREME` - vol >= 0.60

---

## 5. Statistical / Quantitative

### 5.1 Reed Bot (`/src/lib/bots/reed/engine.ts`)

Cointegration-based statistical arbitrage with rigorous statistical testing.

**Statistical Methods:**
1. **Engle-Granger ADF Test** - Augmented Dickey-Fuller for stationarity
2. **Johansen Test** - Multiple cointegrating vectors
3. **Hedge Ratio Calculation:**
   - OLS (Ordinary Least Squares)
   - TLS (Total Least Squares)
   - Kalman Filter (dynamic)
4. **Hurst Exponent** - Mean reversion detection (H < 0.5)
5. **Variance Ratio Test** - Random walk hypothesis

**Spread Analysis:**
```typescript
// Spread construction:
spread = price1 - hedgeRatio * price2 - intercept

// Z-score calculation:
zScore = (spread - mean) / stdDev

// Entry signals:
zScore > 2.0  -> SHORT_SPREAD (spread too high)
zScore < -2.0 -> LONG_SPREAD (spread too low)

// Exit signals:
abs(zScore) < 0.5 -> CLOSE
```

**Position Sizing:**
- Kelly Criterion with fraction cap
- Volatility scaling to target 2% vol
- Maximum position size limits

### 5.2 Spectrum Bot (`/src/lib/bots/spectrum/engine.ts`)

Correlation-based pairs trading without ML components.

**Features:**
- Rolling correlation analysis
- Dynamic hedge ratio (OLS)
- Spread z-score triggers
- Correlation regime detection
- Multi-pair portfolio optimization

---

## 6. Execution Algorithms

### 6.1 Lumis Bot (`/src/lib/bots/lumis/engine.ts`)

Institutional execution algorithms for minimizing market impact.

**Algorithms Implemented:**

#### VWAP (Volume Weighted Average Price)
- Distributes order according to historical volume profile
- Calculates expected VWAP benchmark
- Slippage measurement in basis points

#### TWAP (Time Weighted Average Price)
- Even distribution over time intervals
- Randomization of timing (±20%)
- Multiple interval slicing

#### POV (Percentage of Volume)
- Participation rate targeting (default 10%)
- Adaptive rate based on urgency
- Maximum rate cap (20%)

#### Iceberg Orders
- Display only portion of total order (default 10%)
- Randomized slice sizes
- Detection of iceberg orders in market

#### Almgren-Chriss Optimal Execution
- Market impact modeling (Linear, Square Root, Almgren-Chriss)
- Optimal trajectory calculation
- Risk aversion parameterization

**Market Impact Models:**
```typescript
// Square Root Law:
impact = σ * sqrt(Q/V)

// Almgren-Chriss:
temporaryImpact = ε * σ * (Q/V)^(2/3) * T^(-1/3)
permanentImpact = γ * σ * (Q/V)
```

### 6.2 HFT Engine (`/src/lib/hft-bot/engine.ts`)

High-frequency trading engine with 10-layer signal confirmation.

**Confirmation Layers:**

| Layer | Name | Weight | Purpose |
|-------|------|--------|---------|
| 1 | Order Flow | 1.5 | Imbalance and trade intensity |
| 2 | Liquidity | 1.3 | Depth availability |
| 3 | Spread | 1.2 | Transaction cost |
| 4 | Market Regime | 1.4 | Trend alignment |
| 5 | Market Quality | 1.6 | Clean conditions |
| 6 | Whale Activity | 1.1 | Large trader alignment |
| 7 | Manipulation Check | 2.0 | Spoofing/iceberg detection |
| 8 | Volatility | 1.0 | Optimal range |
| 9 | Session Timing | 0.8 | Liquidity sessions |
| 10 | Risk/Reward | 1.5 | R:R ratio validation |

**Microstructure Analysis:**
- Effective spread calculation
- Order flow imbalance
- Trade intensity monitoring
- Iceberg order detection
- Spoofing detection
- Wash trading detection

---

## 7. Signal Processing & Copy Trading

### Signal Bot (`/src/lib/signal-bot/engine.ts`)

Multi-source signal aggregation with position escort.

**Signal Sources:**
- `TRADINGVIEW` - TradingView alerts
- `TELEGRAM` - Telegram channel signals
- `API` - External API signals
- `MANUAL` - Manual entry
- `COPY_TRADING` - Copy trading positions

**Position Escort Features:**
1. **Trailing Stop** - Activates after X% profit
2. **Break-Even** - Moves SL to entry after Y% profit
3. **Partial Take Profit** - Multiple TP levels
4. **Source Reputation Tracking** - Win rate per source

**Escort Modes:**
```typescript
CONSERVATIVE: { trailingActivation: 0.5%, trailingDistance: 0.3%, breakEvenTrigger: 0.5% }
MODERATE:     { trailingActivation: 1.0%, trailingDistance: 0.5%, breakEvenTrigger: 1.0% }
AGGRESSIVE:   { trailingActivation: 1.5%, trailingDistance: 0.8%, breakEvenTrigger: 1.5% }
```

---

## 8. Grid & DCA Strategies

### Grid Bot (`/src/lib/grid-bot/`)

**Components:**
- `adaptive-grid.ts` - Volatility-adaptive grid spacing
- `trailing-grid.ts` - Dynamic grid movement
- `profit-tracker.ts` - Realized profit tracking

### DCA Bot (`/src/lib/dca-bot/`)

**Components:**
- `safety-orders.ts` - Martingale-style position scaling
- `tp-per-level.ts` - Take profit at each DCA level
- `risk-manager.ts` - Position sizing and circuit breakers

---

## Configuration Best Practices

### Risk Management

All bots implement consistent risk controls:

1. **Position Sizing:**
   - Maximum risk per trade (default 2%)
   - Kelly Criterion optimization
   - Volatility-adjusted sizing

2. **Circuit Breakers:**
   - Maximum drawdown limits
   - Daily trade limits
   - Rate limiting

3. **Stop Loss:**
   - ATR-based stops
   - Percentage stops
   - Statistical stops (z-score)

### Latency Optimization

| Bot Type | Target Latency | Requirements |
|----------|---------------|--------------|
| HFT | <10ms | Colocation, direct market access |
| Market Making | <100ms | Low-latency infrastructure |
| Execution | Variable | Depends on order size |
| Statistical | <1s | Standard API access |

---

## File Structure

```
/src/lib/
├── bots/
│   ├── architect/     # Market Maker
│   │   └── engine.ts
│   ├── orion/         # Cash-and-Carry Arbitrage
│   │   └── engine.ts
│   ├── reed/          # Statistical Arbitrage
│   │   └── engine.ts
│   ├── spectrum/      # Pairs Trading
│   │   └── engine.ts
│   ├── lumis/         # Execution Algorithms
│   │   └── engine.ts
│   ├── kron/          # Trend Following
│   │   └── engine.ts
│   └── equilibrist/    # Mean Reversion
│       └── engine.ts
├── hft-bot/           # High-Frequency Trading
│   └── engine.ts
├── signal-bot/        # Signal Processing
│   └── engine.ts
├── vision-bot/        # Market Forecasting
│   ├── index.ts
│   ├── forecast-service.ts
│   └── feature-engineer.ts
├── argus-bot/         # Order Flow Analysis
│   ├── index.ts
│   ├── orderbook-analyzer.ts
│   ├── whale-tracker.ts
│   └── circuit-breaker.ts
├── grid-bot/          # Grid Trading
│   ├── index.ts
│   ├── adaptive-grid.ts
│   └── trailing-grid.ts
├── dca-bot/           # Dollar Cost Averaging
│   ├── index.ts
│   ├── safety-orders.ts
│   └── risk-manager.ts
├── bb-bot/            # Bollinger Bands
│   ├── index.ts
│   └── mtf-confirmation.ts
└── wolfbot/           # Technical Analysis & Arbitrage
    ├── index.ts
    ├── arbitrage.ts
    ├── indicators.ts
    ├── candlestick-patterns.ts
    └── trendlines.ts
```

---

## Academic References

1. **Market Making:**
   - Avellaneda, M., & Stoikov, S. (2008). High-frequency trading in a limit order book.

2. **Statistical Arbitrage:**
   - Engle, R. F., & Granger, C. W. (1987). Co-integration and error correction.
   - Johansen, S. (1988). Statistical analysis of cointegration vectors.

3. **Execution Algorithms:**
   - Almgren, R., & Chriss, N. (2001). Optimal execution of portfolio transactions.
   - Kissell, R. (2013). The Science of Algorithmic Trading and Portfolio Management.

4. **Mean Reversion:**
   - Ornstein, L. S., & Uhlenbeck, G. E. (1930). On the theory of Brownian motion.

---

## Conclusion

CITARION's bot ecosystem provides **complete coverage** of all major institutional trading strategies:

| Category | Status | Bot(s) |
|----------|--------|--------|
| Market Makers | ✅ Complete | Architect |
| Arbitrage | ✅ Complete | Orion, WolfBot Arb |
| Trend-Following | ✅ Complete | Kron |
| Mean Reversion | ✅ Complete | Oracle |
| Statistical Arb | ✅ Complete | Reed |
| Pair/Correlation | ✅ Complete | Spectrum |
| Execution Algorithms | ✅ Complete | Lumis, HFT |
| Signal Processing | ✅ Complete | Signal Bot |

All bots are implemented with institutional-grade risk management, real-time monitoring, and comprehensive configuration options.
