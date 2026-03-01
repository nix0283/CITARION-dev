# Candlestick Pattern Recognition Library

> **Source**: Ported from [ruejo2013/Machine-Learning-Candlestick-Recognition-Trading-Strategy-](https://github.com/ruejo2013/Machine-Learning-Candlestick-Recognition-Trading-Strategy-)
> **Original Author**: Patrick R (ruejo2013) - Columbia University FinTech BootCamp

## Overview

This library provides automatic recognition of 10 classic candlestick patterns for algorithmic trading. All patterns are implemented in TypeScript and can be used for real-time pattern detection and trading signal generation.

## Supported Patterns

| Code | Pattern Name | Type | Candles | Reliability |
|------|-------------|------|---------|-------------|
| `MRNSTR` | Morning Star | Bullish | 3 | High |
| `EVNSTR` | Evening Star | Bearish | 3 | High |
| `BLLKCK` | Bull Kicker | Bullish | 2 | High |
| `BERKCK` | Bear Kicker | Bearish | 2 | High |
| `BLLHRM` | Bullish Harami | Bullish | 2 | Medium |
| `BERHRM` | Bearish Harami | Bearish | 2 | Medium |
| `GRNHM` | Green Hammer | Bullish | 1 | Medium |
| `RDHM` | Red Hammer | Bullish | 1 | Medium |
| `GRNSSTR` | Green Shooting Star | Bearish | 1 | Medium |
| `RDSSTR` | Red Shooting Star | Bearish | 1 | Medium |

## Installation & Import

```typescript
import {
  scanPatterns,
  detectPattern,
  CANDLESTICK_PATTERNS,
  type OHLCVCandle,
  type PatternResult,
} from '@/lib/indicators/candlestick-patterns';
```

## Usage Examples

### 1. Scan All Candles for Patterns

```typescript
const candles: OHLCVCandle[] = [
  { time: 1640000000, open: 100, high: 105, low: 98, close: 103 },
  { time: 1640000060, open: 103, high: 108, low: 102, close: 106 },
  // ... more candles
];

// Scan all candles
const patterns = scanPatterns(candles);

console.log(`Found ${patterns.length} patterns:`);
patterns.forEach(p => {
  console.log(`${p.pattern.name} at ${p.price} (${p.pattern.type})`);
});
```

### 2. Detect Pattern at Specific Index

```typescript
const patternCode = detectPattern(candles, 100);

if (patternCode) {
  const pattern = CANDLESTICK_PATTERNS[patternCode];
  console.log(`Pattern detected: ${pattern.name}`);
  console.log(`Description: ${pattern.description}`);
}
```

### 3. Get Pattern Statistics

```typescript
import { getPatternStatistics } from '@/lib/indicators/candlestick-patterns';

const stats = getPatternStatistics(patterns);
// { BLLHRM: 12, BERHRM: 8, MRNSTR: 3, ... }
```

### 4. Filter by Type

```typescript
import { filterByType } from '@/lib/indicators/candlestick-patterns';

const bullishPatterns = filterByType(patterns, 'bullish');
const bearishPatterns = filterByType(patterns, 'bearish');
```

### 5. Generate Trading Signals

```typescript
import { generateSignal, getLatestSignal } from '@/lib/indicators/candlestick-patterns';

// Generate signal from specific pattern
const signal = generateSignal(patterns[0]);
// { type: 'buy' | 'sell' | 'hold', strength: 'strong' | 'moderate' | 'weak', ... }

// Get latest signal
const latestSignal = getLatestSignal(patterns);
```

## API Endpoint

### POST `/api/indicators/candlestick-patterns`

**Scan candles for patterns:**
```json
{
  "candles": [
    { "time": 1640000000, "open": 100, "high": 105, "low": 98, "close": 103 }
  ],
  "action": "scan"
}
```

**Detect pattern at index:**
```json
{
  "candles": [...],
  "action": "detect",
  "index": 100
}
```

**Get statistics:**
```json
{
  "candles": [...],
  "action": "stats"
}
```

### GET `/api/indicators/candlestick-patterns`

Returns available patterns and their metadata.

## Pattern Detection Details

### Morning Star (MRNSTR)
- **Type**: Bullish reversal
- **Candles**: 3
- **Conditions**:
  1. First candle: large red body
  2. Second candle: small body (doji-like), below first candle
  3. Third candle: large green body that engulfs first candle's open
  4. Second candle body < 1/3 of first and third candle bodies

### Evening Star (EVNSTR)
- **Type**: Bearish reversal
- **Candles**: 3
- **Conditions**:
  1. First candle: large green body
  2. Second candle: small body (doji-like), above first candle
  3. Third candle: large red body that engulfs first candle's open
  4. Second candle body < 1/3 of first and third candle bodies

### Bullish Harami (BLLHRM)
- **Type**: Bullish reversal
- **Candles**: 2
- **Conditions**:
  1. Previous candle is red (bearish)
  2. Current candle is green (bullish)
  3. Current candle opens higher than previous close
  4. Current candle closes lower than previous open
  5. Appears in downtrend

### Bearish Harami (BERHRM)
- **Type**: Bearish reversal
- **Candles**: 2
- **Conditions**:
  1. Previous candle is green (bullish)
  2. Current candle is red (bearish)
  3. Previous close higher than current open
  4. Current close higher than previous open
  5. Appears in uptrend

### Green Hammer (GRNHM)
- **Type**: Bullish reversal
- **Candles**: 1
- **Conditions**:
  1. Lower shadow at least twice as long as body
  2. Upper shadow shorter than 1/10 of body
  3. Candle is green (close > open)
  4. Appears in downtrend

### Red Hammer (RDHM)
- **Type**: Bullish reversal
- **Candles**: 1
- **Conditions**:
  1. Lower shadow at least twice as long as body
  2. Upper shadow shorter than 1/10 of body
  3. Candle is red (open > close)
  4. Appears in downtrend

### Bull Kicker (BLLKCK)
- **Type**: Bullish continuation/reversal
- **Candles**: 2
- **Conditions**:
  1. Two candles open at the same level (within 0.2% tolerance)
  2. Previous candle is red
  3. Current candle is green
  4. Current low > previous open (gap up)

### Bear Kicker (BERKCK)
- **Type**: Bearish continuation/reversal
- **Candles**: 2
- **Conditions**:
  1. Two candles open at the same level (within 0.2% tolerance)
  2. Previous candle is green
  3. Current candle is red
  4. Previous open > current high (gap down)

### Shooting Star (GRNSSTR/RDSSTR)
- **Type**: Bearish reversal
- **Candles**: 1
- **Conditions**:
  1. Upper shadow at least twice as long as body
  2. Lower shadow shorter than 1/10 of body
  3. Appears in uptrend

## Trend Detection

The library uses a simple 3-period SMA to determine trend direction:
- **Uptrend**: Current SMA > Previous SMA
- **Downtrend**: Current SMA < Previous SMA

Trend is used as a filter for certain patterns (Harami, Hammer, Shooting Star).

## UI Component

```tsx
import { CandlestickPatternPanel } from '@/components/indicators/candlestick-pattern-panel';

<CandlestickPatternPanel
  candles={ohlcvData}
  onPatternSelect={(pattern) => {
    console.log('Selected:', pattern);
  }}
  maxHeight={400}
/>
```

## Integration with Trading Strategies

### Example: Use with Strategy Bot

```typescript
// In strategy execution
const patterns = scanPatterns(recentCandles);
const lastPattern = patterns[patterns.length - 1];

if (lastPattern) {
  const signal = generateSignal(lastPattern);
  
  if (signal.type === 'buy' && signal.strength === 'strong') {
    // Execute buy order
    await executeBuy(symbol, quantity);
  } else if (signal.type === 'sell' && signal.strength === 'strong') {
    // Execute sell order
    await executeSell(symbol, quantity);
  }
}
```

### Example: Combined with ML

```typescript
// Use patterns as features for ML model
const features = patterns.map(p => ({
  patternCode: p.pattern.code,
  confidence: p.confidence,
  priceChange: p.price,
  type: p.pattern.type === 'bullish' ? 1 : -1,
}));

// Feed to ML model for prediction
const prediction = await mlModel.predict(features);
```

## Performance Notes

- Pattern detection is O(n) where n is the number of candles
- Most patterns require only 1-3 previous candles
- Real-time detection adds minimal latency (~1ms per 1000 candles)

## Limitations

1. **Class Imbalance**: Patterns are rare (~10% of candles)
2. **False Positives**: Some patterns may trigger incorrectly in volatile markets
3. **Context Dependent**: Patterns work best when combined with other indicators

## References

- Original Python implementation: [ruejo2013/candlestick-recognition](https://github.com/ruejo2013/Machine-Learning-Candlestick-Recognition-Trading-Strategy-)
- Reference study: [aliisoli/candlesticks_study](https://github.com/aliisoli/candlesticks_study)
- Columbia University FinTech BootCamp Project 2

## Changelog

### 2026-02-23
- Initial TypeScript port from Python
- Added 10 pattern detection functions
- Created API endpoint `/api/indicators/candlestick-patterns`
- Added UI component `CandlestickPatternPanel`
- Integrated with builtin indicators registry
