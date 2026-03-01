# Dow Theory Analysis Module

## Overview

**Source:** [harshgupta1810/DowTheory_in_stockmarket](https://github.com/harshgupta1810/DowTheory_in_stockmarket)

**Type:** Classic Technical Analysis Framework (No AI/ML)

**Language:** TypeScript (ported from Python)

Dow Theory is one of the oldest and most respected frameworks in technical analysis, developed by Charles Dow in the late 19th century. This module implements the core principles of Dow Theory for modern algorithmic trading.

---

## Core Principles of Dow Theory

### 1. The Market Discounts Everything
All known information is reflected in prices. This principle underlies all technical analysis.

### 2. Three Types of Trends
- **Primary Trend:** Major market movement lasting 1+ years (bull or bear market)
- **Secondary Trend:** Corrections within primary trend, lasting weeks to months
- **Minor Trends:** Day-to-day fluctuations, generally considered noise

### 3. Three Phases of Primary Trends
- **Accumulation:** Smart money enters positions (early stage)
- **Public Participation:** Trend becomes obvious, public enters (middle stage)
- **Distribution:** Smart money exits positions (late stage)

### 4. Averages Must Confirm
Market indices should move in the same direction to confirm trends.

### 5. Volume Confirms Trend
Volume should increase in the direction of the primary trend.

### 6. Trend Persists Until Reversal
A trend remains in effect until clear reversal signals appear.

---

## Features

### 1. Peak and Trough Identification

Identifies market structure by detecting peaks (local highs) and troughs (local lows):

```typescript
import { identifyPeaksTroughs } from '@/lib/indicators/dow-theory';

const peaksTroughs = identifyPeaksTroughs(data, 3);
// Returns: { timestamp, type: 'peak' | 'trough', price, index }[]
```

### 2. Primary Trend Determination

Analyzes peak/trough sequences to determine market direction:

- **Bullish:** Higher peaks AND higher troughs
- **Bearish:** Lower peaks AND lower troughs
- **Neutral:** Mixed or unclear pattern

```typescript
import { determinePrimaryTrend } from '@/lib/indicators/dow-theory';

const { trend, strength } = determinePrimaryTrend(peaksTroughs);
// Returns: { trend: 'bullish' | 'bearish' | 'neutral', strength: number }
```

### 3. Secondary Trend Analysis

Identifies corrections within the primary trend:

- **Correction:** Price move against bull market (pullback)
- **Rally:** Price move against bear market (rebound)

```typescript
import { identifySecondaryTrend } from '@/lib/indicators/dow-theory';

const secondaryTrend = identifySecondaryTrend(data, primaryTrend, 50);
// Returns: { trend: 'correction' | 'rally' | 'none', strength: number }
```

### 4. Trend Phase Detection

Identifies the current phase of the market cycle:

```typescript
import { identifyTrendPhase } from '@/lib/indicators/dow-theory';

const phase = identifyTrendPhase(data, peaksTroughs, primaryTrend);
// Returns: 'accumulation' | 'participation' | 'distribution' | 'unknown'
```

### 5. Signal Generation

Generates buy/sell signals based on Dow Theory:

```typescript
import { generateDowSignals } from '@/lib/indicators/dow-theory';

const signals = generateDowSignals(data, peaksTroughs, primaryTrend);
// Returns: { timestamp, signal: 'buy' | 'sell' | 'hold', strength, reason, price }[]
```

**Buy Signals:**
- Higher trough formed in bull market
- Breaking above previous peak

**Sell Signals:**
- Lower peak formed in bear market
- Breaking below previous trough

### 6. Volume Confirmation

Checks if volume supports the current trend:

```typescript
import { checkVolumeConfirmation } from '@/lib/indicators/dow-theory';

const { confirmed, strength } = checkVolumeConfirmation(data, primaryTrend, 10);
// Returns: { confirmed: boolean, strength: number }
```

---

## Comprehensive Analysis

```typescript
import { analyzeDowTheory } from '@/lib/indicators/dow-theory';

const result = analyzeDowTheory(data, indexData, {
  smaPeriod: 50,
  peakTroughLookback: 3,
  volumeLookback: 10,
});

// Returns:
{
  primaryTrend: 'bullish' | 'bearish' | 'neutral';
  secondaryTrend: 'correction' | 'rally' | 'none';
  trendPhase: 'accumulation' | 'participation' | 'distribution' | 'unknown';
  peaksTroughs: PeakTrough[];
  trendPhases: TrendPhase[];
  signals: DowTheorySignal[];
  volumeConfirmation: boolean;
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

### POST `/api/indicators/dow-theory`

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
  "indexData": [],
  "analysisType": "comprehensive",
  "options": {
    "smaPeriod": 50,
    "peakTroughLookback": 3,
    "volumeLookback": 10
  }
}
```

### Analysis Types

| Type | Description |
|------|-------------|
| `comprehensive` | Full Dow Theory analysis |
| `peaks-troughs` | Peak and trough identification |
| `primary-trend` | Primary trend determination |
| `secondary-trend` | Secondary trend analysis |
| `trend-phase` | Trend phase detection |
| `signals` | Trading signal generation |
| `volume-confirm` | Volume confirmation check |

---

## UI Component

```tsx
import DowTheoryPanel from '@/components/indicators/dow-theory-panel';

<DowTheoryPanel
  data={ohlcvData}
  indexData={indexData}
  onAnalysis={(result) => console.log(result)}
/>
```

The component provides:
- **Summary tab:** Current signal, primary/secondary trends, trend phase
- **Trends tab:** Historical trend phases over time
- **Peaks/Troughs tab:** Identified market structure
- **Signals tab:** Generated trading signals with reasons

---

## Trading Rules Based on Dow Theory

### Bull Market Rules
1. Buy when price breaks above previous peak
2. Hold during secondary corrections
3. Sell when lower trough forms

### Bear Market Rules
1. Sell/short when price breaks below previous trough
2. Cover shorts during secondary rallies
3. Re-enter shorts when rally fails

### Signal Strength Levels
- **Strong:** Multiple confirming factors (peaks, troughs, volume)
- **Moderate:** Single confirmation factor
- **Weak:** Minimal confirmation, use caution

---

## Signal Interpretation

### Peak/Trough Patterns

| Pattern | Implication |
|---------|-------------|
| Higher High + Higher Low | Bullish continuation |
| Lower High + Lower Low | Bearish continuation |
| Higher High + Lower Low | Potential distribution |
| Lower High + Higher Low | Potential accumulation |

### Trend Phases

| Phase | Characteristics | Trading Action |
|-------|-----------------|----------------|
| Accumulation | Low volume, tight range | Begin building positions |
| Participation | High volume, strong trend | Hold/add to positions |
| Distribution | Declining volume, price plateau | Take profits, reduce exposure |

---

## Best Practices

1. **Use Multiple Confirmations:** Wait for both price structure and volume confirmation.

2. **Consider the Big Picture:** Primary trend provides context for all other analysis.

3. **Be Patient:** Dow Theory is designed for longer-term trends, not day trading.

4. **Watch for Divergences:** When price and volume disagree, caution is warranted.

5. **Use Index Confirmation:** Compare individual stock trends with market indices.

---

## Implementation Details

### Files
- `/src/lib/indicators/dow-theory.ts` - Core analysis logic
- `/src/app/api/indicators/dow-theory/route.ts` - REST API endpoint
- `/src/components/indicators/dow-theory-panel.tsx` - UI component

### Dependencies
- None (pure TypeScript implementation)

---

## Example Usage

```typescript
const data = [
  { timestamp: 1700000000000, open: 100, high: 105, low: 98, close: 103, volume: 1000000 },
  // ... more candles
];

const result = analyzeDowTheory(data);

console.log(`Primary Trend: ${result.primaryTrend}`);
console.log(`Trend Phase: ${result.trendPhase}`);
console.log(`Volume Confirmed: ${result.volumeConfirmation}`);
console.log(`Current Signal: ${result.currentSignal.signal}`);
console.log(`Confidence: ${result.confidence}%`);

// Check recent signals
result.signals.slice(-5).forEach(signal => {
  console.log(`${signal.signal.toUpperCase()} at ${signal.price}: ${signal.reason}`);
});
```

---

## Historical Context

Dow Theory was developed by Charles Dow (1851-1902), co-founder of Dow Jones & Company and first editor of The Wall Street Journal. While originally designed for stock market analysis, its principles apply to all freely traded markets including cryptocurrencies.

---

## References

- [Dow Theory - Investopedia](https://www.investopedia.com/terms/d/dowtheory.asp)
- [The Dow Theory by Robert Rhea](https://www.amazon.com/Dow-Theory-Robert-Rhea/dp/0870340007)
- [Technical Analysis of the Financial Markets](https://www.investopedia.com/terms/t/technical-analysis.asp)
