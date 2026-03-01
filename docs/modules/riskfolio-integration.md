# Riskfolio-Lib Integration Module

## Overview

Portfolio optimization library with advanced methods that go beyond simple mean-variance optimization. Implements methods from modern quantitative finance research.

## Installation

The module is located at `/src/lib/riskfolio/` and is already integrated into CITARION.

## Key Features

- **Hierarchical Risk Parity (HRP)**: Marcos Lopez de Prado's method
- **Nested Clustering Optimization (NCO)**: Handles correlated assets
- **Black-Litterman Model**: Combines market equilibrium with investor views
- **Risk Parity**: Equal risk allocation across assets
- **Mean-Variance Optimization**: Classical Markowitz optimization

## Core Functions

### 1. Hierarchical Risk Parity (HRP)

HRP addresses the instability of mean-variance optimization when assets are highly correlated.

```typescript
import { optimizeHRP } from '@/lib/riskfolio';

const result = optimizeHRP(returns, symbols, {
  linkage: 'ward',
  distance: 'correlation',
  covEstimator: 'ledoit_wolf'
});

// Results
console.log('Weights:', result.weights.weights);
// [0.15, 0.12, 0.18, 0.10, 0.14, ...]

console.log('Expected Sharpe:', result.weights.expectedSharpe);
console.log('Diversification Ratio:', result.metrics.diversificationRatio);

// HRP-specific outputs
console.log('Cluster Order:', result.dendrogramOrder);
```

**When to use HRP:**
- Assets have high correlation
- Need robust allocation
- Avoiding corner solutions in optimization

### 2. Nested Clustering Optimization (NCO)

Combines clustering with optimization to handle highly correlated assets.

```typescript
import { optimizeNCO } from '@/lib/riskfolio';

const result = optimizeNCO(returns, symbols, {
  nClusters: 5,
  innerMethod: 'RISK_PARITY',
  covEstimator: 'ledoit_wolf'
});

// Cluster assignments
result.clusters.forEach((clusterId, symbol) => {
  console.log(`${symbol}: Cluster ${clusterId}`);
});

// Intra-cluster weights (within each cluster)
result.intraClusterWeights.forEach((weights, clusterId) => {
  console.log(`Cluster ${clusterId} weights:`, weights);
});

// Inter-cluster weights (between clusters)
console.log('Cluster weights:', result.interClusterWeights);
```

**When to use NCO:**
- Many assets with complex correlation structure
- Need to group similar assets
- Multi-level diversification

### 3. Black-Litterman Model

Combines market equilibrium returns with investor views.

```typescript
import { optimizeBlackLitterman, View } from '@/lib/riskfolio';

const views: View[] = [
  {
    type: 'ABSOLUTE',
    assets: ['BTC'],
    expectedReturn: 0.30,  // Expect 30% return
    confidence: 0.8         // 80% confidence
  },
  {
    type: 'RELATIVE',
    assets: ['ETH', 'SOL'], // ETH vs SOL
    expectedReturn: 0.05,   // ETH outperforms SOL by 5%
    confidence: 0.6
  }
];

const result = optimizeBlackLitterman(returns, symbols, {
  marketWeights: marketCapWeights,
  views: views,
  tau: 0.05,           // Confidence in prior
  riskAversion: 2.5    // Risk aversion parameter
});

// Black-Litterman specific outputs
console.log('Implied Returns:', result.impliedReturns);
console.log('Posterior Returns:', result.posteriorReturns);
console.log('Views Impact:', result.viewsImpact);
```

**When to use Black-Litterman:**
- Have specific market views
- Want to incorporate analyst forecasts
- Blend market equilibrium with predictions

### 4. Risk Parity

Allocates risk equally across assets.

```typescript
import { optimizeRiskParity } from '@/lib/riskfolio';

const result = optimizeRiskParity(returns, symbols, {
  riskMeasure: 'VARIANCE'
});

// Risk contributions
console.log('Risk Contributions:', result.riskContributions);
// Each asset contributes equal risk

// Marginal risk
console.log('Marginal Risk:', result.marginalRiskContributions);
```

