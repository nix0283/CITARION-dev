# QuantConnect-Inspired Modules

## Overview

This documentation covers three major modules inspired by QuantConnect LEAN Algorithm Framework:

1. **Portfolio Optimization** - Modern portfolio theory implementation
2. **Risk Management** - Comprehensive risk monitoring and control
3. **Algorithm Framework** - Modular trading algorithm architecture

These modules bring institutional-grade quantitative finance tools to CITARION, all implemented in pure TypeScript without AI/ML dependencies.

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ALGORITHM FRAMEWORK                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Universe        │ → │ Alpha           │ → │ Portfolio       │   │
│  │ Selection       │   │ Models          │   │ Construction    │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│          │                     │                     │              │
│          ▼                     ▼                     ▼              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Risk            │ ← │ Execution       │ ← │ Portfolio       │   │
│  │ Management      │   │ Models          │   │ Optimization    │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Portfolio Optimization Module

**Source:** Inspired by QuantConnect LEAN Portfolio Construction

**Location:** `/src/lib/portfolio/optimization.ts`

### Optimization Methods

#### Equal Weight Portfolio
Simplest approach - equal allocation to all assets.

```typescript
import { equalWeightPortfolio } from '@/lib/portfolio/optimization';

const symbols = ['BTC', 'ETH', 'SOL', 'AVAX'];
const result = equalWeightPortfolio(symbols);
// Each asset gets 25% weight
```

#### Minimum Variance Portfolio
Finds the portfolio with lowest possible variance.

```typescript
import { minimumVariancePortfolio, calculateCovarianceMatrix } from '@/lib/portfolio/optimization';

const returnsData = new Map([
  ['BTC', [0.01, -0.02, 0.03, ...]],
  ['ETH', [0.02, -0.01, 0.04, ...]],
]);

const covMatrix = calculateCovarianceMatrix(returnsData);
const result = minimumVariancePortfolio(covMatrix, { riskFreeRate: 0.02 });
```

#### Maximum Sharpe Ratio (Tangency Portfolio)
Finds the portfolio with highest risk-adjusted return.

```typescript
import { maximumSharpePortfolio, calculateExpectedReturns } from '@/lib/portfolio/optimization';

const expectedReturns = calculateExpectedReturns(returnsData);
const result = maximumSharpePortfolio(covMatrix, expectedReturns, {
  riskFreeRate: 0.02,
});
```

#### Risk Parity Portfolio
Each asset contributes equally to portfolio risk.

```typescript
import { riskParityPortfolio } from '@/lib/portfolio/optimization';

const result = riskParityPortfolio(covMatrix);
// Assets weighted by inverse volatility
```

#### Mean-Variance Optimization (Markowitz)
Classic mean-variance optimization for a target return.

```typescript
import { meanVarianceOptimization } from '@/lib/portfolio/optimization';

const result = meanVarianceOptimization(covMatrix, expectedReturns, {
  riskFreeRate: 0.02,
  targetReturn: 0.15, // 15% annual target
});
```

#### Black-Litterman Model
Combines market equilibrium with investor views.

```typescript
import { blackLittermanPortfolio } from '@/lib/portfolio/optimization';

const result = blackLittermanPortfolio(covMatrix, {
  riskFreeRate: 0.02,
  marketWeights: { 'BTC': 0.5, 'ETH': 0.3, 'SOL': 0.2 },
  investorViews: [
    {
      assets: ['BTC'],
      weights: [1],
      expectedReturn: 0.20, // Expect 20% return
      confidence: 0.7,
    },
  ],
  tau: 0.025,
});
```

### Efficient Frontier

Calculate the entire efficient frontier:

```typescript
import { calculateEfficientFrontier } from '@/lib/portfolio/optimization';

const frontier = calculateEfficientFrontier(covMatrix, expectedReturns, {
  riskFreeRate: 0.02,
}, 20); // 20 points on the frontier

// Returns array of { expectedReturn, volatility, sharpeRatio, weights }
```

### Comprehensive Optimization

Run all methods at once:

```typescript
import { comprehensiveOptimization } from '@/lib/portfolio/optimization';

const result = comprehensiveOptimization(returnsData, {
  riskFreeRate: 0.02,
});

console.log(result.portfolios.maximumSharpe.weights);
console.log(result.efficientFrontier);
```

---

## 2. Risk Management Module

**Source:** Inspired by QuantConnect LEAN Risk Management

**Location:** `/src/lib/risk/management.ts`

### Default Risk Limits

```typescript
import { DEFAULT_RISK_LIMITS } from '@/lib/risk/management';

// {
//   maxDrawdown: 0.20,        // 20% max drawdown
//   maxDailyLoss: 0.05,       // 5% max daily loss
//   maxPositionSize: 0.10,    // 10% max single position
//   maxSectorExposure: 0.30,  // 30% max sector exposure
//   maxLeverage: 2.0,         // 2x max leverage
//   maxVaR95: 0.05,           // 5% max VaR
//   ...
// }
```

