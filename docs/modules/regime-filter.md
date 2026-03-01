# Regime Filter Module

## Overview

The Regime Filter Module provides comprehensive market regime detection using ADX (Average Directional Index) and TNI (Trend Normalization Index). It integrates with the existing Ichimoku system to filter trading signals based on market conditions.

## Key Components

### 1. ADX (Average Directional Index)

ADX measures trend strength regardless of direction. Values range from 0 to 100:

| ADX Value | Trend Strength |
|-----------|---------------|
| 0-20      | None/Weak (ranging market) |
| 20-25     | Developing trend |
| 25-50     | Strong trend |
| 50-75     | Very strong trend |
| 75-100    | Extremely strong trend (rare) |

#### Components:
- **ADX Line**: The main trend strength indicator
- **+DI (Positive Directional Indicator)**: Bullish pressure
- **-DI (Negative Directional Indicator)**: Bearish pressure

#### Usage:
```typescript
import { calculateADX } from '@/lib/indicators/regime-filter';

const result = calculateADX(candles, {
  adxPeriod: 14,
  adxStrongTrend: 25,
  adxWeakTrend: 20,
});

// Result contains:
// - adx: number[] - ADX line values
// - plusDI: number[] - +DI values
// - minusDI: number[] - -DI values
// - trendStrength: 'none' | 'weak' | 'moderate' | 'strong' | 'very_strong'
```

### 2. TNI (Trend Normalization Index)

TNI normalizes price movement relative to volatility, providing a consistent measure of trend direction across different assets.

#### Formula:
```
TNI = ((Price - SMA) / ATR) * ScaleFactor
```

Values range from -100 to +100:

| TNI Value | Trend Direction |
|-----------|----------------|
| +30 to +100 | Strong bullish |
| +15 to +30 | Moderate bullish |
| -15 to +15 | Neutral/transitional |
| -30 to -15 | Moderate bearish |
| -100 to -30 | Strong bearish |

#### Usage:
```typescript
import { calculateTNI } from '@/lib/indicators/regime-filter';

const result = calculateTNI(candles, {
  tniPeriod: 14,
  tniSmoothing: 5,
});

// Result contains:
// - tni: number[] - Raw TNI values
// - tniSmoothed: number[] - Smoothed TNI (EMA)
// - trendDirection: 'bullish' | 'bearish' | 'neutral' | 'transitional'
// - normalization: number[] - ATR normalization factors
```

### 3. Market Regime Detection

Combines ADX and TNI to classify market state:

| Regime | Description | Trading Implication |
|--------|-------------|---------------------|
| `trending_up` | Strong uptrend | Favor long positions |
| `trending_down` | Strong downtrend | Favor short positions |
| `ranging` | Sideways market | Range-bound strategies |
| `volatile` | High volatility | Reduce position sizes |
| `transitional` | Regime change in progress | Wait for confirmation |

#### Usage:
```typescript
import { detectRegime, calculateADX, calculateTNI } from '@/lib/indicators/regime-filter';

const adxResult = calculateADX(candles);
const tniResult = calculateTNI(candles);

const regime = detectRegime(candles, adxResult, tniResult);

// Result contains:
// - regime: MarketRegime
// - confidence: number (0-100)
// - trendStrength: TrendStrength
// - trendDirection: TrendDirection
// - regimeStability: number (0-100)
// - regimeDuration: number (bars in current regime)
// - expectedDuration: number (expected regime duration)
// - transitionProbability: number (probability of change)
```

### 4. Signal Filtering

The regime filter can validate trading signals:

```typescript
import { applyRegimeFilter } from '@/lib/indicators/regime-filter';

const filterResult = applyRegimeFilter(
  candles,
  'long', // or 'short'
  config,
  ichimokuData // optional Ichimoku confirmation
);

// Result contains:
// - adx: ADXResult
// - tni: TNIResult
// - regime: RegimeAnalysis
// - filterScore: number (0-100)
// - passFilter: boolean
// - filterReason: string (detailed explanation)
```

### 5. Ichimoku Integration

The module integrates with the existing Ichimoku indicator for enhanced signal confirmation:

```typescript
import { calculateIchimokuConfirmation } from '@/lib/indicators/regime-filter';

const ichimokuData = {
  tenkan: 50500,
  kijun: 50000,
  senkouA: 49800,
  senkouB: 49500,
  chikou: 51000,
};

const confirmation = calculateIchimokuConfirmation(candles, ichimokuData);

// Result contains:
// - score: number (0-100)
// - bullish: boolean
// - details: string[] (list of confirmation factors)
```

## API Endpoint

### POST `/api/indicators/regime-filter`

#### Analysis Types:

1. **comprehensive** (default)
```json
{
  "analysisType": "comprehensive",
  "candles": [
    { "time": 1640000000, "open": 50000, "high": 51000, "low": 49500, "close": 50500 }
  ],
  "config": {
    "adxPeriod": 14,
    "tniPeriod": 14
  }
}
```

2. **adx** - ADX-only analysis
3. **tni** - TNI-only analysis
4. **filter** - Apply filter to trading signal
```json
{
  "analysisType": "filter",
  "candles": [...],
  "signalDirection": "long",
  "ichimokuData": {
    "tenkan": 50500,
    "kijun": 50000,
    "senkouA": 49800,
    "senkouB": 49500,
    "chikou": 51000
  }
}
```