**When to use Risk Parity:**
- Want equal risk allocation
- No return forecasts available
- Building diversified portfolios

### 5. Mean-Variance Optimization

Classical Markowitz optimization.

```typescript
import { optimizeMeanVariance } from '@/lib/riskfolio';

// Maximum Sharpe Ratio
const maxSharpe = optimizeMeanVariance(returns, symbols, {
  objective: 'MAX_SHARPE',
  maxWeight: 0.10,   // Max 10% per asset
  minWeight: 0.01,   // Min 1% per asset
});

// Minimum Variance
const minVar = optimizeMeanVariance(returns, symbols, {
  objective: 'MIN_RISK',
  longOnly: true
});
```

## Unified API

### Main Optimization Function

```typescript
import { optimizePortfolio } from '@/lib/riskfolio';

// Same function for all methods
const result = optimizePortfolio(returns, symbols, {
  method: 'HRP',           // or 'NCO', 'BLACK_LITTERMAN', 'RISK_PARITY', etc.
  maxWeight: 0.15,
  minWeight: 0.02,
});
```

## Covariance Estimation

### Ledoit-Wolf Shrinkage

Better covariance estimation for small samples:

```typescript
import { ledoitWolfShrinkage, calculateCovarianceMatrix } from '@/lib/riskfolio';

// Sample covariance (can be unstable)
const sampleCov = calculateCovarianceMatrix(returns);

// Ledoit-Wolf shrinkage (more stable)
const shrunkCov = ledoitWolfShrinkage(returns);
```

## Integration with CITARION

### Position Sizing for Trading Bots

```typescript
import { optimizeHRP, calculateCovarianceMatrix } from '@/lib/riskfolio';

// In Bot Manager
function calculatePositionSizes(positions: Position[]) {
  const symbols = positions.map(p => p.symbol);
  const returns = calculateReturns(positions);
  
  const result = optimizeHRP(returns, symbols);
  
  // Apply weights to position sizes
  positions.forEach((pos, i) => {
    pos.targetWeight = result.weights.weights[i];
  });
}
```

### Multi-Asset Portfolio Management

```typescript
import { optimizeNCO } from '@/lib/riskfolio';

// For multi-asset strategies
const portfolio = optimizeNCO(returns, symbols, {
  nClusters: Math.ceil(Math.sqrt(symbols.length)),
  innerMethod: 'RISK_PARITY'
});
```

## Method Comparison

| Method | Handles Correlation | Uses Views | Stable Weights |
|--------|---------------------|------------|----------------|
| Mean-Variance | Poor | No | Poor |
| Risk Parity | Good | No | Good |
| HRP | Excellent | No | Excellent |
| NCO | Excellent | No | Excellent |
| Black-Litterman | Good | Yes | Good |

## API Reference

| Function | Description |
|----------|-------------|
| `optimizePortfolio()` | Main optimization dispatcher |
| `optimizeHRP()` | Hierarchical Risk Parity |
| `optimizeNCO()` | Nested Clustering Optimization |
| `optimizeBlackLitterman()` | Black-Litterman model |
| `optimizeRiskParity()` | Risk Parity optimization |
| `optimizeMeanVariance()` | Mean-Variance optimization |
| `calculateCovarianceMatrix()` | Sample covariance |
| `calculateCorrelationMatrix()` | Correlation matrix |
| `calculateExpectedReturns()` | Expected returns |
| `ledoitWolfShrinkage()` | Ledoit-Wolf estimator |

## Portfolio Metrics

Each optimization returns:

```typescript
interface PortfolioMetrics {
  expectedReturn: number;      // Annualized return
  expectedVolatility: number;  // Annualized volatility
  sharpeRatio: number;         // Sharpe ratio
  diversificationRatio: number; // Diversification benefit
  effectiveN: number;          // Effective number of assets
  herfindahlIndex: number;     // Concentration measure
  concentrationRisk: number;   // Max weight
}
```

## References

- López de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley. (HRP)
- Black, F., & Litterman, R. (1992). *Global Portfolio Optimization*. Financial Analysts Journal.
- [Riskfolio-Lib Python Library](https://github.com/dcajasn/Riskfolio-Lib)