### Drawdown Analysis

```typescript
import { calculateDrawdown, checkDrawdownLimits } from '@/lib/risk/management';

const portfolioValues = [100000, 98000, 95000, 97000, 92000];
const drawdown = calculateDrawdown(portfolioValues);

// {
//   current: 0.08,   // 8% current drawdown
//   max: 0.12,       // 12% max drawdown
//   avg: 0.05,       // 5% average drawdown
//   duration: 3,     // 3 periods in drawdown
// }

const actions = checkDrawdownLimits(portfolio, DEFAULT_RISK_LIMITS);
// Returns array of RiskAction if limits breached
```

### Position Sizing

#### Kelly Criterion

```typescript
import { kellyPositionSize } from '@/lib/risk/management';

const size = kellyPositionSize(
  0.55,    // 55% win rate
  0.02,    // 2% average win
  0.015,   // 1.5% average loss
  100000,  // $100k portfolio
  0.25     // Max 25% Kelly (fractional Kelly)
);

// size.percentOfPortfolio = optimal allocation %
```

#### Volatility-Based Sizing

```typescript
import { volatilityPositionSize } from '@/lib/risk/management';

const size = volatilityPositionSize(
  0.15,     // 15% target volatility
  0.30,     // 30% asset volatility
  100000,   // Portfolio value
  0.20      // Max 20% position
);
```

#### ATR-Based Sizing

```typescript
import { atrPositionSize } from '@/lib/risk/management';

const size = atrPositionSize(
  100000,   // Portfolio value
  500,      // ATR value
  50000,    // Current price
  0.02,     // 2% risk per trade
  2         // Stop loss at 2x ATR
);
```

### Stop Loss Management

```typescript
import { calculateStopLoss, checkStopLosses } from '@/lib/risk/management';

const stops = calculateStopLoss(position, {
  fixedPercent: 0.05,      // 5% fixed stop
  trailingPercent: 0.10,   // 10% trailing stop
  atr: 500,                // ATR value
  atrMultiplier: 2,        // 2x ATR stop
  supportLevel: 48000,     // Support-based stop
});

// Check if any stops triggered
const actions = checkStopLosses(positions, stopOptions);
```

### VaR and CVaR

```typescript
import { calculateVaR, calculateCVaR } from '@/lib/risk/management';

const var95 = calculateVaR(
  100000,    // Portfolio value
  0.20,      // 20% annual volatility
  0.10,      // 10% expected return
  0.95,      // 95% confidence
  1          // 1-day horizon
);

const cvar95 = calculateCVaR(100000, 0.20, 0.10, 0.95);
```

### Comprehensive Risk Check

```typescript
import { comprehensiveRiskCheck } from '@/lib/risk/management';

const result = comprehensiveRiskCheck(
  portfolio,
  historicalValues,
  returns,
  {
    limits: { maxDrawdown: 0.15 },
    volatilities: new Map([['BTC', 0.6], ['ETH', 0.7]]),
  }
);

console.log(result.riskScore);   // 0-100 risk score
console.log(result.status);      // 'safe' | 'warning' | 'danger' | 'critical'
console.log(result.actions);     // Array of recommended actions
console.log(result.metrics);     // Full risk metrics
```

---

## 3. Algorithm Framework

**Source:** Inspired by QuantConnect LEAN Algorithm Framework

**Location:** `/src/lib/algorithm-framework/core.ts`

### Framework Components

The framework separates trading logic into 5 modular components:

```
┌──────────────────────────────────────────────────────────────────┐
│  1. Universe Selection  →  Select assets to trade               │
│  2. Alpha Model         →  Generate trading signals             │
│  3. Portfolio Construction → Determine position sizes           │
│  4. Risk Management     →  Apply risk controls                  │
│  5. Execution Model     →  Execute trades efficiently           │
└──────────────────────────────────────────────────────────────────┘
```

### Creating an Algorithm

```typescript
import {
  AlgorithmFramework,
  ManualUniverseSelectionModel,
  RsiAlphaModel,
  ConfidenceWeightedPortfolioConstruction,
  MaxPositionSizeRiskManagement,
  LimitOrderExecutionModel,
} from '@/lib/algorithm-framework/core';

const algorithm = new AlgorithmFramework({
  // 1. Universe Selection
  universeSelection: new ManualUniverseSelectionModel([
    { ticker: 'BTCUSDT', exchange: 'binance', assetClass: 'crypto' },
    { ticker: 'ETHUSDT', exchange: 'binance', assetClass: 'crypto' },
  ]),

  // 2. Alpha Model
  alphaModel: new RsiAlphaModel({
    period: 14,
    oversoldThreshold: 30,
    overboughtThreshold: 70,
  }),

  // 3. Portfolio Construction
  portfolioConstruction: new ConfidenceWeightedPortfolioConstruction(
    10,    // Max 10 positions
    0.3    // Minimum 30% confidence
  ),

  // 4. Risk Management
  riskManagement: new MaxPositionSizeRiskManagement(0.10), // 10% max position

  // 5. Execution
  executionModel: new LimitOrderExecutionModel(0.001), // 0.1% limit offset
});

// Run algorithm step
const orders = await algorithm.step(context);
```

