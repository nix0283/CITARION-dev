# mlfinlab Integration Module

## Overview

This module implements key concepts from **"Advances in Financial Machine Learning"** by Marcos Lopez de Prado. It provides sophisticated machine learning tools specifically designed for financial data.

## Installation

The module is located at `/src/lib/mlfinlab/` and is already integrated into CITARION.

## Key Components

### 1. Triple-Barrier Labeling

The triple-barrier method generates labels based on which barrier is touched first:
- **Profit Taking Barrier**: Horizontal barrier above entry price
- **Stop Loss Barrier**: Horizontal barrier below entry price  
- **Time Out Barrier**: Vertical barrier at maximum holding period

```typescript
import { applyTripleBarrier } from '@/lib/mlfinlab';

const labels = applyTripleBarrier(candles, {
  profitTakingBarrier: 0.02,  // 2% profit target
  stopLossBarrier: 0.01,       // 1% stop loss
  maxHoldingPeriod: 20,        // 20 bars max
  volatilityAdjusted: true,    // Adjust barriers by ATR
});
```

### 2. Meta-Labeling

Meta-labeling improves signal quality by using a secondary model to filter false positives.

```typescript
import { applyMetaLabeling } from '@/lib/mlfinlab';

const result = applyMetaLabeling({
  primaryPredictions: signals,
  actualReturns: returns,
  tripleBarrierLabels: labels,
  probabilityThreshold: 0.6,
});

// Result includes:
// - metaPrecision: Precision after meta-labeling
// - precisionImprovement: Improvement over primary model
// - signalsUsed: Number of signals kept
// - signalsFiltered: Number of signals filtered out
```

### 3. Fractional Differentiation

Finds the minimum differencing order that achieves stationarity while preserving maximum memory.

```typescript
import { fractionalDifferentiation, findOptimalD } from '@/lib/mlfinlab';

// Apply specific d
const result = fractionalDifferentiation(prices, { d: 0.5 });

// Find optimal d automatically
const optimal = findOptimalD(prices, 0.9); // Target 90% memory preservation
```

### 4. Bet Sizing

Multiple methods for optimal position sizing:

```typescript
import { calculateBetSize } from '@/lib/mlfinlab';

// Kelly Criterion
const kelly = calculateBetSize(probability, {
  method: 'KELLY',
  maxSize: 0.25,
  winRate: 0.55,
  winLossRatio: 1.5,
});

// Probability Weighted
const probWeighted = calculateBetSize(probability, {
  method: 'PROBABILITY_WEIGHTED',
  maxSize: 0.20,
});
```

## Integration Points

- **regime-filter.ts**: Use meta-labeling to improve regime detection accuracy
- **strategy/manager.ts**: Integrate triple-barrier with existing tactics
- **hyperopt/engine.ts**: Use fractional differentiation for feature engineering

## API Reference

| Function | Description |
|----------|-------------|
| `applyTripleBarrier()` | Generate labels using triple-barrier method |
| `applyTripleBarrierWithSide()` | Apply with direction filter |
| `applyMetaLabeling()` | Improve signal quality with meta-labeling |
| `fractionalDifferentiation()` | Apply fractional differencing |
| `findOptimalD()` | Find optimal differencing order |
| `calculateBetSize()` | Calculate optimal position size |
| `generateFinancialFeatures()` | Generate ML-ready features |

## References

- López de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley.
- [mlfinlab Python Library](https://github.com/hudson-and-thames/mlfinlab)
