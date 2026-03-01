# Volume Analysis Module

## Overview

**Source:** [harshgupta1810/volume_analysis_stockmarket](https://github.com/harshgupta1810/volume_analysis_stockmarket)

**Type:** Algorithmic Volume Analysis (No AI/ML)

**Language:** TypeScript (ported from Python)

The Volume Analysis module provides comprehensive tools for analyzing trading volume patterns. Volume is one of the most important indicators in technical analysis, as it confirms price movements and often provides early signals of potential reversals or trend continuations.

---

## Features

### 1. Breakouts & Reversals Detection

Identifies significant price movements accompanied by volume surges:

- **Breakouts:** Price moves above resistance level on increasing volume
- **Reversals:** Sharp price direction changes with volume confirmation

```typescript
import { analyzeBreakoutsReversals } from '@/lib/indicators/volume-analysis';

const results = analyzeBreakoutsReversals(data, 5);
// Returns: { timestamp, breakout: boolean, reversal: boolean }[]
```

### 2. Volume Divergence Analysis

Detects divergences between price and volume movements:

- **Bullish Divergence:** Price falling, volume rising → potential reversal up
- **Bearish Divergence:** Price rising, volume falling → potential reversal down

```typescript
import { calculateVolumeDivergence } from '@/lib/indicators/volume-analysis';

const divergences = calculateVolumeDivergence(data);
// Returns: { timestamp, divergence: 'bullish' | 'bearish' | 'none' }[]
```

### 3. Volume Pattern Recognition

Identifies specific volume patterns:

- **Volume Spikes:** Sudden increase in volume (>2x average)
- **Steady Volume Increase:** Gradual volume accumulation

```typescript
import { calculateVolumePatterns } from '@/lib/indicators/volume-analysis';

const patterns = calculateVolumePatterns(data, 5, 2.0);
// Returns: { timestamp, volumeChange, volumeMA, volumeSpike, volumeIncrease }[]
```

### 4. Volume Confirmation

Analyzes whether volume confirms price movements:

- **Positive Confirmation:** Price up, volume up (bullish)
- **Negative Confirmation:** Price down, volume up (bearish)

```typescript
import { analyzeVolumeConfirmation } from '@/lib/indicators/volume-analysis';

const confirmations = analyzeVolumeConfirmation(data);
// Returns: { timestamp, priceMovement, confirmation }[]
```

### 5. On-Balance Volume (OBV)

Cumulative volume indicator showing money flow direction:

```typescript
import { calculateOBV } from '@/lib/indicators/volume-analysis';

const obv = calculateOBV(data);
// Returns: { timestamp, obv }[]
```

### 6. Volume Rate of Change (VROC)

Measures the rate of change in volume over a specified period:

```typescript
import { calculateVROC } from '@/lib/indicators/volume-analysis';

const vroc = calculateVROC(data, 14);
// Returns: { timestamp, vroc }[]
```

### 7. Accumulation/Distribution Analysis

Detects institutional buying/selling pressure:

```typescript
import { analyzeAccumulationDistribution } from '@/lib/indicators/volume-analysis';

const ad = analyzeAccumulationDistribution(data);
// Returns: { timestamp, ad, signal: 'accumulation' | 'distribution' | 'neutral' }[]
```

---

## Comprehensive Analysis

The `comprehensiveVolumeAnalysis` function combines all analysis types and provides a summary:

```typescript
import { comprehensiveVolumeAnalysis } from '@/lib/indicators/volume-analysis';

const result = comprehensiveVolumeAnalysis(data, {
  lookbackPeriod: 5,
  maPeriod: 5,
  spikeThreshold: 2.0,
});

// Returns:
{
  breakoutsReversals: VolumeAnalysisResult[];
  divergences: VolumeDivergenceResult[];
  patterns: VolumePatternResult[];
  confirmations: VolumeConfirmationResult[];
  summary: {
    totalBreakouts: number;
    totalReversals: number;
    bullishDivergences: number;
    bearishDivergences: number;
    volumeSpikes: number;
    positiveConfirmations: number;
    negativeConfirmations: number;
    currentSignal: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  };
}
```

---

## API Endpoint

### POST `/api/indicators/volume-analysis`

Request body:
```json
{
  "data": [
    {
      "timestamp": 1700000000000,
      "open": 100,
      "high": 105,
      "low": 98,
      "close": 103,
      "volume": 1000000
    }
  ],
  "analysisType": "comprehensive",
  "options": {
    "lookbackPeriod": 5,
    "maPeriod": 5,
    "spikeThreshold": 2.0
  }
}
```

### Analysis Types

| Type | Description |
|------|-------------|
| `comprehensive` | Full analysis with all indicators |
| `breakouts` | Breakout and reversal detection |
| `divergence` | Volume divergence analysis |
| `patterns` | Volume pattern detection |
| `confirmation` | Volume confirmation of price |
| `obv` | On-Balance Volume |
| `vroc` | Volume Rate of Change |
| `accumulation` | Accumulation/Distribution |

---

## UI Component

```tsx
import VolumeAnalysisPanel from '@/components/indicators/volume-analysis-panel';

<VolumeAnalysisPanel
  data={ohlcvData}
  onAnalysis={(result) => console.log(result)}
/>
```

The component provides:
- Summary tab with current signal and statistics
- Breakouts tab listing detected breakouts/reversals
- Divergences tab showing bullish/bearish divergences
- Patterns tab displaying volume spikes and trends

---

## Signal Interpretation

### Bullish Signals
- Breakout above resistance on high volume
- Bullish divergence (price down, volume up)
- Positive volume confirmation
- Accumulation pattern detected

### Bearish Signals
- Bearish divergence (price up, volume down)
- Negative volume confirmation
- Distribution pattern detected
- Volume spike on selling pressure

### Confidence Calculation

Confidence is calculated based on:
- Number of recent signals (breakouts, reversals, divergences)
- Signal consistency
- Volume confirmation strength
- Pattern reliability

---

## Best Practices

1. **Use with Price Action:** Volume analysis is most effective when combined with price pattern analysis.

2. **Confirm Trends:** Volume should increase in the direction of the primary trend.

3. **Watch Divergences:** Volume divergences often precede price reversals by several periods.

4. **Monitor Spikes:** Volume spikes can indicate:
   - Panic selling (bottom potential)
   - Buying frenzy (top potential)
   - Institutional activity

5. **Timeframe Consideration:** Use multiple timeframes for confirmation.

---

## Implementation Details

### Files
- `/src/lib/indicators/volume-analysis.ts` - Core analysis logic
- `/src/app/api/indicators/volume-analysis/route.ts` - REST API endpoint
- `/src/components/indicators/volume-analysis-panel.tsx` - UI component

### Dependencies
- None (pure TypeScript implementation)

---

## Example Usage

```typescript
// Basic usage
const data = [
  { timestamp: 1700000000000, open: 100, high: 105, low: 98, close: 103, volume: 1000000 },
  { timestamp: 1700086400000, open: 103, high: 108, low: 102, close: 107, volume: 1500000 },
  // ... more candles
];

const result = comprehensiveVolumeAnalysis(data);

console.log(`Current Signal: ${result.summary.currentSignal}`);
console.log(`Confidence: ${result.summary.confidence}%`);
console.log(`Total Breakouts: ${result.summary.totalBreakouts}`);
console.log(`Volume Spikes: ${result.summary.volumeSpikes}`);
```

---

## References

- [Volume Analysis in Technical Analysis](https://www.investopedia.com/terms/v/volume.asp)
- [On-Balance Volume (OBV)](https://www.investopedia.com/terms/o/onbalancevolume.asp)
- [Volume Rate of Change](https://www.investopedia.com/terms/r/rateofchange.asp)
- [Accumulation/Distribution Line](https://www.investopedia.com/terms/a/accumulationdistribution.asp)