### Universe Selection Models

```typescript
// Manual - Fixed list of symbols
new ManualUniverseSelectionModel(symbols);

// Dynamic - Select based on criteria
new DynamicUniverseSelectionModel({
  minVolume: 1000000,
  maxAssets: 20,
  assetClasses: ['crypto'],
});

// Scheduled - Rebalance at intervals
new ScheduledUniverseSelectionModel(baseModel, 86400000); // Daily
```

### Alpha Models

```typescript
// RSI-based signals
new RsiAlphaModel({
  period: 14,
  oversoldThreshold: 30,
  overboughtThreshold: 70,
});

// MACD-based signals
new MacdAlphaModel({
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
});

// Composite - Combine multiple models
new CompositeAlphaModel([
  new RsiAlphaModel(),
  new MacdAlphaModel(),
]);
```

### Portfolio Construction Models

```typescript
// Equal weight
new EqualWeightPortfolioConstruction(10); // Max 10 positions

// Confidence-weighted
new ConfidenceWeightedPortfolioConstruction(10, 0.3);

// Mean-Variance optimized
new MeanVariancePortfolioConstruction(2.5); // Risk aversion
```

### Risk Management Models

```typescript
// Maximum position size
new MaxPositionSizeRiskManagement(0.10); // 10% max

// Maximum drawdown
new MaxDrawdownRiskManagement(0.20, 0.5); // 20% max, reduce by 50%

// Composite - Multiple risk models
new CompositeRiskManagement([
  new MaxPositionSizeRiskManagement(0.10),
  new MaxDrawdownRiskManagement(0.20, 0.5),
]);
```

### Execution Models

```typescript
// Immediate market execution
new ImmediateExecutionModel();

// Limit order execution
new LimitOrderExecutionModel(0.001); // 0.1% better than current

// TWAP execution
new TwapExecutionModel(5, 60000); // 5 slices, 1 min apart
```

### Preset Configurations

```typescript
import { createConservativeFramework, createAggressiveFramework } from '@/lib/algorithm-framework/core';

// Conservative: Lower risk, fewer positions, tighter limits
const conservative = createConservativeFramework();

// Aggressive: Higher risk tolerance, more positions
const aggressive = createAggressiveFramework();
```

---

## API Endpoints

### Portfolio Optimization API

**POST `/api/portfolio/optimization`**

Request:
```json
{
  "returnsData": {
    "BTC": [0.01, -0.02, 0.03, ...],
    "ETH": [0.02, -0.01, 0.04, ...]
  },
  "method": "maximum_sharpe",
  "config": {
    "riskFreeRate": 0.02,
    "minWeight": 0,
    "maxWeight": 1
  }
}
```

### Risk Management API

**POST `/api/risk/management`**

Request:
```json
{
  "analysisType": "comprehensive",
  "data": {
    "portfolio": { ... },
    "historicalValues": [100000, 98000, ...]
  },
  "config": {
    "limits": {
      "maxDrawdown": 0.15
    }
  }
}
```

---

## UI Components

### PortfolioOptimizationPanel

```tsx
import PortfolioOptimizationPanel from '@/components/indicators/portfolio-optimization-panel';

<PortfolioOptimizationPanel
  returnsData={returnsMap}
  onOptimize={(result) => console.log(result)}
/>
```

### RiskManagementPanel

```tsx
import RiskManagementPanel from '@/components/indicators/risk-management-panel';

<RiskManagementPanel
  portfolio={portfolioData}
  historicalValues={valueHistory}
  returns={returnHistory}
  onRiskCheck={(result) => console.log(result)}
/>
```

---

## Integration Examples

### Complete Trading System

```typescript
// 1. Get market data
const marketData = await fetchMarketData(symbols);

// 2. Calculate returns
const returnsData = calculateReturnsFromPrices(marketData);

// 3. Optimize portfolio
const optimization = comprehensiveOptimization(returnsData);

// 4. Check risk
const riskCheck = comprehensiveRiskCheck(
  portfolio,
  historicalValues,
  returns
);

// 5. Execute if risk is acceptable
if (riskCheck.status !== 'critical') {
  const orders = await algorithm.step(context);
  await executeOrders(orders);
}
```

---

## References

- [QuantConnect Documentation](https://www.quantconnect.com/docs)
- [LEAN Algorithm Framework](https://www.quantconnect.com/docs/v2/writing-algorithms/algorithm-framework)
- [Modern Portfolio Theory](https://en.wikipedia.org/wiki/Modern_portfolio_theory)
- [Black-Litterman Model](https://www.investopedia.com/terms/b/black-litterman_model.asp)
- [Risk Parity](https://www.investopedia.com/terms/r/risk-parity.asp)
- [Value at Risk](https://www.investopedia.com/terms/v/var.asp)