5. **ichimoku_confirm** - Ichimoku confirmation score

## Configuration

```typescript
interface RegimeFilterConfig {
  // ADX Parameters
  adxPeriod: number;          // Default: 14
  adxSmoothingPeriod: number; // Default: 14
  adxStrongTrend: number;     // Default: 25
  adxWeakTrend: number;       // Default: 20

  // TNI Parameters
  tniPeriod: number;          // Default: 14
  tniSmoothing: number;       // Default: 5

  // Regime Detection
  regimeLookback: number;     // Default: 50
  volatilityFactor: number;   // Default: 1.5

  // Integration Weights
  ichimokuWeight: number;     // Default: 0.3
  adxWeight: number;          // Default: 0.4
  tniWeight: number;          // Default: 0.3
}
```

## Trading Strategy Integration

### Entry Signal Filtering

```typescript
// Before entering a long position
const filterResult = applyRegimeFilter(candles, 'long', config, ichimokuData);

if (filterResult.passFilter) {
  // Signal passes regime filter
  if (filterResult.regime.regime === 'trending_up') {
    // Strong uptrend - full position size
    enterLong(fullSize);
  } else if (filterResult.regime.regime === 'transitional') {
    // Transitional - reduced position size
    enterLong(reducedSize);
  }
} else {
  // Signal blocked - log reason
  console.log(filterResult.filterReason);
}
```

### Regime-Based Strategy Selection

```typescript
const analysis = comprehensiveRegimeAnalysis(candles);

switch (analysis.regime.regime) {
  case 'trending_up':
  case 'trending_down':
    // Use trend-following strategies
    useTrendStrategy();
    break;

  case 'ranging':
    // Use mean-reversion strategies
    useRangeStrategy();
    break;

  case 'volatile':
    // Reduce risk, use wider stops
    reducePositionSize();
    widenStopLoss();
    break;

  case 'transitional':
    // Wait for regime confirmation
    waitForConfirmation();
    break;
}
```

## UI Component

The `RegimeFilterPanel` component provides a comprehensive visualization:

```tsx
import { RegimeFilterPanel } from '@/components/indicators/regime-filter-panel';

<RegimeFilterPanel
  data={regimeData}
  loading={isLoading}
/>
```

### Features:
- **Summary Tab**: Overview of regime, ADX, TNI, and filter status
- **ADX Tab**: Detailed ADX analysis with DI comparison
- **TNI Tab**: TNI gauge and direction indicator
- **Regime Tab**: Regime classification with stability metrics

## Mathematical Formulas

### ADX Calculation

1. **True Range (TR)**:
```
TR = max(High - Low, |High - PrevClose|, |Low - PrevClose|)
```

2. **Directional Movement (DM)**:
```
+DM = High - PrevHigh (if High - PrevHigh > Low - PrevLow and > 0)
-DM = PrevLow - Low (if PrevLow - Low > High - PrevHigh and > 0)
```

3. **Smoothed Values** (Wilder's Smoothing):
```
SmoothedTR = PrevSmoothedTR - (PrevSmoothedTR / Period) + TR
Smoothed+DM = PrevSmoothed+DM - (PrevSmoothed+DM / Period) + +DM
Smoothed-DM = PrevSmoothed-DM - (PrevSmoothed-DM / Period) + -DM
```

4. **Directional Indicators**:
```
+DI = (Smoothed+DM / SmoothedTR) * 100
-DI = (Smoothed-DM / SmoothedTR) * 100
```

5. **Directional Index (DX)**:
```
DX = (|+DI - -DI| / (+DI + -DI)) * 100
```

6. **ADX**:
```
ADX = Smoothed(DX)
```

### TNI Calculation

1. **Simple Moving Average**:
```
SMA = Sum(Close, Period) / Period
```

2. **Average True Range**:
```
ATR = Smoothed(TR)
```

3. **TNI**:
```
TNI = ((Close - SMA) / ATR) * 25
```

Normalized to -100 to +100 range.

## Best Practices

1. **Minimum Data**: Use at least 50 candles for reliable regime detection
2. **Confirmation**: Combine with Ichimoku for higher confidence signals
3. **Regime Stability**: Prefer signals when regime stability > 60%
4. **Filter Score**: Consider filterScore > 60 as good quality signals
5. **Transition Periods**: Avoid trading during high transitionProbability periods

## Related Modules

- **Ichimoku** (`/src/lib/indicators/ichimoku.ts`): Cloud indicator integration
- **Trend Analysis** (`/src/lib/indicators/trend-analysis.ts`): Linear regression analysis
- **Dow Theory** (`/src/lib/indicators/dow-theory.ts`): Classical trend analysis
- **Volume Analysis** (`/src/lib/indicators/volume-analysis.ts`): Volume-based confirmation

## References

- Wilder, J. Welles (1978). "New Concepts in Technical Trading Systems"
- ADX explanation: https://www.investopedia.com/terms/a/adx.asp
- Directional Movement System original paper by Wells Wilder
