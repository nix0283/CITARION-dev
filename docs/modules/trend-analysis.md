# Trend Analysis Module

## Overview

**Source:** [harshgupta1810/trend_analysis_stockmarket](https://github.com/harshgupta1810/trend_analysis_stockmarket)

**Type:** Statistical Trend Analysis (No AI/ML)

**Language:** TypeScript (ported from Python)

The Trend Analysis module uses linear regression and statistical methods to objectively determine market trends. Unlike subjective visual analysis, this approach provides quantifiable metrics including trend direction, strength, and confidence levels.

---

## Features

### 1. Linear Regression Trend Detection

Uses least-squares regression to fit a trend line through price data:

```typescript
import { linearRegression } from '@/lib/indicators/trend-analysis';

const xValues = [0, 1, 2, 3, 4]; // Time indices
const yValues = [100, 102, 105, 103, 108]; // Prices

const { slope, intercept, rSquared } = linearRegression(xValues, yValues);
```

**Output:**
- `slope`: Direction and rate of trend
- `intercept`: Starting point of trend line
- `rSquared`: Goodness of fit (0-1)

### 2. Basic Trend Analysis

Determines trend direction from price data:

```typescript
import { analyzeTrend } from '@/lib/indicators/trend-analysis';

const result = analyzeTrend(data, 20);
// Returns:
{
  timestamp: number;
  trend: 'upward' | 'downward' | 'sideways';
  strength: number;    // 0-100
  slope: number;
  rSquared: number;
  angle: number;       // In degrees
}
```

### 3. Trend History Analysis

Analyzes trends over rolling periods:

```typescript
import { analyzeTrendHistory } from '@/lib/indicators/trend-analysis';

const history = analyzeTrendHistory(data, 20, 5);
// Analyzes trends every 5 periods using 20-period windows
```

### 4. Trend Line Detection

Identifies support and resistance trend lines:

```typescript
import { identifyTrendLines } from '@/lib/indicators/trend-analysis';

const trendLines = identifyTrendLines(data, 50, 0.02);
// Returns:
{
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  slope: number;
  type: 'support' | 'resistance';
  touches: number;
  strength: number;
}[]
```

### 5. Reversal Detection

Identifies potential trend reversals:

```typescript
import { detectTrendReversal } from '@/lib/indicators/trend-analysis';

const { warning, probability, reason } = detectTrendReversal(trendHistory);
// Returns:
{
  warning: boolean;
  probability: number; // 0-100
  reason: string;
}
```

**Reversal Indicators:**
- Multiple trend direction changes
- Declining trend strength
- R-squared deterioration
- Slope sign reversal

### 6. Multi-Timeframe Analysis

Analyzes trends across multiple periods:

```typescript
import { multiTimeframeTrendAnalysis } from '@/lib/indicators/trend-analysis';

const result = multiTimeframeTrendAnalysis(data, [10, 20, 50, 100]);
// Returns:
{
  timeframe: number;
  trend: 'upward' | 'downward' | 'sideways';
  strength: number;
  alignment: 'bullish' | 'bearish' | 'mixed';
}
```

---

## Comprehensive Analysis

```typescript
import { comprehensiveTrendAnalysis } from '@/lib/indicators/trend-analysis';

const result = comprehensiveTrendAnalysis(data, {
  period: 20,
  step: 5,
  trendLineLookback: 50,
  touchThreshold: 0.02,
});

// Returns:
{
  primaryTrend: 'upward' | 'downward' | 'sideways';
  trendStrength: number;        // 0-100
  slope: number;
  angle: number;                // In degrees
  rSquared: number;
  trendLines: TrendLine[];
  trendHistory: TrendAnalysisResult[];
  reversalWarning: boolean;
  reversalProbability: number;
  currentSignal: {
    signal: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
  };
  confidence: number;
}
```

---

## API Endpoint

### POST `/api/indicators/trend-analysis`

Request body:
```json
{
  "data": [
    {
      "timestamp": 1700000000000,
      "open": 100,
      "high": 105,
      "low": 98,
      "close": 103
    }
  ],
  "analysisType": "comprehensive",
  "options": {
    "period": 20,
    "step": 5,
    "trendLineLookback": 50,
    "touchThreshold": 0.02,
    "timeframes": [10, 20, 50, 100]
  }
}
```

### Analysis Types

| Type | Description |
|------|-------------|
| `comprehensive` | Full trend analysis with all components |
| `basic` | Basic trend determination |
| `history` | Trend analysis over rolling periods |
| `trendlines` | Support and resistance trend line detection |
| `reversal` | Trend reversal detection |
| `multi-timeframe` | Multi-timeframe trend analysis |
| `regression` | Raw linear regression calculation |

---

## UI Component

```tsx
import TrendAnalysisPanel from '@/components/indicators/trend-analysis-panel';

<TrendAnalysisPanel
  data={ohlcvData}
  onAnalysis={(result) => console.log(result)}
/>
```

The component provides:
- **Summary tab:** Current signal, trend direction, strength bar
- **Statistics tab:** Slope, angle, R-squared, reversal probability
- **Trend Lines tab:** Identified support and resistance lines
- **History tab:** Trend changes over time

---

## Statistical Interpretation

### Slope

| Slope Value | Interpretation |
|-------------|----------------|
| `slope > 0` | Upward trend (bullish) |
| `slope < 0` | Downward trend (bearish) |
| `slope ≈ 0` | Sideways/ranging market |

**Normalized Slope:** Slope is normalized by price range and period for comparison across different assets.

### R-Squared (Coefficient of Determination)

| R² Range | Fit Quality | Trend Reliability |
|----------|-------------|-------------------|
| 0.7 - 1.0 | Strong | High confidence in trend |
| 0.4 - 0.7 | Moderate | Trend exists but watch for changes |
| 0.0 - 0.4 | Weak | No clear trend, ranging market |

### Angle

| Angle | Trend Strength |
|-------|----------------|
| > 45° | Very strong momentum |
| 30° - 45° | Strong momentum |
| 15° - 30° | Moderate momentum |
| < 15° | Weak momentum |

---

## Signal Generation

### Buy Signals
- Strong upward trend (strength > 60%)
- High R-squared (> 0.6)
- No reversal warning

### Sell Signals
- Strong downward trend (strength > 60%)
- High R-squared (> 0.6)
- No reversal warning (or downward accelerating)

### Hold Signals
- Sideways market
- Low confidence trend
- Reversal warning active

---

## Trend Line Detection

The algorithm identifies trend lines by:

1. Finding local extremes (peaks for resistance, troughs for support)
2. Connecting extremes with similar slopes
3. Counting "touches" (price near trend line)
4. Scoring by number of touches and consistency

**Minimum Requirements:**
- At least 3 touches for a valid trend line
- Price deviation < touchThreshold (default 2%)

---

## Reversal Detection

The algorithm monitors for reversal signals:

1. **Trend Instability:** Multiple trend direction changes
2. **Strength Decline:** Decreasing trend strength over time
3. **R-squared Deterioration:** Declining fit quality
4. **Slope Reversal:** Slope changing sign

**Probability Calculation:**
```
probability = (trendChanges × 15) + (weakeningCount × 10) + (rSquaredDecline × 20) + (slopeSignChange × 25)
```

---

## Best Practices

### 1. Period Selection
- **Short-term (10-20):** Day trading, swing trading
- **Medium-term (20-50):** Position trading
- **Long-term (50-200):** Investment decisions

### 2. Multi-Timeframe Confirmation
Always check that shorter timeframes align with longer-term trends for higher probability trades.

### 3. Combine with Volume
Trend signals are more reliable when confirmed by volume analysis.

### 4. Watch R-Squared
A declining R-squared often precedes trend changes, providing early warning.

### 5. Respect Trend Lines
Use identified trend lines for:
- Entry/exit points
- Stop-loss placement
- Risk management

---

## Implementation Details

### Files
- `/src/lib/indicators/trend-analysis.ts` - Core analysis logic
- `/src/app/api/indicators/trend-analysis/route.ts` - REST API endpoint
- `/src/components/indicators/trend-analysis-panel.tsx` - UI component

### Dependencies
- None (pure TypeScript implementation)

---

## Example Usage

```typescript
// Comprehensive analysis
const data = [
  { timestamp: 1700000000000, open: 100, high: 105, low: 98, close: 103 },
  { timestamp: 1700086400000, open: 103, high: 108, low: 102, close: 107 },
  // ... more candles
];

const result = comprehensiveTrendAnalysis(data);

console.log(`Primary Trend: ${result.primaryTrend}`);
console.log(`Trend Strength: ${result.trendStrength.toFixed(0)}%`);
console.log(`Slope: ${(result.slope * 100).toFixed(4)}%`);
console.log(`R²: ${(result.rSquared * 100).toFixed(1)}%`);
console.log(`Angle: ${result.angle.toFixed(2)}°`);
console.log(`Reversal Warning: ${result.reversalWarning}`);
console.log(`Current Signal: ${result.currentSignal.signal}`);
console.log(`Confidence: ${result.confidence.toFixed(0)}%`);

// Check trend lines
result.trendLines.forEach(tl => {
  console.log(`${tl.type}: ${tl.touches} touches, strength ${tl.strength.toFixed(0)}%`);
});
```

---

## Mathematical Foundation

### Linear Regression

The least-squares regression line minimizes the sum of squared residuals:

```
slope = Σ((xi - x̄)(yi - ȳ)) / Σ(xi - x̄)²
intercept = ȳ - slope × x̄
```

### R-Squared

Measures how well the regression line fits the data:

```
R² = 1 - (SS_res / SS_tot)
```

Where:
- `SS_res` = Sum of squared residuals
- `SS_tot` = Total sum of squares

---

## References

- [Linear Regression - Wikipedia](https://en.wikipedia.org/wiki/Linear_regression)
- [Trend Analysis - Investopedia](https://www.investopedia.com/terms/t/trendanalysis.asp)
- [Coefficient of Determination](https://en.wikipedia.org/wiki/Coefficient_of_determination)
- [Support and Resistance](https://www.investopedia.com/terms/s/support.asp)
